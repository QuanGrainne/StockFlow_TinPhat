using System;
using System.Collections.Generic;
using System.Linq;

namespace StockFlow.Domain.Services;

/// <summary>Loại nguồn nhu cầu. Thứ tự số dùng để ưu tiên khi cùng ngày cần: lệnh trước kế hoạch (Q1).</summary>
public enum MrpDemandKind
{
    Order = 0,
    Plan = 1,
}

/// <summary>Kỳ gom nhu cầu để xem theo ngày / tuần (bắt đầu thứ Hai) / tháng.</summary>
public enum MrpPeriod
{
    Day,
    Week,
    Month,
}

/// <summary>Tình trạng NVL sau khi chạy MRP; thứ tự số tăng theo mức nghiêm trọng.</summary>
public enum MrpMaterialStatus
{
    /// <summary>Tồn hiện có đủ cho mọi nhu cầu trong kỳ.</summary>
    Sufficient = 0,

    /// <summary>Đủ nhờ hàng về theo lịch (đơn đặt có ngày giao); không có hàng về thì thiếu.</summary>
    CoveredByReceipts = 1,

    /// <summary>Thiếu, ngày phải đặt hàng chưa qua.</summary>
    Shortage = 2,

    /// <summary>Thiếu nhưng NVL chưa khai báo thời gian giao nên không tính được ngày đặt.</summary>
    NoLeadTime = 3,

    /// <summary>Thiếu và ngày phải đặt đã qua.</summary>
    Late = 4,
}

/// <summary>Một nhu cầu NVL: NVL, ngày cần, số lượng (đơn vị cơ sở), nguồn.</summary>
/// <param name="SourceId">production_order_id (Order) hoặc production_plan_id (Plan).</param>
/// <param name="ProductId">Thành phẩm gây ra nhu cầu.</param>
/// <param name="Sequence">Thứ tự tạo nguồn (VD id); phân xử khi cùng ngày, cùng loại.</param>
public sealed record MrpDemand(
    int MaterialId,
    DateOnly NeedDate,
    decimal Quantity,
    MrpDemandKind Kind,
    int SourceId,
    int ProductId,
    long Sequence);

/// <summary>Hàng về theo lịch (đơn đặt có ngày giao dự kiến, phiếu chuyển đang đi).</summary>
public sealed record MrpScheduledReceipt(int MaterialId, DateOnly ArrivalDate, decimal Quantity);

/// <summary>Dữ liệu của một NVL: tồn đầu kỳ, tồn an toàn, thời gian giao (ngày lịch, rỗng = chưa khai báo).</summary>
public sealed record MrpMaterialInput(int MaterialId, decimal OpeningBalance, decimal SafetyStock, int? LeadTimeDays);

/// <summary>Tham số một lần chạy.</summary>
/// <param name="Today">Hôm nay theo giờ Việt Nam (do nơi gọi truyền vào, Domain không đọc giờ).</param>
/// <param name="PeriodEnd">Ngày cuối kỳ tính; nhu cầu và hàng về sau ngày này bị bỏ qua.</param>
/// <param name="SafetyDays">Đệm an toàn, ngày làm việc trước ngày sản xuất (mặc định 0).</param>
/// <param name="InspectionDays">Thời gian kiểm nhận, ngày làm việc (mặc định 0).</param>
/// <param name="IsWorkingDay">Ngày làm việc; rỗng = mọi ngày đều làm việc (Q9: chưa cấu hình ngày nghỉ).</param>
public sealed record MrpSettings(
    DateOnly Today,
    DateOnly PeriodEnd,
    int SafetyDays = 0,
    int InspectionDays = 0,
    Func<DateOnly, bool>? IsWorkingDay = null);

/// <summary>Kết quả một mốc ngày của một NVL.</summary>
/// <param name="ProjectedBalance">Tồn dự phóng cuối ngày nếu không mua thêm (có thể âm).</param>
/// <param name="ProjectedBalanceAfterPlan">Tồn dự phóng sau khi nhận đủ các đề xuất tới ngày này.</param>
/// <param name="RequiredReceiptDate">Ngày hàng phải tới kho để kịp kiểm nhận (khi có đề xuất).</param>
/// <param name="PlannedReleaseDate">Ngày phải đặt hàng; rỗng khi không có đề xuất hoặc NVL chưa có thời gian giao.</param>
public sealed record MrpBucket(
    DateOnly Date,
    decimal GrossRequirement,
    decimal ScheduledReceipt,
    decimal ProjectedBalance,
    decimal NetRequirement,
    decimal PlannedReceipt,
    decimal ProjectedBalanceAfterPlan,
    DateOnly? RequiredReceiptDate,
    DateOnly? PlannedReleaseDate,
    bool IsLate);

