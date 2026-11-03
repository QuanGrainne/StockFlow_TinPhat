using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Purchases.Helpers;

/// <summary>
/// Các hàm nghiệp vụ cốt lõi cho Module Nhập hàng theo chuẩn KiotViet & Kế toán kho (VAS 02).
/// </summary>
public static class GoodsReceiptHelper
{
    private static readonly Regex PnRegex = new(@"^PN(\d+)$", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex PnkLegacyRegex = new(@"^PNK.*?(\d+)$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    /// <summary>
    /// Tính toán Giá vốn bình quân gia quyền di động (Moving Average Cost) tại kho sau mỗi lần nhập hàng.
    /// Công thức: (Tồn cũ * Giá cũ + SL nhập * Giá nhập) / (Tồn cũ + SL nhập)
    /// </summary>
    /// <param name="currentQty">Số lượng tồn kho hiện tại (trước khi cộng phiếu nhập)</param>
    /// <param name="currentUnitCost">Giá vốn bình quân hiện tại trong kho</param>
    /// <param name="incomingQty">Số lượng hàng nhập mới thực tế</param>
    /// <param name="incomingUnitPrice">Đơn giá nhập thực tế (sau chiết khấu)</param>
    /// <returns>Giá vốn bình quân mới đã làm tròn 2 chữ số thập phân</returns>
    public static decimal CalculateMovingAverageCost(
        decimal currentQty,
        decimal currentUnitCost,
        decimal incomingQty,
        decimal incomingUnitPrice)
    {
        if (incomingQty <= 0)
        {
            return currentUnitCost;
        }

        // Nếu kho chưa có hàng hoặc đang bị âm tồn (do xuất kho trước khi nhập):
        // Giá vốn mới sẽ được chốt bằng chính đơn giá của lô hàng mới nhập này
        if (currentQty <= 0 || currentUnitCost <= 0)
        {
            return Math.Round(incomingUnitPrice, 2, MidpointRounding.AwayFromZero);
        }

        decimal totalQty = currentQty + incomingQty;
        if (totalQty <= 0)
        {
            return Math.Round(incomingUnitPrice, 2, MidpointRounding.AwayFromZero);
        }

        decimal totalValue = (currentQty * currentUnitCost) + (incomingQty * incomingUnitPrice);
        decimal newAverageCost = totalValue / totalQty;

        return Math.Round(newAverageCost, 2, MidpointRounding.AwayFromZero);
    }

    /// <summary>
    /// Tự động sinh mã phiếu nhập hàng tiếp theo theo định dạng chuẩn KiotViet: PN000001, PN000002...
    /// Tự động tăng và kiểm tra tránh trùng lặp.
    /// </summary>
    public static async Task<string> GenerateNextGoodsReceiptCodeAsync(
        IStockFlowDbContext context,
        CancellationToken cancellationToken = default)
    {
        var existingCodes = await context.TrxGoodsReceipts
            .AsNoTracking()
            .Where(r => !string.IsNullOrEmpty(r.GrCode))
            .Select(r => r.GrCode!)
            .ToListAsync(cancellationToken);

        int maxNumber = 0;

        foreach (var code in existingCodes)
        {
            var match = PnRegex.Match(code.Trim());
            if (match.Success && int.TryParse(match.Groups[1].Value, out int num))
            {
                if (num > maxNumber) maxNumber = num;
                continue;
            }

            var legacyMatch = PnkLegacyRegex.Match(code.Trim());
            if (legacyMatch.Success && int.TryParse(legacyMatch.Groups[1].Value, out int legacyNum))
            {
                if (legacyNum > maxNumber) maxNumber = legacyNum;
            }
        }

        int nextNumber = maxNumber + 1;
        string nextCode = $"PN{nextNumber:D6}";

        // Đảm bảo không trùng lặp mã đã tồn tại
        while (existingCodes.Any(c => string.Equals(c.Trim(), nextCode, StringComparison.OrdinalIgnoreCase)))
        {
            nextNumber++;
            nextCode = $"PN{nextNumber:D6}";
        }

        return nextCode;
    }
}
