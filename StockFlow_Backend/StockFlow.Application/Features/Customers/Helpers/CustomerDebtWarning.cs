using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Customers.Helpers;

/// <summary>
/// Tính cảnh báo công nợ theo "Thiết lập cảnh báo công nợ khách hàng" (chỉ cảnh báo, không chặn):
/// - Số tiền nợ: dư nợ hiện tại ≥ ngưỡng.
/// - Số ngày nợ: số ngày kể từ hóa đơn nợ đầu tiên còn chưa trả hết (FIRST_DEBT) hoặc giao dịch cuối cùng (LAST_TRANSACTION) ≥ ngưỡng.
/// Chỉ xét khách đang còn nợ (> 0).
/// </summary>
public static class CustomerDebtWarning
{
    public static async Task<Dictionary<int, string>> EvaluateAsync(
        IStockFlowDbContext context, IReadOnlyCollection<MstBusinessPartner> partners, CancellationToken ct)
    {
        var result = new Dictionary<int, string>();
        var debtors = partners.Where(p => (p.CurrentDebt ?? 0) > 0).ToList();
        if (debtors.Count == 0) return result;

        var setting = await context.MstDebtWarningSettings.AsNoTracking().FirstOrDefaultAsync(s => s.SettingId == 1, ct)
                      ?? new MstDebtWarningSetting();
        bool checkAmount = setting.EnableDebtAmountWarning && setting.DebtAmountThreshold > 0;
        bool checkDays = setting.EnableDebtDaysWarning && setting.DebtDaysThreshold > 0;
        if (!checkAmount && !checkDays) return result;

        Dictionary<int, DateTime> since = new();
        bool fromFirstDebt = setting.DebtDaysFrom != MstDebtWarningSetting.FromLastTransaction;
        if (checkDays)
        {
            var ids = debtors.Select(p => p.PartnerId).ToList();
            var orders = context.TrxOrders.AsNoTracking()
                .Where(o => ids.Contains(o.PartnerId) && o.Status == CustomerProfileHelper.CompletedStatus && o.OrderDate != null);
            if (fromFirstDebt)
                orders = orders.Where(o => (o.OutstandingAmount ?? 0) > 0);

            var rows = await orders
                .GroupBy(o => o.PartnerId)
                .Select(g => new
                {
                    PartnerId = g.Key,
                    Date = fromFirstDebt ? g.Min(o => o.OrderDate) : g.Max(o => o.OrderDate),
                })
                .ToListAsync(ct);
            since = rows.Where(r => r.Date.HasValue).ToDictionary(r => r.PartnerId, r => r.Date!.Value);
        }

        var today = VietnamTime.Now.Date;
        foreach (var p in debtors)
        {
            var reasons = new List<string>();
            var debt = p.CurrentDebt ?? 0;
            if (checkAmount && debt >= setting.DebtAmountThreshold)
                reasons.Add($"Nợ {debt:N0} đ ≥ mức cảnh báo {setting.DebtAmountThreshold:N0} đ");

            if (checkDays && since.TryGetValue(p.PartnerId, out var date))
            {
                var days = (today - date.Date).Days;
                if (days >= setting.DebtDaysThreshold)
                    reasons.Add(fromFirstDebt
                        ? $"Nợ {days} ngày kể từ giao dịch nợ đầu tiên (mức cảnh báo {setting.DebtDaysThreshold} ngày)"
                        : $"{days} ngày chưa phát sinh giao dịch (mức cảnh báo {setting.DebtDaysThreshold} ngày)");
            }

            if (reasons.Count > 0) result[p.PartnerId] = string.Join("; ", reasons);
        }
        return result;
    }
}
