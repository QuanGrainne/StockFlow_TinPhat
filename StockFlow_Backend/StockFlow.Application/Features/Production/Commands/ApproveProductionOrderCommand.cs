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
/// Duyệt hoàn thành lệnh sản xuất (Manager): nhập SL thực tế (đạt / lỗi) của từng thành phẩm,
/// hệ thống TỰ SINH phiếu nhập thành phẩm (UC-49) vào kho thành phẩm rồi đóng lệnh (Hoàn thành) — một transaction.
/// Giữ các luật của nhập thành phẩm: BR-04 quyền kho, BR-42 hàng đang kiểm kho, BR-35 vượt kế hoạch (xác nhận),
/// BR-36 chỉ SL đạt vào tồn kho, BR-37 cảnh báo dùng NVL (bắt buộc ghi chú).
/// </summary>
public record ApproveProductionOrderCommand(int ProductionOrderId, ApproveProductionOrderRequest Request)
    : IRequest<Result<ProductionOrderDetailDto>>;

public class ApproveProductionOrderCommandValidator : AbstractValidator<ApproveProductionOrderCommand>
{
    public ApproveProductionOrderCommandValidator()
    {
        RuleFor(x => x.Request.WarehouseId).GreaterThan(0).WithMessage("Vui lòng chọn kho nhận thành phẩm.");
        RuleFor(x => x.Request.LotNumber).MaximumLength(50).WithMessage("Số lô tối đa 50 ký tự.");
        RuleFor(x => x.Request.Notes).MaximumLength(500).WithMessage("Ghi chú tối đa 500 ký tự.");
        RuleFor(x => x.Request.ReviewNote).MaximumLength(500).WithMessage("Ghi chú cảnh báo tối đa 500 ký tự.");
        RuleFor(x => x.Request.Lines).NotEmpty().WithMessage("Vui lòng nhập số lượng thực tế của thành phẩm.");
        RuleFor(x => x.Request.Lines)
            .Must(lines => lines.Sum(l => l.AcceptedQuantity + l.DefectQuantity) > 0)
            .WithMessage("Tổng số lượng thành phẩm (đạt + lỗi) phải lớn hơn 0.")
            .When(x => x.Request.Lines is { Count: > 0 });
        RuleForEach(x => x.Request.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.AcceptedQuantity)
                .GreaterThanOrEqualTo(0).WithMessage("Số lượng đạt không được âm.")
                .Must(q => ProductionHelper.HasMaxScale(q, ProductionPolicy.QuantityScale))
                .WithMessage("Số lượng đạt có tối đa 2 chữ số thập phân.");
            line.RuleFor(l => l.DefectQuantity)
                .GreaterThanOrEqualTo(0).WithMessage("Số lượng lỗi không được âm.")
                .Must(q => ProductionHelper.HasMaxScale(q, ProductionPolicy.QuantityScale))
                .WithMessage("Số lượng lỗi có tối đa 2 chữ số thập phân.");
            line.RuleFor(l => l.DefectReason)
                .NotEmpty().When(l => l.DefectQuantity > 0).WithMessage("Vui lòng nhập lý do lỗi.")
                .MaximumLength(500).WithMessage("Lý do lỗi tối đa 500 ký tự.");
        });
    }
}

public class ApproveProductionOrderCommandHandler : IRequestHandler<ApproveProductionOrderCommand, Result<ProductionOrderDetailDto>>
{
    private const int NotesMaxLength = 500;

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly ITransactionCodeGenerator _codeGenerator;
    private readonly IInventoryLedger _ledger;

    public ApproveProductionOrderCommandHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser,
        ITransactionCodeGenerator codeGenerator, IInventoryLedger ledger)
    {
        _context = context;
        _currentUser = currentUser;
        _codeGenerator = codeGenerator;
        _ledger = ledger;
    }

    public async Task<Result<ProductionOrderDetailDto>> Handle(ApproveProductionOrderCommand command, CancellationToken ct)
    {
        var req = command.Request;
        if (_currentUser.UserId is not int userId)
            return Result.Failure<ProductionOrderDetailDto>("Không xác định được người dùng đăng nhập.");

        var order = await _context.TrxProductionOrders
            .Include(o => o.DtlProductionOrderItems)
            .FirstOrDefaultAsync(o => o.ProductionOrderId == command.ProductionOrderId, ct);
        if (order == null) return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.OrderNotFound);
        if (!order.CanApproveCompletion())
            return Result.Failure<ProductionOrderDetailDto>(
                "Chỉ duyệt hoàn thành lệnh đang sản xuất (đã xuất nguyên vật liệu).");

        // BR-04: kho nhận thành phẩm đang hoạt động và được phân quyền
        if (!await ProductionHelper.IsActiveWarehouseAsync(_context, req.WarehouseId, ct))
            return Result.Failure<ProductionOrderDetailDto>("Kho thành phẩm không tồn tại hoặc đã ngừng hoạt động.");
        if (!await _currentUser.HasWarehouseAccessAsync(req.WarehouseId, ct))
            return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.NoWarehouseAccess);
        if (req.LocationId.HasValue && !await _context.MstWarehouseLocations.AnyAsync(
                l => l.LocationId == req.LocationId && l.WarehouseId == req.WarehouseId && l.IsActive != false, ct))
            return Result.Failure<ProductionOrderDetailDto>("Vị trí lưu kho không thuộc kho thành phẩm đã chọn.");

        // Ghép từng dòng nhập với dòng thành phẩm của lệnh (lệnh cũ không có dòng → 1 thành phẩm của lệnh)
        var targets = new List<(ApproveProductionOrderLine Line, DtlProductionOrderItem? Item, int ProductId, decimal Planned, decimal Received)>();
        foreach (var line in req.Lines.Where(l => l.AcceptedQuantity + l.DefectQuantity > 0))
        {
            if (line.ProductionOrderItemId.HasValue)
            {
                var item = order.DtlProductionOrderItems.FirstOrDefault(i => i.ProductionOrderItemId == line.ProductionOrderItemId.Value);
                if (item == null) return Result.Failure<ProductionOrderDetailDto>("Dòng thành phẩm không thuộc lệnh sản xuất.");
                targets.Add((line, item, item.ProductId, item.PlannedQuantity, item.ActualQuantity));
            }
            else
            {
                if (order.DtlProductionOrderItems.Count > 0)
                    return Result.Failure<ProductionOrderDetailDto>("Vui lòng chọn dòng thành phẩm của lệnh.");
                targets.Add((line, null, order.ProductId, order.PlannedQuantity ?? 0, order.ActualQuantity ?? 0));
            }
        }
        if (targets.Select(t => t.Item?.ProductionOrderItemId ?? 0).Distinct().Count() != targets.Count)
            return Result.Failure<ProductionOrderDetailDto>("Mỗi thành phẩm chỉ nhập một dòng khi duyệt hoàn thành.");

        var productIds = targets.Select(t => t.ProductId).Distinct().ToList();
        var products = await _context.MstProducts.Where(p => productIds.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId, ct);

        // BR-35: nhập vượt kế hoạch → hỏi xác nhận (FE hiện hộp thoại Có / Không)
        var exceed = targets.FirstOrDefault(t => t.Received + t.Line.AcceptedQuantity > t.Planned);
        if (exceed.Line != null && !req.ConfirmExceedPlan)
            return Result.Failure<ProductionOrderDetailDto>(
                $"[CONFIRM_EXCEED_PLAN] Số lượng thành phẩm nhập kho lớn hơn số lượng trên lệnh sản xuất: {products[exceed.ProductId].ProductCode}, lệnh sản xuất {order.ProductionOrderCode}. Bạn có muốn tiếp tục duyệt không?");

        // BR-42: thành phẩm đang kiểm kho tại kho nhận
        var stocktakeError = await StocktakeGuard.CheckAsync(_context, req.WarehouseId, productIds, ct);
        if (stocktakeError != null) return Result.Failure<ProductionOrderDetailDto>(stocktakeError);

        // BR-37: thành phẩm cần nhiều NVL hơn số đã xuất → bắt buộc ghi chú, phiếu gắn cờ cho Manager xem
        var needsReview = new Dictionary<int, bool>();
        foreach (var t in targets)
        {
            var (acceptedSoFar, defectSoFar) = await FinishedGoodsRules.ProducedSoFarAsync(
                _context, order.ProductionOrderId, ct, t.Item?.ProductionOrderItemId);
            var warnings = await FinishedGoodsRules.MaterialWarningsAsync(
                _context, order, acceptedSoFar + defectSoFar + t.Line.AcceptedQuantity + t.Line.DefectQuantity, ct,
                t.Item?.ProductionOrderItemId, t.Planned);
            needsReview[t.Item?.ProductionOrderItemId ?? 0] = warnings.Count > 0;
        }
        var reviewNote = string.IsNullOrWhiteSpace(req.ReviewNote) ? null : req.ReviewNote.Trim();
        if (needsReview.Values.Any(v => v) && reviewNote == null)
            return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.MaterialUsageWarning);

        var lotNumber = string.IsNullOrWhiteSpace(req.LotNumber) ? order.ProductionOrderCode ?? $"LSX{order.ProductionOrderId}" : req.LotNumber.Trim();
        var now = VietnamTime.Now;

        await using var tx = await _context.BeginTransactionAsync(ct);

        // Tự sinh phiếu nhập thành phẩm cho từng thành phẩm (dùng chung logic với nhập thủ công)
        var codes = new List<string>();
        foreach (var t in targets)
        {
            var receipt = await FinishedGoodsRules.ReceiveAsync(_context, _codeGenerator, _ledger,
                new FinishedGoodsRules.ReceiveInput(order, t.Item, products[t.ProductId], req.WarehouseId, req.LocationId,
                    lotNumber, req.ProductionDate, t.Line.AcceptedQuantity, t.Line.DefectQuantity, t.Line.DefectReason,
                    req.Notes, needsReview[t.Item?.ProductionOrderItemId ?? 0], reviewNote),
                userId, now, ct);
            if (!string.IsNullOrEmpty(receipt.FgrCode)) codes.Add(receipt.FgrCode);
        }

        // Duyệt = đóng lệnh (Hoàn thành), ghi vết người duyệt + các phiếu nhập đã sinh vào ghi chú lệnh
        var approver = ProductionHelper.UserName(await _context.SecUsers.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId, ct));
        var approveNote = $"[Duyệt hoàn thành {now:dd/MM/yyyy HH:mm} - {approver}] Phiếu nhập thành phẩm: {string.Join(", ", codes)}";
        var notes = string.IsNullOrWhiteSpace(order.Notes) ? approveNote : $"{order.Notes}\n{approveNote}";
        order.Notes = notes.Length > NotesMaxLength ? notes[^NotesMaxLength..] : notes;
        order.MarkCompleted();

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var detail = await ProductionReader.OrderDetailAsync(_context, _currentUser, order.ProductionOrderId, null, ct);
        return Result.Success(detail!);
    }
}
