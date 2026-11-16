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
/// UC-49 (kèm A49.1 ghi nhận thành phẩm lỗi – UC-50): Production Accountant ghi nhận thành phẩm đã kiểm đếm vào kho.
/// - BR-04 quyền kho nhận, BR-42 chặn khi thành phẩm đang kiểm kho.
/// - BR-35: luỹ kế SL đạt không vượt kế hoạch. BR-36: chỉ SL đạt vào tồn kho; SL lỗi ghi riêng trên báo cáo sản xuất.
/// - BR-37: cần nhiều NVL hơn số đã xuất → bắt buộc ghi chú, phiếu được gắn cờ cho Manager (không chặn).
/// - BR-38: luỹ kế SL đạt = kế hoạch → lệnh Hoàn thành (MSG45).
/// Giá vốn nhập = tổng giá trị NVL đã xuất của lệnh ÷ SL kế hoạch (ProductionPolicy).
/// </summary>
public record CreateFinishedGoodsReceiptCommand(CreateFinishedGoodsReceiptRequest Request)
    : IRequest<Result<FinishedGoodsReceiptDto>>;

public class CreateFinishedGoodsReceiptCommandValidator : AbstractValidator<CreateFinishedGoodsReceiptCommand>
{
    public CreateFinishedGoodsReceiptCommandValidator()
    {
        RuleFor(x => x.Request.ProductionOrderId).GreaterThan(0).WithMessage("Vui lòng chọn lệnh sản xuất.");
        RuleFor(x => x.Request.WarehouseId).GreaterThan(0).WithMessage("Vui lòng chọn kho thành phẩm.");
        RuleFor(x => x.Request.AcceptedQuantity)
            .GreaterThan(0).WithMessage("Số lượng đạt phải lớn hơn 0.")
            .Must(q => ProductionHelper.HasMaxScale(q, ProductionPolicy.QuantityScale))
            .WithMessage("Số lượng đạt có tối đa 2 chữ số thập phân.");
        RuleFor(x => x.Request.DefectQuantity)
            .GreaterThanOrEqualTo(0).WithMessage("Số lượng lỗi không được âm.")
            .Must(q => ProductionHelper.HasMaxScale(q, ProductionPolicy.QuantityScale))
            .WithMessage("Số lượng lỗi có tối đa 2 chữ số thập phân.");
        RuleFor(x => x.Request.LotNumber)
            .NotEmpty().WithMessage("Vui lòng nhập số lô thành phẩm.")
            .MaximumLength(50).WithMessage("Số lô tối đa 50 ký tự.");
        RuleFor(x => x.Request.DefectReason)
            .NotEmpty().When(x => x.Request.DefectQuantity > 0).WithMessage("Vui lòng nhập lý do lỗi.")
            .MaximumLength(500).WithMessage("Lý do lỗi tối đa 500 ký tự.");
        RuleFor(x => x.Request.Notes).MaximumLength(500).WithMessage("Ghi chú tối đa 500 ký tự.");
        RuleFor(x => x.Request.ReviewNote).MaximumLength(500).WithMessage("Ghi chú cảnh báo tối đa 500 ký tự.");
    }
}

