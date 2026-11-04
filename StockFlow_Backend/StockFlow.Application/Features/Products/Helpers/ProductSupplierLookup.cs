using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Products.Helpers;

/// <summary>
/// "Nhà cung cấp" của hàng hóa là trường tính toán (chỉ đọc), không nhập trên form:
/// danh sách tên NCC của các phiếu nhập hàng đã hoàn thành có chứa hàng đó,
/// nhập gần nhất đứng trước, cách nhau bởi dấu phẩy.
/// </summary>
public static class ProductSupplierLookup
{
    public static async Task<Dictionary<int, string>> GetSupplierNamesAsync(
        IStockFlowDbContext context,
        IReadOnlyCollection<int> productIds,
        CancellationToken cancellationToken)
    {
        if (productIds.Count == 0) return new Dictionary<int, string>();

        var rows = await context.DtlGoodsReceiptItems
            .AsNoTracking()
            .Where(i => productIds.Contains(i.ProductId) && i.Gr.Status == "COMPLETED")
            .Select(i => new
            {
                i.ProductId,
                SupplierName = i.Gr.Partner.PartnerName,
                i.Gr.ReceivedDate,
                i.GrId,
            })
            .ToListAsync(cancellationToken);

        return rows
            .Where(r => !string.IsNullOrWhiteSpace(r.SupplierName))
            .GroupBy(r => r.ProductId)
            .ToDictionary(
                g => g.Key,
                g => string.Join(", ", g
                    .OrderByDescending(r => r.ReceivedDate)
                    .ThenByDescending(r => r.GrId)
                    .Select(r => r.SupplierName!.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)));
    }
}