/// <summary>Kết quả của một NVL trong kỳ.</summary>
/// <param name="EarliestAvailableDate">Khi trễ: ngày sớm nhất NVL có thể dùng nếu đặt hôm nay.</param>
/// <param name="HasOverdueReceipt">Có hàng về theo lịch đã quá ngày giao mà chưa về (được tính là về hôm nay).</param>
public sealed record MrpMaterialPlan(
    int MaterialId,
    decimal OpeningBalance,
    decimal SafetyStock,
    int? LeadTimeDays,
    IReadOnlyList<MrpBucket> Buckets,
    decimal TotalGrossRequirement,
    decimal TotalScheduledReceipt,
    decimal TotalPlannedReceipt,
    DateOnly? FirstShortageDate,
    DateOnly? EarliestAvailableDate,
    bool HasOverdueReceipt,
    MrpMaterialStatus Status);

/// <summary>Phần nguồn (tồn + hàng về tới ngày cần) được cấp cho một nhu cầu (BR-MRP-21).</summary>
public sealed record MrpAllocation(MrpDemand Demand, DateOnly EffectiveNeedDate, decimal Allocated, decimal Shortage);

public sealed record MrpResult(IReadOnlyList<MrpMaterialPlan> Materials, IReadOnlyList<MrpAllocation> Allocations);

/// <summary>
/// Hoạch định nhu cầu NVL theo thời gian (MRP, mã tạm UC-MRP / BR-MRP, specs/mrp/review/03_MRP_BUSINESS_RULES.md).
/// Thuần: không truy cập DB, không đọc giờ. Số lượng theo đơn vị cơ sở, làm tròn 2 chữ số như <see cref="ProductionPolicy"/>.
///
/// Mỗi NVL, mỗi mốc ngày t (hôm nay + các ngày có nhu cầu / hàng về, tới hết kỳ):
///   Trước(t) = PAB(t−1) + SR(t) − GR(t);  NR(t) = max(0, SS − Trước(t));  POR(t) = NR(t);  PAB(t) = Trước(t) + POR(t)
///   Ngày hàng phải tới kho = t − đệm an toàn − kiểm nhận (ngày làm việc); ngày đặt = ngày đó − thời gian giao (ngày lịch, Q4),
///   rơi vào ngày nghỉ thì lùi về ngày làm việc trước đó; ngày đặt trước hôm nay là trễ.
/// Phân bổ (chỉ để biết kế hoạch / lệnh nào thiếu, không khóa tồn): nhu cầu ngày cần sớm hơn được cấp trước;
/// cùng ngày thì lệnh trước kế hoạch, rồi theo thứ tự tạo (Q1). Hàng về sau ngày cần không được cấp cho nhu cầu đó.
/// </summary>
public static class MrpPolicy
{
    /// <summary>Giới hạn số bước lùi / tiến khi tìm ngày làm việc (tránh lặp vô hạn khi cấu hình không có ngày làm việc).</summary>
    private const int MaxCalendarScan = 3660;

    public static MrpResult Calculate(
        IEnumerable<MrpDemand> demands,
        IEnumerable<MrpScheduledReceipt> receipts,
        IEnumerable<MrpMaterialInput> materials,
        MrpSettings settings)
    {
        if (settings.PeriodEnd < settings.Today)
            throw new ArgumentException("Ngày cuối kỳ không được trước hôm nay.", nameof(settings));

        var today = settings.Today;
        var isWorking = settings.IsWorkingDay ?? (_ => true);

        // BR-MRP-03: ngày cần đã qua thì tính là hôm nay; nhu cầu sau kỳ bỏ qua; số lượng ≤ 0 bỏ qua
        var activeDemands = demands
            .Where(d => d.Quantity > 0)
            .Select(d => (Demand: d, Date: d.NeedDate < today ? today : d.NeedDate))
            .Where(x => x.Date <= settings.PeriodEnd)
            .ToList();

        // BR-MRP-14: hàng về quá ngày giao mà chưa về thì tính là về hôm nay (gắn cờ); hàng về sau kỳ bỏ qua
        var activeReceipts = receipts
            .Where(r => r.Quantity > 0)
            .Select(r => (Receipt: r, Date: r.ArrivalDate < today ? today : r.ArrivalDate, Overdue: r.ArrivalDate < today))
            .Where(x => x.Date <= settings.PeriodEnd)
            .ToList();

        var inputs = new Dictionary<int, MrpMaterialInput>();
        foreach (var m in materials) inputs[m.MaterialId] = m;

        var materialIds = inputs.Keys
            .Concat(activeDemands.Select(x => x.Demand.MaterialId))
            .Concat(activeReceipts.Select(x => x.Receipt.MaterialId))
            .Distinct()
            .OrderBy(id => id)
            .ToList();

        var demandsByMaterial = activeDemands.ToLookup(x => x.Demand.MaterialId);
        var receiptsByMaterial = activeReceipts.ToLookup(x => x.Receipt.MaterialId);

        var plans = new List<MrpMaterialPlan>(materialIds.Count);
        var allocations = new List<MrpAllocation>(activeDemands.Count);

        foreach (var materialId in materialIds)
        {
            var input = inputs.TryGetValue(materialId, out var found)
                ? found
                : new MrpMaterialInput(materialId, 0, 0, null);
            var opening = ProductionPolicy.RoundQuantity(input.OpeningBalance);
            var safetyStock = ProductionPolicy.RoundQuantity(Math.Max(0, input.SafetyStock));
            int? leadTime = input.LeadTimeDays is int lt && lt >= 0 ? lt : null;

            var materialDemands = demandsByMaterial[materialId].ToList();
            var materialReceipts = receiptsByMaterial[materialId].ToList();

            plans.Add(PlanMaterial(materialId, opening, safetyStock, leadTime, materialDemands, materialReceipts,
                settings, isWorking));
            allocations.AddRange(Allocate(opening, materialDemands, materialReceipts));
        }

        return new MrpResult(plans, allocations);
    }

