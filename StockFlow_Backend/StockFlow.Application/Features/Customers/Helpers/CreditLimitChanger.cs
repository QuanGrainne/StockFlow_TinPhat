using System.Globalization;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Customers.Helpers;

public enum CreditLimitChangeStatus
{
    Changed,
    Unchanged,
    NotFound,
    WalkIn,
    OutOfRange,
    BelowDebt,
}

public record CreditLimitChangeOutcome(
    CreditLimitChangeStatus Status,
    int PartnerId,
    string? PartnerCode,
    string? PartnerName,
    decimal OldLimit,
    decimal NewLimit,
    decimal CurrentDebt)
{
    private static readonly CultureInfo Vi = CultureInfo.GetCultureInfo("vi-VN");

    public string Message => Status switch
    {
        CreditLimitChangeStatus.NotFound => $"Không tìm thấy khách hàng #{PartnerId}.",
        CreditLimitChangeStatus.WalkIn => "Khách lẻ không được ghi nợ nên không có hạn mức.",
        CreditLimitChangeStatus.Unchanged => "Hạn mức mới trùng với hạn mức hiện tại.",
        CreditLimitChangeStatus.OutOfRange => "Hạn mức phải trong khoảng 0 – 999.999.999.999 đ.",
        CreditLimitChangeStatus.BelowDebt =>
            $"Hạn mức mới ({NewLimit.ToString("N0", Vi)} đ) thấp hơn dư nợ hiện tại ({CurrentDebt.ToString("N0", Vi)} đ). Không được hạ hạn mức xuống dưới dư nợ.",
        _ => string.Empty,
    };
}

/// <summary>
/// Đổi hạn mức công nợ của một khách (Manager điều chỉnh một khách / hàng loạt) và ghi lịch sử.
/// Bắt buộc gọi trong transaction; caller gọi SaveChanges để lưu dòng lịch sử rồi commit.
/// </summary>
public static class CreditLimitChanger
{
    public static string LockKey(int partnerId) => $"credit-limit:{partnerId}";

    /// <param name="computeNewLimit">Tính hạn mức mới từ hạn mức hiện tại (đặt cố định, theo %, về mặc định...).</param>
    public static async Task<CreditLimitChangeOutcome> ApplyAsync(
        IStockFlowDbContext context,
        int partnerId,
        Func<decimal, decimal> computeNewLimit,
        string source,
        string reason,
        int? userId,
        CancellationToken ct)
    {
        // Hai Manager cùng sửa một khách → chạy tuần tự để hạn mức cũ ghi trong lịch sử luôn đúng
        await context.AcquireTransactionLockAsync(LockKey(partnerId), ct);

        var partner = await context.MstBusinessPartners.AsNoTracking()
            .Where(p => p.PartnerId == partnerId && p.PartnerType != null &&
                        (p.PartnerType.ToUpper() == "CUSTOMER" || p.PartnerType.ToUpper() == "BOTH"))
            .Select(p => new { p.PartnerId, p.PartnerCode, p.PartnerName, p.CreditLimit, p.CurrentDebt })
            .FirstOrDefaultAsync(ct);

        if (partner == null)
            return new(CreditLimitChangeStatus.NotFound, partnerId, null, null, 0, 0, 0);

        decimal oldLimit = partner.CreditLimit ?? 0;
        decimal debt = partner.CurrentDebt ?? 0;
        decimal newLimit = computeNewLimit(oldLimit);

        CreditLimitChangeOutcome Outcome(CreditLimitChangeStatus status, decimal currentDebt) =>
            new(status, partner.PartnerId, partner.PartnerCode, partner.PartnerName, oldLimit, newLimit, currentDebt);

        if (partner.PartnerCode == CustomerCreditPolicy.WalkInCustomerCode)
            return Outcome(CreditLimitChangeStatus.WalkIn, debt);
        if (newLimit < 0 || newLimit > CustomerCreditPolicy.MaxCreditLimit)
            return Outcome(CreditLimitChangeStatus.OutOfRange, debt);
        if (newLimit == oldLimit)
            return Outcome(CreditLimitChangeStatus.Unchanged, debt);
        if (newLimit < debt)
            return Outcome(CreditLimitChangeStatus.BelowDebt, debt);

        // Điều kiện dư nợ nằm trong chính câu UPDATE: hóa đơn POS ghi nợ cùng lúc khóa dòng khách,
        // PostgreSQL kiểm lại điều kiện trên dữ liệu mới nhất → không thể hạ hạn mức xuống dưới dư nợ.
        int rows = await context.MstBusinessPartners
            .Where(p => p.PartnerId == partnerId && (p.CurrentDebt ?? 0) <= newLimit)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.CreditLimit, (decimal?)newLimit), ct);

        if (rows == 0)
        {
            decimal latestDebt = await context.MstBusinessPartners.AsNoTracking()
                .Where(p => p.PartnerId == partnerId)
                .Select(p => p.CurrentDebt ?? 0)
                .FirstAsync(ct);
            return Outcome(CreditLimitChangeStatus.BelowDebt, latestDebt);
        }

        context.TrxCreditLimitHistories.Add(new TrxCreditLimitHistory
        {
            PartnerId = partnerId,
            OldLimit = oldLimit,
            NewLimit = newLimit,
            Source = source,
            Reason = reason,
            ChangedBy = userId,
            ChangedAt = VietnamTime.Now,
        });

        return Outcome(CreditLimitChangeStatus.Changed, debt);
    }

    /// <summary>Làm tròn tới 1.000 đ (dùng cho điều chỉnh theo %).</summary>
    public static decimal RoundToThousand(decimal value) =>
        Math.Round(value / 1000m, MidpointRounding.AwayFromZero) * 1000m;
}
