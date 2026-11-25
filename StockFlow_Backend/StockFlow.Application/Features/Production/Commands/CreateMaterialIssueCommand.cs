using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-46 (kèm A46.1 xuất bổ sung – UC-47, A46.2 xuất thiếu – UC-48): Production Accountant ghi nhận NVL thực xuất
/// từ một kho cho lệnh sản xuất theo báo cáo kiểm đếm.
/// - BR-04: phải có quyền kho xuất. BR-42: chặn khi NVL đang kiểm kho.
/// - BR-33: SL thực xuất ≤ tồn hiện có; trừ tồn đúng SL thực xuất qua IInventoryLedger.
/// - BR-32: cộng dồn số đã xuất, tính lại số còn thiếu. BR-34: xuất vượt nhu cầu phải có lý do.
/// - BR-38: lần xuất đầu tiên chuyển lệnh sang Đang sản xuất.
/// </summary>
public record CreateMaterialIssueCommand(CreateMaterialIssueRequest Request) : IRequest<Result<MaterialIssueDto>>, IRetryOnConcurrencyConflict;

public class CreateMaterialIssueCommandValidator : AbstractValidator<CreateMaterialIssueCommand>
{
    public CreateMaterialIssueCommandValidator()
    {
        RuleFor(x => x.Request.ProductionOrderId).GreaterThan(0).WithMessage("Vui lòng chọn lệnh sản xuất.");
        RuleFor(x => x.Request.WarehouseId).GreaterThan(0).WithMessage("Vui lòng chọn kho xuất nguyên vật liệu.");
        RuleFor(x => x.Request.Reason).MaximumLength(500).WithMessage("Lý do tối đa 500 ký tự.");
        RuleFor(x => x.Request.Items).NotEmpty().WithMessage("Vui lòng nhập số lượng thực xuất.");
        RuleForEach(x => x.Request.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.Quantity)
                .GreaterThanOrEqualTo(0).WithMessage(ProductionMessages.InvalidIssueQuantity)
                .Must(q => ProductionHelper.HasMaxScale(q, ProductionPolicy.QuantityScale))
                .WithMessage("Số lượng thực xuất có tối đa 2 chữ số thập phân.");
        });
    }
}

