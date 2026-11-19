using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Payments.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Payments.Helpers;

/// <summary>Dùng chung cho các handler payOS: map DTO và đồng bộ trạng thái với payOS (nguồn sự thật là payOS, không phải client).</summary>
public static class PayosPaymentSync
{
    /// <summary>Thời gian hiệu lực QR.</summary>
    public static readonly TimeSpan QrLifetime = TimeSpan.FromMinutes(10);

    // Tên viết tắt ngân hàng theo mã BIN VietQR (các ngân hàng phổ biến; không có thì hiện mã BIN)
    private static readonly Dictionary<string, string> BankNames = new()
    {
        ["970418"] = "BIDV",
        ["970436"] = "Vietcombank",
        ["970415"] = "VietinBank",
        ["970405"] = "Agribank",
        ["970422"] = "MB Bank",
        ["970407"] = "Techcombank",
        ["970416"] = "ACB",
        ["970432"] = "VPBank",
        ["970423"] = "TPBank",
        ["970403"] = "Sacombank",
        ["970437"] = "HDBank",
        ["970441"] = "VIB",
        ["970443"] = "SHB",
        ["970431"] = "Eximbank",
        ["970426"] = "MSB",
        ["970448"] = "OCB",
        ["970454"] = "Viet Capital Bank",
        ["970429"] = "SCB",
        ["970440"] = "SeABank",
        ["970449"] = "LPBank",
    };

    /// <summary>
    /// DTO cho màn Bán hàng. Ngân hàng / số tài khoản lấy theo cấu hình cố định (VD ACB 82004268) nếu có,
    /// còn mã QR vẫn là chuỗi payOS sinh ra (quét QR thì payOS tự nhận diện giao dịch).
    /// </summary>
    public static PayosPaymentDto ToDto(TrxPayosPayment p, IPayosGateway gateway)
    {
        var secondsLeft = p.IsPending() && p.ExpiredAt.HasValue
            ? (int)Math.Max(0, Math.Ceiling((p.ExpiredAt.Value - VietnamTime.Now).TotalSeconds))
            : 0;
        var bankName = gateway.DisplayBankName
                       ?? (p.Bin != null && BankNames.TryGetValue(p.Bin, out var bank) ? bank : p.Bin);
        return new PayosPaymentDto(
            p.OrderCode, p.ReferenceCode, p.Amount, p.Description, p.Status, p.CheckoutUrl, p.QrCode, p.Bin,
            bankName, gateway.DisplayAccountNumber ?? p.AccountNumber, p.AccountName,
            p.ExpiredAt, secondsLeft, p.PaidAt, p.PaidAmount, p.PayosReference);
    }

    /// <summary>
    /// Nội dung chuyển khoản: "ThanhToan-{mã đơn}" (payOS giới hạn 25 ký tự, chỉ chữ / số / gạch ngang).
    /// Không có mã đơn thì dùng 5 số cuối orderCode.
    /// </summary>
    public static string BuildDescription(string? referenceCode, long orderCode)
    {
        var code = new string((referenceCode ?? "").Where(c => char.IsAsciiLetterOrDigit(c) || c == '-').ToArray());
        if (code.Length == 0) code = (orderCode % 100000).ToString("D5");
        var description = $"ThanhToan-{code}";
        return description.Length <= 25 ? description : description[..25];
    }

    /// <summary>
    /// Link còn PENDING thì hỏi lại payOS và cập nhật trạng thái (PAID / CANCELLED / EXPIRED).
    /// Dùng khi webhook chưa tới được (VD chạy localhost). Trả về true nếu có thay đổi cần lưu.
    /// </summary>
    public static async Task<bool> SyncAsync(IPayosGateway gateway, TrxPayosPayment payment, CancellationToken ct)
    {
        if (!payment.IsPending()) return false;

        var info = await gateway.GetPaymentInfoAsync(payment.OrderCode, ct);
        if (!info.IsSuccess || info.Value == null) return false;

        var now = VietnamTime.Now;
        switch (info.Value.Status.ToUpperInvariant())
        {
            case "PAID":
                payment.MarkPaid(info.Value.AmountPaid > 0 ? info.Value.AmountPaid : info.Value.Amount, info.Value.Reference, now);
                break;
            case "CANCELLED":
                payment.MarkCancelled();
                break;
            case "EXPIRED":
                payment.MarkExpired();
                break;
            default:
                return false;
        }
        payment.UpdatedAt = now;
        return true;
    }
}
