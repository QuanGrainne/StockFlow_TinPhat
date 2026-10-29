using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Transfers.Helpers;

public static class TransferHelper
{
    private static readonly Regex CkRegex = new(@"^CK(\d+)$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    /// <summary>
    /// Tự động sinh mã phiếu chuyển hàng tiếp theo theo định dạng chuẩn KiotViet: CK000001, CK000002...
    /// </summary>
    public static async Task<string> GenerateNextTransferCodeAsync(
        IStockFlowDbContext context,
        CancellationToken cancellationToken = default)
    {
        var existingCodes = await context.TrxStockTransfers
            .Where(t => t.TransferCode != null && t.TransferCode.StartsWith("CK"))
            .Select(t => t.TransferCode!)
            .ToListAsync(cancellationToken);

        int maxNumber = 0;
        foreach (var code in existingCodes)
        {
            var match = CkRegex.Match(code.Trim());
            if (match.Success && int.TryParse(match.Groups[1].Value, out int number))
            {
                if (number > maxNumber) maxNumber = number;
            }
        }

        return $"CK{maxNumber + 1:D6}";
    }

    /// <summary>
    /// Chuẩn hóa thời gian sang giờ địa phương Việt Nam (UTC+7) không bị lệch múi giờ khi lưu trữ vào PostgreSQL (timestamp without time zone)
    /// </summary>
    public static DateTime GetVietnamTime(DateTime? inputDate = null)
    {
        if (!inputDate.HasValue)
        {
            return DateTime.SpecifyKind(DateTime.UtcNow.AddHours(7), DateTimeKind.Unspecified);
        }

        var dt = inputDate.Value;
        if (dt.Kind == DateTimeKind.Utc)
        {
            // Nếu ngày truyền lên có dạng UTC (e.g. từ ISO string Z), cộng thêm 7 tiếng để ra đúng giờ Việt Nam
            return DateTime.SpecifyKind(dt.AddHours(7), DateTimeKind.Unspecified);
        }

        return DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);
    }
}