public class CreateMaterialIssueCommandHandler : IRequestHandler<CreateMaterialIssueCommand, Result<MaterialIssueDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly ITransactionCodeGenerator _codeGenerator;
    private readonly IInventoryLedger _ledger;

    public CreateMaterialIssueCommandHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser,
        ITransactionCodeGenerator codeGenerator, IInventoryLedger ledger)
    {
        _context = context;
        _currentUser = currentUser;
        _codeGenerator = codeGenerator;
        _ledger = ledger;
    }

    public async Task<Result<MaterialIssueDto>> Handle(CreateMaterialIssueCommand command, CancellationToken ct)
    {
        var req = command.Request;
        if (_currentUser.UserId is not int userId)
            return Result.Failure<MaterialIssueDto>("Không xác định được người dùng đăng nhập.");

        // E46.1: lệnh phải tồn tại và còn Chưa bắt đầu / Đang sản xuất
        var order = await _context.TrxProductionOrders
            .Include(o => o.TrxProductionMaterialRequirements)
            .FirstOrDefaultAsync(o => o.ProductionOrderId == req.ProductionOrderId, ct);
        if (order == null) return Result.Failure<MaterialIssueDto>(ProductionMessages.OrderNotFound);
        if (!order.CanIssueMaterial())
            return Result.Failure<MaterialIssueDto>("Lệnh sản xuất đã hoàn thành hoặc đã huỷ nên không xuất được nguyên vật liệu.");

        // Lệnh lập từ kế hoạch có Kho xuất NVL: bắt buộc xuất tại đúng kho đó (kế hoạch đã so tồn / đặt hàng theo kho này)
        if (order.ProductionPlanId is int planId)
        {
            var planWarehouse = await _context.TrxProductionPlans.AsNoTracking()
                .Where(p => p.ProductionPlanId == planId && p.WarehouseId != null)
                .Select(p => new { p.PlanCode, p.WarehouseId, Name = p.Warehouse!.WarehouseName })
                .FirstOrDefaultAsync(ct);
            if (planWarehouse != null && planWarehouse.WarehouseId != req.WarehouseId)
                return Result.Failure<MaterialIssueDto>(
                    $"Lệnh lập từ kế hoạch {planWarehouse.PlanCode}: phải xuất nguyên vật liệu tại {planWarehouse.Name}.");
        }

        // BR-04: quyền kho xuất
        if (!await ProductionHelper.IsActiveWarehouseAsync(_context, req.WarehouseId, ct))
            return Result.Failure<MaterialIssueDto>("Kho xuất không tồn tại hoặc đã ngừng hoạt động.");
        if (!await _currentUser.HasWarehouseAccessAsync(req.WarehouseId, ct))
            return Result.Failure<MaterialIssueDto>(ProductionMessages.NoWarehouseAccess);

        // Chỉ ghi các dòng có SL thực xuất > 0 (A46.2: dòng thiếu tồn có thể để 0, phần thiếu giữ lại cho lần sau)
        var lines = req.Items.Where(i => i.Quantity > 0).ToList();
        if (lines.Count == 0) return Result.Failure<MaterialIssueDto>("Vui lòng nhập số lượng thực xuất cho ít nhất một nguyên vật liệu.");
        if (lines.Select(l => l.RequirementId).Distinct().Count() != lines.Count)
            return Result.Failure<MaterialIssueDto>("Mỗi nguyên vật liệu chỉ nhập một dòng trên phiếu xuất.");

        var requirements = order.TrxProductionMaterialRequirements.ToDictionary(r => r.RequirementId);
        if (lines.Any(l => !requirements.ContainsKey(l.RequirementId)))
            return Result.Failure<MaterialIssueDto>("Nguyên vật liệu không thuộc lệnh sản xuất.");

        var materialIds = lines.Select(l => requirements[l.RequirementId].MaterialId).ToList();

        // BR-42: NVL đang kiểm kho tại kho xuất
        var stocktakeError = await StocktakeGuard.CheckAsync(_context, req.WarehouseId, materialIds, ct);
        if (stocktakeError != null) return Result.Failure<MaterialIssueDto>(stocktakeError);

        // BR-33: không vượt tồn hiện có
        var available = await ProductionStockOps.AvailableAsync(_context, req.WarehouseId, materialIds, ct);
        var materials = await _context.MstProducts.Where(p => materialIds.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId, ct);
        foreach (var l in lines)
        {
            var r = requirements[l.RequirementId];
            if (l.Quantity > Math.Max(0, available.GetValueOrDefault(r.MaterialId)))
                return Result.Failure<MaterialIssueDto>(
                    $"{ProductionMessages.InvalidIssueQuantity} ({materials[r.MaterialId].ProductCode}: tồn {available.GetValueOrDefault(r.MaterialId):0.##})");
        }

        // BR-34: luỹ kế vượt nhu cầu phải có lý do
        var reason = string.IsNullOrWhiteSpace(req.Reason) ? null : req.Reason.Trim();
        var exceeds = lines.Any(l =>
        {
            var r = requirements[l.RequirementId];
            return (r.IssuedQty ?? 0) + l.Quantity > (r.RequiredQty ?? 0);
        });
        if (exceeds && reason == null)
            return Result.Failure<MaterialIssueDto>("Số lượng xuất luỹ kế vượt nhu cầu theo định mức. " + ProductionMessages.ReasonRequired);

        await using var tx = await _context.BeginTransactionAsync(ct);

        var now = VietnamTime.Now;
        var code = await ProductionHelper.NextCodeAsync(_context, _codeGenerator, "STOCK_ISSUE",
            (c, token) => _context.TrxStockIssues.AnyAsync(i => i.IssueCode == c, token), ct);

        var issue = new TrxStockIssue
        {
            IssueCode = code,
            IssueType = StockIssueType.Production,
            ProductionOrderId = order.ProductionOrderId,
            WarehouseId = req.WarehouseId,
            RequestedBy = userId,
            ProcessedBy = userId,
            RequestedDate = now,
            ProcessedDate = now,
            Status = "COMPLETED",
            IsSupplementary = req.IsSupplementary,
            Reason = reason,
        };
        _context.TrxStockIssues.Add(issue);
        await _context.SaveChangesAsync(ct);

        var reference = new StockRef(ProductionStockOps.IssueTransactionType, ProductionStockOps.IssueReferenceType, issue.StockIssueId, userId);
        foreach (var l in lines)
        {
            var r = requirements[l.RequirementId];
            await ProductionStockOps.IssueAsync(_context, _ledger, req.WarehouseId, materials[r.MaterialId], l.Quantity, reference, now, ct);

            _context.DtlStockIssueItems.Add(new DtlStockIssueItem
            {
                StockIssueId = issue.StockIssueId,
                MaterialRequirementId = r.RequirementId,
                RequestedQty = r.ShortageQty ?? 0,
                ActualIssuedQty = l.Quantity,
            });

            var issued = (r.IssuedQty ?? 0) + l.Quantity;
            r.IssuedQty = issued;
            r.ShortageQty = ProductionPolicy.CalculateShortage(r.RequiredQty ?? 0, issued);
        }

        // BR-38: lần xuất NVL đầu tiên
        if (order.IsNotStarted()) order.MarkInProgress();

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var authorized = await _currentUser.GetAuthorizedWarehouseIdsAsync(ct);
        var dto = (await ProductionReader.IssuesAsync(
            _context.TrxStockIssues.Where(i => i.StockIssueId == issue.StockIssueId), authorized, ct)).First();
        return Result.Success(dto);
    }
}