    private static MrpMaterialPlan PlanMaterial(
        int materialId, decimal opening, decimal safetyStock, int? leadTime,
        List<(MrpDemand Demand, DateOnly Date)> demands,
        List<(MrpScheduledReceipt Receipt, DateOnly Date, bool Overdue)> receipts,
        MrpSettings settings, Func<DateOnly, bool> isWorking)
    {
        var today = settings.Today;
        var grossByDate = demands.GroupBy(x => x.Date).ToDictionary(g => g.Key, g => g.Sum(x => x.Demand.Quantity));
        var receiptByDate = receipts.GroupBy(x => x.Date).ToDictionary(g => g.Key, g => g.Sum(x => x.Receipt.Quantity));

        // Mốc ngày: luôn có hôm nay (dòng tồn đầu kỳ) + các ngày có biến động
        var dates = grossByDate.Keys.Concat(receiptByDate.Keys).Append(today).Distinct().OrderBy(d => d).ToList();

        var buckets = new List<MrpBucket>(dates.Count);
        decimal withoutPlan = opening, afterPlan = opening, withoutReceipts = opening;
        decimal totalGross = 0, totalReceipts = 0, totalPlanned = 0;
        DateOnly? firstShortage = null;
        var anyLate = false;
        var coveredByReceipts = false;

        foreach (var date in dates)
        {
            var gross = ProductionPolicy.RoundQuantity(grossByDate.GetValueOrDefault(date));
            var scheduled = ProductionPolicy.RoundQuantity(receiptByDate.GetValueOrDefault(date));

            withoutPlan += scheduled - gross;
            withoutReceipts -= gross;
            var before = afterPlan + scheduled - gross;
            var net = ProductionPolicy.RoundQuantity(Math.Max(0, safetyStock - before));
            afterPlan = before + net;

            DateOnly? requiredReceipt = null, release = null;
            var late = false;
            if (net > 0)
            {
                firstShortage ??= date;
                var inWarehouse = SubtractWorkingDays(date, settings.SafetyDays, isWorking);
                requiredReceipt = SubtractWorkingDays(inWarehouse, settings.InspectionDays, isWorking);
                if (leadTime is int days)
                {
                    release = PreviousWorkingDayOrSame(requiredReceipt.Value.AddDays(-days), isWorking);
                    late = release.Value < today;
                }
            }
            // Đủ nhờ hàng về: không có hàng về thì tồn xuống dưới mức an toàn
            if (net == 0 && withoutReceipts < safetyStock) coveredByReceipts = true;

            anyLate |= late;
            totalGross += gross;
            totalReceipts += scheduled;
            totalPlanned += net;

            buckets.Add(new MrpBucket(
                date, gross, scheduled,
                ProductionPolicy.RoundQuantity(withoutPlan),
                net, net,
                ProductionPolicy.RoundQuantity(afterPlan),
                requiredReceipt, release, late));
        }

        var status = totalPlanned == 0
            ? (coveredByReceipts ? MrpMaterialStatus.CoveredByReceipts : MrpMaterialStatus.Sufficient)
            : anyLate ? MrpMaterialStatus.Late
            : leadTime == null ? MrpMaterialStatus.NoLeadTime
            : MrpMaterialStatus.Shortage;

        // Trễ: đặt hôm nay thì hàng tới sau thời gian giao, rồi kiểm nhận và đệm an toàn (ngày làm việc)
        DateOnly? earliest = anyLate && leadTime is int ltDays
            ? AddWorkingDays(today.AddDays(ltDays), settings.InspectionDays + settings.SafetyDays, isWorking)
            : null;

        return new MrpMaterialPlan(
            materialId, opening, safetyStock, leadTime, buckets,
            totalGross, totalReceipts, totalPlanned, firstShortage, earliest,
            receipts.Any(r => r.Overdue), status);
    }

