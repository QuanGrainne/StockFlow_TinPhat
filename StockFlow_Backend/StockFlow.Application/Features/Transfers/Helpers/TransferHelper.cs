using System;
using System.Linq;
using System.Security.Cryptography;
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
    /// Tự động sinh mã phiếu chuyển hàng tiếp theo theo định dạng chuẩn hoặc thiết lập cài đặt hệ thống.
    /// </summary>
    public static async Task<string> GenerateNextTransferCodeAsync(
        IStockFlowDbContext context,
        CancellationToken cancellationToken = default)
    {
        var settings = await context.MstOrderSettings.FirstOrDefaultAsync(s => s.SettingId == 1, cancellationToken);
        string prefix = string.IsNullOrWhiteSpace(settings?.TransferCodePrefix) ? "CK" : settings.TransferCodePrefix.Trim();
        string rule = settings?.OrderCodeRule?.ToUpperInvariant() ?? "SEQUENTIAL";

        if (rule == "DATETIME")
        {
            long seq = await context.GetNextSequenceValueAsync("stockflow.seq_transfer_code", cancellationToken);
            return $"{prefix}{DateTime.UtcNow:yyMMddHHmm}{(seq % 1000):D2}";
        }
        else if (rule == "RANDOM")
        {
            const string chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
            byte[] randomBytes = new byte[7];
            RandomNumberGenerator.Fill(randomBytes);
            char[] charsArr = new char[7];
            for (int i = 0; i < 7; i++)
            {
                charsArr[i] = chars[randomBytes[i] % chars.Length];
            }
            return $"{prefix}-{new string(charsArr)}";
        }
        else
        {
            long seq = await context.GetNextSequenceValueAsync("stockflow.seq_transfer_code", cancellationToken);
            return $"{prefix}{seq:D6}";
        }
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
