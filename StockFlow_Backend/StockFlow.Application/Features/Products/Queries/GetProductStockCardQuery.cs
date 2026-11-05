using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Products.DTOs;

namespace StockFlow.Application.Features.Products.Queries;

/// <summary>
/// Thẻ kho của 1 hàng hóa tại 1 kho: lịch sử biến động số lượng & giá vốn (mới nhất trước), chỉ xem / xuất file.
/// Dữ liệu lấy từ trx_inventory_transactions — mỗi nghiệp vụ kho hoàn tất (nhập, bán, trả hàng nhập, chuyển, kiểm kho,
/// cập nhật giá vốn) tự ghi 1 dòng.
/// </summary>
public record GetProductStockCardQuery(int ProductId, int WarehouseId) : IRequest<Result<List<StockCardEntryDto>>>;

public class GetProductStockCardQueryHandler : IRequestHandler<GetProductStockCardQuery, Result<List<StockCardEntryDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetProductStockCardQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    private static readonly Dictionary<string, string> TypeNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["INBOUND_RECEIPT"] = "Nhập hàng",
        ["INBOUND_RECEIPT_EDIT_IN"] = "Sửa phiếu nhập hàng",
        ["INBOUND_RECEIPT_EDIT_OUT"] = "Sửa phiếu nhập hàng",
        ["INBOUND_RECEIPT_CANCEL"] = "Hủy phiếu nhập hàng",
        ["OUTBOUND_PURCHASE_RETURN"] = "Trả hàng nhập",
        ["PURCHASE_RETURN_CANCEL"] = "Hủy phiếu trả hàng nhập",
        ["ISSUE_SALE"] = "Bán hàng",
        ["ISSUE_SALE_CANCEL"] = "Hủy hóa đơn",
        ["TRANSFER_OUT"] = "Chuyển hàng",
        ["TRANSFER_IN"] = "Nhận hàng chuyển",
        ["TRANSFER_CANCEL_IN"] = "Hủy phiếu chuyển hàng",
        ["TRANSFER_CANCEL_OUT"] = "Hủy phiếu chuyển hàng",
        ["STOCKTAKE_IN"] = "Kiểm hàng",
        ["STOCKTAKE_OUT"] = "Kiểm hàng",
        ["STOCKTAKE_CANCEL_IN"] = "Hủy phiếu kiểm hàng",
        ["STOCKTAKE_CANCEL_OUT"] = "Hủy phiếu kiểm hàng",
        ["COST_UPDATE"] = "Cập nhật giá vốn",
        ["ADJUSTMENT_IN"] = "Điều chỉnh tồn kho",
        ["ADJUSTMENT_OUT"] = "Điều chỉnh tồn kho",
    };

    public async Task<Result<List<StockCardEntryDto>>> Handle(GetProductStockCardQuery request, CancellationToken ct)
    {
        if (!await _context.MstProducts.AnyAsync(p => p.ProductId == request.ProductId, ct))
            return Result.Failure<List<StockCardEntryDto>>("Không tìm thấy hàng hóa.");
        if (!await _context.MstWarehouses.AnyAsync(w => w.WarehouseId == request.WarehouseId, ct))
            return Result.Failure<List<StockCardEntryDto>>("Không tìm thấy chi nhánh.");
        if (!await _currentUser.HasWarehouseAccessAsync(request.WarehouseId, ct))
            return Result.Failure<List<StockCardEntryDto>>("Bạn không có quyền xem thẻ kho của chi nhánh này.");

        var txs = await _context.TrxInventoryTransactions
            .AsNoTracking()
            .Where(t => t.ProductId == request.ProductId && t.WarehouseId == request.WarehouseId)
            .OrderByDescending(t => t.TransactionDate)
            .ThenByDescending(t => t.TransactionId)
            .ToListAsync(ct);
        if (txs.Count == 0) return Result.Success(new List<StockCardEntryDto>());

        List<int> IdsOf(string refType) => txs
            .Where(t => t.ReferenceId.HasValue && string.Equals(t.ReferenceType, refType, StringComparison.OrdinalIgnoreCase))
            .Select(t => t.ReferenceId!.Value).Distinct().ToList();

        // ── Chứng từ & đối tác theo từng loại tham chiếu ──
        var grIds = IdsOf("GOODS_RECEIPT");
        var receipts = await _context.TrxGoodsReceipts.AsNoTracking()
            .Where(g => grIds.Contains(g.GrId))
            .Select(g => new { g.GrId, g.GrCode, PartnerName = g.Partner.PartnerName })
            .ToDictionaryAsync(g => g.GrId, ct);
        var receiptPrices = await _context.DtlGoodsReceiptItems.AsNoTracking()
            .Where(i => grIds.Contains(i.GrId) && i.ProductId == request.ProductId)
            .Select(i => new { i.GrId, i.UnitPrice, i.UnitLandedCost, i.DiscountPercent })
            .ToListAsync(ct);

        var prIds = IdsOf("PURCHASE_RETURN");
        var returns = await _context.TrxPurchaseReturns.AsNoTracking()
            .Where(r => prIds.Contains(r.PurchaseReturnId))
            .Select(r => new { r.PurchaseReturnId, r.ReturnCode, PartnerName = r.Partner.PartnerName })
            .ToDictionaryAsync(r => r.PurchaseReturnId, ct);
        var returnPrices = await _context.DtlPurchaseReturnItems.AsNoTracking()
            .Where(i => prIds.Contains(i.PurchaseReturnId) && i.ProductId == request.ProductId)
            .Select(i => new { i.PurchaseReturnId, i.ReturnPrice })
            .ToListAsync(ct);

        var trIds = IdsOf("TRANSFER");
        var transfers = await _context.TrxStockTransfers.AsNoTracking()
            .Where(t => trIds.Contains(t.StockTransferId))
            .Select(t => new
            {
                t.StockTransferId,
                t.TransferCode,
                t.SourceWarehouseId,
                SourceName = t.SourceWarehouse.WarehouseName,
                DestName = t.DestWarehouse.WarehouseName,
            })
            .ToDictionaryAsync(t => t.StockTransferId, ct);
        var transferPrices = await _context.DtlStockTransferItems.AsNoTracking()
            .Where(i => trIds.Contains(i.StockTransferId) && i.ProductId == request.ProductId)
            .Select(i => new { i.StockTransferId, i.UnitCost })
            .ToListAsync(ct);

        var stIds = IdsOf("STOCKTAKE");
        var stocktakes = await _context.TrxStocktakes.AsNoTracking()
            .Where(s => stIds.Contains(s.StocktakeId))
            .Select(s => new { s.StocktakeId, s.StocktakeCode })
            .ToDictionaryAsync(s => s.StocktakeId, ct);

        var issueIds = IdsOf("STOCK_ISSUE");
        var issues = await _context.TrxStockIssues.AsNoTracking()
            .Where(i => issueIds.Contains(i.StockIssueId))
            .Select(i => new
            {
                i.StockIssueId,
                i.IssueCode,
                i.SalesOrderId,
                OrderCode = i.SalesOrder != null ? i.SalesOrder.OrderCode : null,
                CustomerName = i.SalesOrder != null ? i.SalesOrder.Partner.PartnerName : null,
            })
            .ToDictionaryAsync(i => i.StockIssueId, ct);
        var orderIds = issues.Values.Where(i => i.SalesOrderId.HasValue).Select(i => i.SalesOrderId!.Value).Distinct().ToList();
        var salePrices = await _context.DtlOrderItems.AsNoTracking()
            .Where(i => orderIds.Contains(i.OrderId) && i.ProductId == request.ProductId)
            .Select(i => new { i.OrderId, i.UnitPrice })
            .ToListAsync(ct);

        // ── Tồn cuối: dòng mới đã lưu sẵn BalanceAfter; dòng cũ tính lùi từ tồn hiện tại của kho ──
        var running = await _context.TrxInventoryBalances.AsNoTracking()
            .Where(b => b.ProductId == request.ProductId && b.WarehouseId == request.WarehouseId)
            .SumAsync(b => b.Quantity ?? 0, ct);

        var result = new List<StockCardEntryDto>(txs.Count);
        foreach (var t in txs)
        {
            var qty = t.Quantity ?? 0;
            var ending = t.BalanceAfter ?? running;
            running = ending - qty;

            var refId = t.ReferenceId;
            var refType = (t.ReferenceType ?? "").ToUpperInvariant();
            string code = "—";
            string? partner = null;
            decimal? price = t.TransactionPrice;

            switch (refType)
            {
                case "GOODS_RECEIPT" when refId.HasValue:
                    if (receipts.TryGetValue(refId.Value, out var gr))
                    {
                        code = gr.GrCode ?? $"PN{refId:D6}";
                        partner = gr.PartnerName;
                    }
                    // Giá GD = giá nhập trên phiếu (đơn giá sau giảm giá dòng, chưa phân bổ giảm giá tổng phiếu)
                    var grLine = receiptPrices.FirstOrDefault(p => p.GrId == refId);
                    if (grLine != null)
                        price = Math.Round((grLine.UnitPrice ?? grLine.UnitLandedCost ?? 0) * (1 - (grLine.DiscountPercent ?? 0) / 100m), 2, MidpointRounding.AwayFromZero);
                    break;
                case "PURCHASE_RETURN" when refId.HasValue:
                    if (returns.TryGetValue(refId.Value, out var pr))
                    {
                        code = pr.ReturnCode ?? $"THN{refId:D6}";
                        partner = pr.PartnerName;
                    }
                    // Giá GD = giá trả trên phiếu trả hàng nhập
                    price = returnPrices.FirstOrDefault(p => p.PurchaseReturnId == refId)?.ReturnPrice ?? price;
                    break;
                case "TRANSFER" when refId.HasValue:
                    if (transfers.TryGetValue(refId.Value, out var tr))
                    {
                        code = tr.TransferCode ?? $"CK{refId:D6}";
                        partner = t.WarehouseId == tr.SourceWarehouseId ? tr.DestName : tr.SourceName;
                    }
                    price ??= transferPrices.FirstOrDefault(p => p.StockTransferId == refId)?.UnitCost;
                    break;
                case "STOCKTAKE" when refId.HasValue:
                    code = stocktakes.TryGetValue(refId.Value, out var st) && st.StocktakeCode != null
                        ? st.StocktakeCode
                        : $"KK{refId:D6}";
                    price = null;
                    break;
                case "STOCK_ISSUE" when refId.HasValue:
                    if (issues.TryGetValue(refId.Value, out var iss))
                    {
                        code = iss.OrderCode ?? iss.IssueCode ?? $"XK{refId:D6}";
                        partner = iss.CustomerName;
                        // Giá GD = đơn giá bán thực tế trên hóa đơn (sau giảm giá dòng)
                        price = salePrices.FirstOrDefault(p => p.OrderId == iss.SalesOrderId)?.UnitPrice ?? price;
                    }
                    break;
                case "COST_UPDATE" when refId.HasValue:
                    code = $"CB{refId:D6}";
                    price = null;
                    break;
            }

            // Id chứng từ để mở phiếu: bán hàng mở theo hóa đơn (order), còn lại theo id tham chiếu
            int? documentId = refType == "STOCK_ISSUE" && refId.HasValue && issues.TryGetValue(refId.Value, out var issueDoc)
                ? issueDoc.SalesOrderId
                : refId;

            var type = t.TransactionType ?? "";
            result.Add(new StockCardEntryDto(
                TransactionId: t.TransactionId,
                DocumentCode: code,
                ReferenceType: t.ReferenceType,
                ReferenceId: refId,
                DocumentId: refType == "COST_UPDATE" || code == "—" ? null : documentId,
                TransactionDate: t.TransactionDate,
                TransactionType: type,
                TransactionTypeName: TypeNames.GetValueOrDefault(type, type),
                TransactionPrice: price,
                UnitCost: t.UnitCost,
                Quantity: qty,
                EndingBalance: ending,
                PartnerName: string.IsNullOrWhiteSpace(partner) ? null : partner));
        }

        return Result.Success(result);
    }
}
