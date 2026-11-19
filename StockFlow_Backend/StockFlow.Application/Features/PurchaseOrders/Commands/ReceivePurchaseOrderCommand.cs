using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseOrders.DTOs;
using StockFlow.Application.Features.PurchaseOrders.Helpers;
using StockFlow.Application.Features.PurchaseOrders.Queries;
using StockFlow.Application.Features.Purchases.Commands;
using StockFlow.Application.Features.Purchases.DTOs;

namespace StockFlow.Application.Features.PurchaseOrders.Commands;

/// <summary>
/// Nhập hàng ngay trong phiếu đặt hàng nhập (không chuyển sang form Nhập hàng):
/// người dùng nhập SL đạt / SL lỗi từng mặt hàng, hệ thống tự sinh phiếu nhập Hoàn thành theo đơn giá,
/// % giảm giá dòng và giảm giá phiếu của phiếu đặt. Toàn bộ nghiệp vụ nhập kho (cộng tồn, giá vốn BQ gia quyền,
/// thẻ kho, công nợ NCC, cập nhật trạng thái phiếu đặt) dùng lại CreatePurchaseCommand.
/// </summary>
public record ReceivePurchaseOrderCommand(int PoId, ReceivePurchaseOrderRequest Request)
    : IRequest<Result<PurchaseOrderDetailDto>>;

public class ReceivePurchaseOrderCommandHandler : IRequestHandler<ReceivePurchaseOrderCommand, Result<PurchaseOrderDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly ISender _sender;

    public ReceivePurchaseOrderCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser, ISender sender)
    {
        _context = context;
        _currentUser = currentUser;
        _sender = sender;
    }

    public async Task<Result<PurchaseOrderDetailDto>> Handle(ReceivePurchaseOrderCommand command, CancellationToken ct)
    {
        var req = command.Request;
        var po = await _context.TrxPurchaseOrders.AsNoTracking()
            .Include(p => p.DtlPurchaseOrderItems)
            .FirstOrDefaultAsync(p => p.PoId == command.PoId, ct);
        if (po == null) return Result.Failure<PurchaseOrderDetailDto>("Không tìm thấy phiếu đặt hàng nhập.");
        if (!await _currentUser.HasWarehouseAccessAsync(po.WarehouseId, ct))
            return Result.Failure<PurchaseOrderDetailDto>("Bạn không có quyền nhập hàng vào kho của phiếu đặt này.");
        if (po.Status != PurchaseOrderHelper.Ordered && po.Status != PurchaseOrderHelper.Partial)
            return Result.Failure<PurchaseOrderDetailDto>($"Phiếu đặt hàng nhập {po.PoCode} không ở trạng thái chờ nhập hàng.");

        if (req.Lines == null || req.Lines.Count == 0)
            return Result.Failure<PurchaseOrderDetailDto>("Vui lòng nhập số lượng nhận của ít nhất 1 mặt hàng.");
        if (req.Lines.GroupBy(l => l.ProductId).Any(g => g.Count() > 1))
            return Result.Failure<PurchaseOrderDetailDto>("Mỗi mặt hàng chỉ nhập 1 dòng.");
        if (req.Lines.Any(l => l.Quantity < 0 || l.DefectQuantity < 0))
            return Result.Failure<PurchaseOrderDetailDto>("Số lượng đạt / lỗi không được âm.");

        var orderLines = po.DtlPurchaseOrderItems.ToDictionary(i => i.ProductId);
        var items = new List<CreatePurchaseItemRequest>();
        foreach (var line in req.Lines.Where(l => l.Quantity > 0 || l.DefectQuantity > 0))
        {
            if (!orderLines.TryGetValue(line.ProductId, out var orderLine))
                return Result.Failure<PurchaseOrderDetailDto>("Mặt hàng không có trong phiếu đặt hàng nhập.");
            // SL đạt = 0 được phép khi cả dòng là hàng lỗi (lập phiếu trả hàng lỗi sau đó)
            items.Add(new CreatePurchaseItemRequest(
                line.ProductId, line.Quantity, orderLine.UnitPrice, orderLine.DiscountPercent,
                DefectQuantity: line.DefectQuantity));
        }
        if (items.Count == 0)
            return Result.Failure<PurchaseOrderDetailDto>("Vui lòng nhập số lượng nhận của ít nhất 1 mặt hàng.");

        // Giảm giá phiếu đặt chỉ áp vào lần nhập đầu tiên (giống form Nhập hàng theo phiếu đặt)
        var receivedBefore = await _context.TrxGoodsReceipts.AsNoTracking()
            .AnyAsync(r => r.PurchaseOrderId == po.PoId && r.Status == "COMPLETED", ct);

        var created = await _sender.Send(new CreatePurchaseCommand(new CreatePurchaseRequest(
            WarehouseId: po.WarehouseId,
            PartnerId: po.PartnerId,
            ExternalPoNumber: po.PoCode,
            ReceivedDate: req.ReceivedDate,
            Status: "COMPLETED",
            PaidAmount: Math.Max(0, req.PaidAmount),
            PaymentMethod: req.PaymentMethod,
            Notes: string.IsNullOrWhiteSpace(req.Notes) ? $"Nhập hàng theo phiếu đặt {po.PoCode}" : req.Notes.Trim(),
            Items: items,
            DiscountAmount: receivedBefore ? 0 : po.DiscountAmount,
            PurchaseOrderId: po.PoId)), ct);
        if (!created.IsSuccess)
            return Result.Failure<PurchaseOrderDetailDto>(created.Error ?? "Không tạo được phiếu nhập hàng.");

        return await _sender.Send(new GetPurchaseOrderByIdQuery(po.PoId), ct);
    }
}
