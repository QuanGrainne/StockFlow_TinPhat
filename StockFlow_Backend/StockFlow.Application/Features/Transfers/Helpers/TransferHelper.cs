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
    /// <summary>
    /// Khóa theo phiếu chuyển (pg_advisory_xact_lock): xuất / nhận / hủy / sửa cùng một phiếu chạy tuần tự,
    /// request đến sau đọc lại trạng thái mới nên không nhận / xuất 2 lần, không vừa nhận vừa hủy (DEF-IT-01).
    /// </summary>
    public static string LockKey(int transferId) => $"stock-transfer:{transferId}";

    /// <summary>
    /// Mở transaction (nếu chưa có) rồi giữ khóa của phiếu chuyển tới khi transaction kết thúc.
    /// Trả về null khi handler được gọi lồng trong transaction của handler khác (VD Tạo phiếu + Hoàn thành):
    /// khi đó khóa nằm trong transaction ngoài và handler ngoài commit.
    /// </summary>
    public static async Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction?> BeginLockedAsync(
        IStockFlowDbContext context, int transferId, CancellationToken ct)
    {
        var tx = context.HasActiveTransaction ? null : await context.BeginTransactionAsync(ct);
        await context.AcquireTransactionLockAsync(LockKey(transferId), ct);
        return tx;
    }

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
        // Mã phiếu chuyển luôn theo số thứ tự (bỏ quy tắc theo ngày giờ / ngẫu nhiên 24/11/2026)
        // Bỏ qua các mã đã có (phiếu nhập mã tay / dữ liệu cũ không làm tăng sequence) để không trùng mã
        for (var attempt = 0; attempt < 10000; attempt++)
        {
            long seq = await context.GetNextSequenceValueAsync("stockflow.seq_transfer_code", cancellationToken);
            var code = $"{prefix}{seq:D6}";
            if (!await context.TrxStockTransfers.AnyAsync(t => t.TransferCode == code, cancellationToken))
            {
                return code;
            }
        }
        throw new InvalidOperationException("Không sinh được mã phiếu chuyển hàng mới.");
    }

    /// <summary>
    /// Chuẩn hóa thời gian sang giờ địa phương Việt Nam (UTC+7) không bị lệch múi giờ khi lưu trữ vào PostgreSQL (timestamp without time zone)
    /// </summary>
    public static DateTime GetVietnamTime(DateTime? inputDate = null)
        => StockFlow.Application.Common.VietnamTime.From(inputDate);
}