public class CreateFinishedGoodsReceiptCommandHandler
    : IRequestHandler<CreateFinishedGoodsReceiptCommand, Result<FinishedGoodsReceiptDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly ITransactionCodeGenerator _codeGenerator;
    private readonly IInventoryLedger _ledger;

    public CreateFinishedGoodsReceiptCommandHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser,
        ITransactionCodeGenerator codeGenerator, IInventoryLedger ledger)
    {
        _context = context;
        _currentUser = currentUser;
        _codeGenerator = codeGenerator;
        _ledger = ledger;
    }

    public async Task<Result<FinishedGoodsReceiptDto>> Handle(CreateFinishedGoodsReceiptCommand command, CancellationToken ct)
    {
        var req = command.Request;
        if (_currentUser.UserId is not int userId)
            return Result.Failure<FinishedGoodsReceiptDto>("Không xác định được người dùng đăng nhập.");

        var order = await _context.TrxProductionOrders
            .Include(o => o.DtlProductionOrderItems)
            .FirstOrDefaultAsync(o => o.ProductionOrderId == req.ProductionOrderId, ct);
        if (order == null) return Result.Failure<FinishedGoodsReceiptDto>(ProductionMessages.OrderNotFound);
        if (!order.CanReceiveFinishedGoods())
            return Result.Failure<FinishedGoodsReceiptDto>(
                "Chỉ nhập thành phẩm cho lệnh đang sản xuất (đã xuất nguyên vật liệu, chưa hoàn thành).");

        // BR-04: quyền kho thành phẩm
        if (!await ProductionHelper.IsActiveWarehouseAsync(_context, req.WarehouseId, ct))
            return Result.Failure<FinishedGoodsReceiptDto>("Kho thành phẩm không tồn tại hoặc đã ngừng hoạt động.");
        if (!await _currentUser.HasWarehouseAccessAsync(req.WarehouseId, ct))
            return Result.Failure<FinishedGoodsReceiptDto>(ProductionMessages.NoWarehouseAccess);

        if (req.LocationId.HasValue && !await _context.MstWarehouseLocations.AnyAsync(
                l => l.LocationId == req.LocationId && l.WarehouseId == req.WarehouseId && l.IsActive != false, ct))
            return Result.Failure<FinishedGoodsReceiptDto>("Vị trí lưu kho không thuộc kho thành phẩm đã chọn.");

        var targetItem = req.ProductionOrderItemId.HasValue
            ? order.DtlProductionOrderItems.FirstOrDefault(i => i.ProductionOrderItemId == req.ProductionOrderItemId.Value)
            : order.DtlProductionOrderItems.OrderBy(i => i.ProductionOrderItemId).FirstOrDefault();
        if (req.ProductionOrderItemId.HasValue && targetItem == null)
            return Result.Failure<FinishedGoodsReceiptDto>("Dòng thành phẩm không thuộc lệnh sản xuất.");

        var targetProductId = targetItem?.ProductId ?? order.ProductId;
        var product = await _context.MstProducts.FirstAsync(p => p.ProductId == targetProductId, ct);

        // BR-35: kiểm tra vượt SL kế hoạch — nếu chưa xác nhận thì trả thông báo để FE hiện Popup [Có] / [Không]
        var planned = targetItem?.PlannedQuantity ?? order.PlannedQuantity ?? 0;
        var received = targetItem?.ActualQuantity ?? order.ActualQuantity ?? 0;
        if (received + req.AcceptedQuantity > planned && !req.ConfirmExceedPlan)
            return Result.Failure<FinishedGoodsReceiptDto>(
                $"[CONFIRM_EXCEED_PLAN] Số lượng thành phẩm sản xuất nhập kho lớn hơn số lượng trên lệnh sản xuất: {product.ProductCode}, lệnh sản xuất {order.ProductionOrderCode}. Bạn có muốn lưu chứng từ không?");

        // BR-42: thành phẩm đang kiểm kho tại kho nhận
        var stocktakeError = await StocktakeGuard.CheckAsync(_context, req.WarehouseId, new[] { targetProductId }, ct);
        if (stocktakeError != null) return Result.Failure<FinishedGoodsReceiptDto>(stocktakeError);

        // BR-37: cảnh báo dùng NVL → bắt buộc ghi chú, gắn cờ cho Manager
        var (acceptedSoFar, defectSoFar) = await FinishedGoodsRules.ProducedSoFarAsync(
            _context, order.ProductionOrderId, ct, targetItem?.ProductionOrderItemId);
        var warnings = await FinishedGoodsRules.MaterialWarningsAsync(
            _context, order, acceptedSoFar + defectSoFar + req.AcceptedQuantity + req.DefectQuantity, ct,
            targetItem?.ProductionOrderItemId, planned);
        var reviewNote = string.IsNullOrWhiteSpace(req.ReviewNote) ? null : req.ReviewNote.Trim();
        if (warnings.Count > 0 && reviewNote == null)
            return Result.Failure<FinishedGoodsReceiptDto>(ProductionMessages.MaterialUsageWarning);

        var now = VietnamTime.Now;

        await using var tx = await _context.BeginTransactionAsync(ct);

        // Lô, báo cáo sản xuất, phiếu nhập, cộng tồn kho (BR-36) và luỹ kế SL thực tế — dùng chung với Duyệt hoàn thành
        var receipt = await FinishedGoodsRules.ReceiveAsync(_context, _codeGenerator, _ledger,
            new FinishedGoodsRules.ReceiveInput(order, targetItem, product, req.WarehouseId, req.LocationId,
                req.LotNumber!, req.ProductionDate, req.AcceptedQuantity, req.DefectQuantity, req.DefectReason,
                req.Notes, warnings.Count > 0, reviewNote),
            userId, now, ct);

        // BR-38: nhận đủ kế hoạch của mọi thành phẩm trong lệnh → Hoàn thành
        if (targetItem != null)
        {
            if (order.DtlProductionOrderItems.All(i => i.ActualQuantity >= i.PlannedQuantity))
                order.MarkCompleted();
        }
        else if (order.ActualQuantity >= planned)
        {
            order.MarkCompleted();
        }

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var authorized = await _currentUser.GetAuthorizedWarehouseIdsAsync(ct);
        var dto = (await ProductionReader.ReceiptsAsync(
            _context.TrxFinishedGoodsReceipts.Where(f => f.FgrId == receipt.FgrId), authorized, ct)).First();
        return Result.Success(dto);
    }
}
