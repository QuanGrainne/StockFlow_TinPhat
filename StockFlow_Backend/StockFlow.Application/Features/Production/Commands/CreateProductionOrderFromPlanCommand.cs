using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-PP-05: lập lệnh sản xuất từ kế hoạch Đã duyệt (mở rộng UC-59, không thay thế lập lệnh trực tiếp — Q4).
/// - Toàn bộ hoặc một phần số còn lại; lập nhiều lần từ cùng một dòng (BR-PP-19).
/// - Không vượt số còn lại (BR-PP-20, Q7: chặn). Các request đồng thời trên cùng kế hoạch chạy tuần tự
///   nhờ khóa theo kế hoạch, số đã lập được đọc lại sau khi có khóa.
/// - Lệnh tạo ra giống hệt lệnh lập trực tiếp (Chưa bắt đầu, nhu cầu NVL chụp từ BOM, BR-31) và mang production_plan_id.
/// - Không sửa lệnh đã lập trước đó, không đổi trạng thái kế hoạch (tiến độ là số tính ra).
/// Hạn hoàn thành bỏ trống thì lấy ngày kết thúc muộn nhất của các dòng kế hoạch được chọn.
/// </summary>
public record CreateProductionOrderFromPlanCommand(int ProductionPlanId, SaveProductionOrderRequest Request)
    : IRequest<Result<ProductionOrderDetailDto>>;

public class CreateProductionOrderFromPlanCommandValidator : AbstractValidator<CreateProductionOrderFromPlanCommand>
{
    public CreateProductionOrderFromPlanCommandValidator()
    {
        RuleFor(x => x.Request)
            .Must(r => (r.Items is { Count: > 0 }) || (r.ProductId > 0 && r.PlannedQuantity > 0))
            .WithMessage("Vui lòng chọn ít nhất một thành phẩm và nhập số lượng kế hoạch lớn hơn 0.");
        RuleFor(x => x.Request.Workshop).MaximumLength(200).WithMessage("Tên xưởng tối đa 200 ký tự.");
        RuleFor(x => x.Request.Notes).MaximumLength(500).WithMessage("Ghi chú tối đa 500 ký tự.");
        RuleFor(x => x.Request.ClientRequestId)
            .MaximumLength(ProductionPlanRules.ClientRequestIdMaxLength).WithMessage("Mã yêu cầu tối đa 64 ký tự.");
    }
}

public class CreateProductionOrderFromPlanCommandHandler
    : IRequestHandler<CreateProductionOrderFromPlanCommand, Result<ProductionOrderDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IUserPermissionService _permissions;
    private readonly ITransactionCodeGenerator _codeGenerator;

    public CreateProductionOrderFromPlanCommandHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser, IUserPermissionService permissions,
        ITransactionCodeGenerator codeGenerator)
    {
        _context = context;
        _currentUser = currentUser;
        _permissions = permissions;
        _codeGenerator = codeGenerator;
    }

    public async Task<Result<ProductionOrderDetailDto>> Handle(CreateProductionOrderFromPlanCommand command, CancellationToken ct)
    {
        var req = command.Request;
        if (_currentUser.UserId is not int userId)
            return Result.Failure<ProductionOrderDetailDto>("Không xác định được người dùng đăng nhập.");

        var items = ProductionOrderRules.NormalizeItems(req);
        if (items.Select(i => i.ProductId).Distinct().Count() != items.Count)
            return Result.Failure<ProductionOrderDetailDto>("Mỗi thành phẩm chỉ được chọn một dòng trong cùng một lệnh sản xuất.");

        await using var tx = await _context.BeginTransactionAsync(ct);
        await _context.AcquireTransactionLockAsync(ProductionPlanRules.LockKey(command.ProductionPlanId), ct);

        var plan = await _context.TrxProductionPlans.AsNoTracking()
            .Include(p => p.DtlProductionPlanItems)
            .FirstOrDefaultAsync(p => p.ProductionPlanId == command.ProductionPlanId, ct);
        if (plan == null) return Result.Failure<ProductionOrderDetailDto>(ProductionPlanMessages.PlanNotFound);

        // Q-V6: cùng mã yêu cầu đã tạo lệnh (bấm lặp / gửi lại) → trả lại đúng lệnh đó, không tạo lệnh mới.
        // Đang giữ khóa theo kế hoạch nên request lặp chạy sau request đầu và thấy lệnh đã lưu.
        var clientRequestId = string.IsNullOrWhiteSpace(req.ClientRequestId) ? null : req.ClientRequestId.Trim();
        if (clientRequestId != null)
        {
            var existing = await _context.TrxProductionOrders.AsNoTracking()
                .Where(o => o.ClientRequestId == clientRequestId)
                .Select(o => new { o.ProductionOrderId, o.ProductionPlanId })
                .FirstOrDefaultAsync(ct);
            if (existing != null)
            {
                if (existing.ProductionPlanId != plan.ProductionPlanId)
                    return Result.Failure<ProductionOrderDetailDto>("Mã yêu cầu đã được dùng cho lệnh sản xuất khác.");
                await tx.CommitAsync(ct);
                var replay = await ProductionReader.OrderDetailAsync(_context, _currentUser, existing.ProductionOrderId, null, ct);
                return Result.Success(replay!);
            }
        }

        var user = await ProductionPlanPermissions.LoadAsync(_permissions, userId, ct);
        var permissionError = ProductionPlanPermissions.CheckCreateOrder(plan, user);
        if (permissionError != null) return Result.Failure<ProductionOrderDetailDto>(permissionError);

        var quantities = items.ToDictionary(i => i.ProductId, i => i.PlannedQuantity);
        var quantityError = await ProductionPlanRules.ValidateOrderQuantitiesAsync(
            _context, plan.ProductionPlanId, quantities, null, ct);
        if (quantityError != null) return Result.Failure<ProductionOrderDetailDto>(quantityError);

        var deadline = req.Deadline?.Date
            ?? plan.DtlProductionPlanItems
                .Where(i => quantities.ContainsKey(i.ProductId))
                .Max(i => i.PlannedEndDate)
                .ToDateTime(TimeOnly.MinValue);
        var deadlineError = ProductionOrderRules.ValidateDeadline(deadline);
        if (deadlineError != null) return Result.Failure<ProductionOrderDetailDto>(deadlineError);

        var now = VietnamTime.Now;
        var code = await ProductionHelper.NextCodeAsync(_context, _codeGenerator, "PRODUCTION_ORDER",
            (c, token) => _context.TrxProductionOrders.AnyAsync(o => o.ProductionOrderCode == c, token), ct);

        var order = new TrxProductionOrder
        {
            ProductionOrderCode = code,
            ProductionPlanId = plan.ProductionPlanId,
            ClientRequestId = clientRequestId,
            ActualQuantity = 0,
            Status = ProductionOrderStatus.NotStarted,
            CreatedBy = userId,
            StartDate = now,
            EndDate = deadline,
            Workshop = string.IsNullOrWhiteSpace(req.Workshop) ? null : req.Workshop.Trim(),
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
        };

        var populateError = await ProductionOrderRules.PopulateItemsAndRequirementsAsync(_context, order, req, userId, now, ct);
        if (populateError != null) return Result.Failure<ProductionOrderDetailDto>(populateError);

        _context.TrxProductionOrders.Add(order);

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var detail = await ProductionReader.OrderDetailAsync(_context, _currentUser, order.ProductionOrderId, null, ct);
        return Result.Success(detail!);
    }
}
