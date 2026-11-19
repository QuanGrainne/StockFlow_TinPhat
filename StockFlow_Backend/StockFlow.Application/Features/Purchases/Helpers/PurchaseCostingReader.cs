using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Purchases.Helpers;

/// <summary>
/// Đọc lại cách tính giá vốn bình quân gia quyền của phiếu nhập đã hoàn thành từ thẻ kho:
/// mỗi dòng nhập ghi 1 dòng thẻ kho (SL nhập, giá vốn sau, tồn sau); tồn trước = tồn sau − SL nhập,
/// giá vốn trước = giá vốn của dòng thẻ kho liền trước cùng kho / hàng (giá vốn tính theo cả kho, tồn sau = tổng tồn của kho).
/// </summary>
public static class PurchaseCostingReader
{
    private static readonly string[] InboundTypes = ["INBOUND_RECEIPT", "INBOUND_RECEIPT_EDIT_IN"];

    public static async Task<List<PurchaseCostingDto>> ReadAsync(
        IStockFlowDbContext context, TrxGoodsReceipt receipt, CancellationToken ct)
    {
        var entries = await context.TrxInventoryTransactions.AsNoTracking()
            .Where(t => t.ReferenceType == "GOODS_RECEIPT" && t.ReferenceId == receipt.GrId
                        && t.TransactionType != null && InboundTypes.Contains(t.TransactionType) && t.Quantity > 0)
            .OrderBy(t => t.TransactionId)
            .ToListAsync(ct);
        if (entries.Count == 0) return [];

        var items = receipt.DtlGoodsReceiptItems.OrderBy(i => i.GrItemId).ToList();
        var result = new List<PurchaseCostingDto>();

        // Lần ghi nhập gần nhất (sau khi sửa phiếu) ứng với các dòng hiện tại của phiếu, cùng thứ tự
        foreach (var group in items.GroupBy(i => (i.ProductId, i.LocationId, i.LotId)))
        {
            var lines = group.ToList();
            var matched = entries
                .Where(e => e.ProductId == group.Key.ProductId && e.LocationId == group.Key.LocationId && e.LotId == group.Key.LotId)
                .TakeLast(lines.Count)
                .ToList();

            for (var idx = 0; idx < matched.Count && idx < lines.Count; idx++)
            {
                var entry = matched[idx];
                var item = lines[idx];
                var qtyIn = entry.Quantity ?? 0;
                var qtyAfter = entry.BalanceAfter ?? qtyIn;

                // Giá vốn tính theo cả kho (gộp mọi vị trí / lô) → lấy dòng thẻ kho liền trước của hàng trong kho
                var costBefore = await context.TrxInventoryTransactions.AsNoTracking()
                    .Where(t => t.WarehouseId == entry.WarehouseId && t.ProductId == entry.ProductId
                                && t.TransactionId < entry.TransactionId)
                    .OrderByDescending(t => t.TransactionId)
                    .Select(t => t.UnitCost)
                    .FirstOrDefaultAsync(ct) ?? 0;

                result.Add(new PurchaseCostingDto(
                    item.ProductId,
                    item.Product?.ProductCode ?? $"SP{item.ProductId}",
                    item.Product?.ProductName ?? "Sản phẩm",
                    qtyAfter - qtyIn,
                    costBefore,
                    qtyIn,
                    item.UnitLandedCost ?? 0,
                    qtyAfter,
                    entry.UnitCost ?? 0));
            }
        }

        return result;
    }
}