    /// <summary>
    /// BR-MRP-21: cấp tồn đầu kỳ + hàng về (chỉ hàng về đến ngày cần) cho từng nhu cầu theo thứ tự ưu tiên.
    /// Tồn âm (bán âm) phải được bù trước khi cấp cho nhu cầu. Không xét tồn an toàn (tồn an toàn không phải nhu cầu).
    /// </summary>
    private static IEnumerable<MrpAllocation> Allocate(
        decimal opening,
        List<(MrpDemand Demand, DateOnly Date)> demands,
        List<(MrpScheduledReceipt Receipt, DateOnly Date, bool Overdue)> receipts)
    {
        var ordered = demands
            .OrderBy(x => x.Date)
            .ThenBy(x => (int)x.Demand.Kind)
            .ThenBy(x => x.Demand.Sequence)
            .ThenBy(x => x.Demand.SourceId)
            .ThenBy(x => x.Demand.ProductId)
            .ToList();
        var pendingReceipts = receipts.OrderBy(x => x.Date).ToList();
        var nextReceipt = 0;
        var pool = opening;

        foreach (var (demand, date) in ordered)
        {
            while (nextReceipt < pendingReceipts.Count && pendingReceipts[nextReceipt].Date <= date)
                pool += pendingReceipts[nextReceipt++].Receipt.Quantity;

            var quantity = ProductionPolicy.RoundQuantity(demand.Quantity);
            var allocated = Math.Max(0, Math.Min(quantity, pool));
            pool -= allocated;
            yield return new MrpAllocation(demand, date, allocated, quantity - allocated);
        }
    }

    /// <summary>Ngày đầu kỳ chứa <paramref name="date"/>: chính ngày đó, thứ Hai của tuần, hoặc ngày 1 của tháng.</summary>
    public static DateOnly PeriodStart(DateOnly date, MrpPeriod period) => period switch
    {
        MrpPeriod.Week => date.AddDays(-(((int)date.DayOfWeek + 6) % 7)),
        MrpPeriod.Month => new DateOnly(date.Year, date.Month, 1),
        _ => date,
    };

    /// <summary>Gom số lượng theo ngày / tuần / tháng, sắp theo ngày đầu kỳ.</summary>
    public static IReadOnlyList<(DateOnly PeriodStart, decimal Quantity)> Aggregate(
        IEnumerable<(DateOnly Date, decimal Quantity)> items, MrpPeriod period) =>
        items
            .GroupBy(x => PeriodStart(x.Date, period))
            .OrderBy(g => g.Key)
            .Select(g => (g.Key, ProductionPolicy.RoundQuantity(g.Sum(x => x.Quantity))))
            .ToList();

    /// <summary>BR-MRP-27: số đề xuất làm tròn lên số nguyên khi mở đơn đặt (ô số lượng đơn đặt chỉ nhận số nguyên).</summary>
    public static decimal RoundUpForPurchase(decimal quantity) =>
        quantity <= 0 ? 0 : Math.Ceiling(ProductionPolicy.RoundQuantity(quantity));

    /// <summary>Lùi <paramref name="days"/> ngày làm việc; 0 thì giữ nguyên ngày.</summary>
    public static DateOnly SubtractWorkingDays(DateOnly date, int days, Func<DateOnly, bool> isWorking)
    {
        var result = date;
        for (int left = Math.Max(0, days), scanned = 0; left > 0 && scanned < MaxCalendarScan; scanned++)
        {
            result = result.AddDays(-1);
            if (isWorking(result)) left--;
        }
        return result;
    }

    /// <summary>Tiến <paramref name="days"/> ngày làm việc; 0 thì giữ nguyên ngày.</summary>
    public static DateOnly AddWorkingDays(DateOnly date, int days, Func<DateOnly, bool> isWorking)
    {
        var result = date;
        for (int left = Math.Max(0, days), scanned = 0; left > 0 && scanned < MaxCalendarScan; scanned++)
        {
            result = result.AddDays(1);
            if (isWorking(result)) left--;
        }
        return result;
    }

    /// <summary>BR-MRP-25: ngày rơi vào ngày nghỉ thì lùi về ngày làm việc liền trước.</summary>
    public static DateOnly PreviousWorkingDayOrSame(DateOnly date, Func<DateOnly, bool> isWorking)
    {
        var result = date;
        for (var scanned = 0; !isWorking(result) && scanned < MaxCalendarScan; scanned++)
            result = result.AddDays(-1);
        return isWorking(result) ? result : date;
    }
}
