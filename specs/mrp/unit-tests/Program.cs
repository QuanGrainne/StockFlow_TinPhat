// Kiểm thử đơn vị bộ tính MRP (MrpPolicy). Số liệu theo specs/mrp/review/03_MRP_BUSINESS_RULES.md mục 6
// và 08_MRP_TEST_PLAN.md. Mỗi ca in PASS / FAIL; mã thoát 1 nếu có ca lỗi.
// "Hôm nay" cố định thứ Hai 16/11/2026 để kết quả không đổi theo ngày chạy.

using StockFlow.Domain.Services;

var results = new List<(string Id, string Name, bool Pass, string Detail)>();
var n = 1;

void Check(string name, bool pass, string detail = "")
{
    var id = $"MU-{n++:00}";
    results.Add((id, name, pass, detail));
    Console.WriteLine($"{(pass ? "PASS" : "FAIL")} {id} {name}{(string.IsNullOrEmpty(detail) ? "" : " -> " + detail)}");
}

static DateOnly D(int month, int day) => new(2026, month, day);
var today = D(11, 16);
var settings = new MrpSettings(today, D(12, 16));

const int Wood = 1, Paint = 2, Screw = 3;
const int TableA = 101, ChairB = 102;

MrpDemand PlanDemand(int material, DateOnly date, decimal qty, int planId = 1, int product = TableA, long seq = 1) =>
    new(material, date, qty, MrpDemandKind.Plan, planId, product, seq);
MrpDemand OrderDemand(int material, DateOnly date, decimal qty, int orderId = 1, int product = TableA, long seq = 1) =>
    new(material, date, qty, MrpDemandKind.Order, orderId, product, seq);

MrpResult Run(IEnumerable<MrpDemand> demands, IEnumerable<MrpScheduledReceipt>? receipts = null,
    IEnumerable<MrpMaterialInput>? materials = null, MrpSettings? s = null) =>
    MrpPolicy.Calculate(demands, receipts ?? [], materials ?? [], s ?? settings);

MrpBucket At(MrpMaterialPlan plan, DateOnly date) => plan.Buckets.Single(b => b.Date == date);
string Por(MrpMaterialPlan p) => string.Join("; ", p.Buckets.Where(b => b.PlannedReceipt > 0)
    .Select(b => $"{b.Date:dd/MM}: {b.PlannedReceipt} đặt {b.PlannedReleaseDate:dd/MM}"));

// Ví dụ Bàn A (20/11) / Ghế B (22/11): nhu cầu tính bằng công thức BR-31 đang có
List<MrpDemand> Example(int material, decimal perTable, decimal perChair) =>
[
    PlanDemand(material, D(11, 20), ProductionPolicy.CalculateRequirement(100, perTable, 0), 1, TableA),
    PlanDemand(material, D(11, 22), ProductionPolicy.CalculateRequirement(200, perChair, 0), 1, ChairB),
];
var woodDemands = Example(Wood, 5, 2);

// ─── 1. Tổng nhu cầu và bốn trường hợp mẫu (file 03 mục 6) ────────────────────
var all = Run(woodDemands.Concat(Example(Paint, 1, 0.5m)).Concat(Example(Screw, 10, 8)));
Check("Tổng nhu cầu: gỗ 900, sơn 200, ốc vít 2.600",
    all.Materials.Single(m => m.MaterialId == Wood).TotalGrossRequirement == 900
    && all.Materials.Single(m => m.MaterialId == Paint).TotalGrossRequirement == 200
    && all.Materials.Single(m => m.MaterialId == Screw).TotalGrossRequirement == 2600);

var woodInput = new MrpMaterialInput(Wood, 300, 0, 3);
var case1 = Run(woodDemands, materials: [woodInput]).Materials.Single();
Check("TH1 tồn 300, không hàng về: thiếu 200 ngày 20/11 (đặt 17/11), 400 ngày 22/11 (đặt 19/11), tổng 600",
    At(case1, D(11, 20)).PlannedReceipt == 200 && At(case1, D(11, 20)).PlannedReleaseDate == D(11, 17)
    && At(case1, D(11, 22)).PlannedReceipt == 400 && At(case1, D(11, 22)).PlannedReleaseDate == D(11, 19)
    && case1.TotalPlannedReceipt == 600 && case1.FirstShortageDate == D(11, 20)
    && case1.Status == MrpMaterialStatus.Shortage, Por(case1));
Check("TH1 tồn dự phóng nếu không mua: 300 → −200 → −600; sau đề xuất về 0",
    At(case1, D(11, 16)).ProjectedBalance == 300 && At(case1, D(11, 20)).ProjectedBalance == -200
    && At(case1, D(11, 22)).ProjectedBalance == -600 && At(case1, D(11, 22)).ProjectedBalanceAfterPlan == 0);

var paint = Run(Example(Paint, 1, 0.5m), materials: [new MrpMaterialInput(Paint, 150, 0, 2)]).Materials.Single();
var screw = Run(Example(Screw, 10, 8), materials: [new MrpMaterialInput(Screw, 800, 0, 1)]).Materials.Single();
Check("Sơn tồn 150, LT 2: đủ ngày 20/11, thiếu 50 ngày 22/11 (đặt 20/11)",
    At(paint, D(11, 20)).PlannedReceipt == 0 && At(paint, D(11, 22)).PlannedReceipt == 50
    && At(paint, D(11, 22)).PlannedReleaseDate == D(11, 20), Por(paint));
Check("Ốc vít tồn 800, LT 1: thiếu 200 (đặt 19/11) và 1.600 (đặt 21/11)",
    At(screw, D(11, 20)).PlannedReceipt == 200 && At(screw, D(11, 20)).PlannedReleaseDate == D(11, 19)
    && At(screw, D(11, 22)).PlannedReceipt == 1600 && At(screw, D(11, 22)).PlannedReleaseDate == D(11, 21), Por(screw));

var case2 = Run(woodDemands, [new MrpScheduledReceipt(Wood, D(11, 19), 250)], [woodInput]).Materials.Single();
Check("TH2 đơn 250 về 19/11 (trước ngày cần): ngày 20/11 đủ (còn 50), thiếu 350 ngày 22/11 (đặt 19/11)",
    At(case2, D(11, 19)).ScheduledReceipt == 250 && At(case2, D(11, 20)).PlannedReceipt == 0
    && At(case2, D(11, 20)).ProjectedBalance == 50 && At(case2, D(11, 22)).PlannedReceipt == 350
    && At(case2, D(11, 22)).PlannedReleaseDate == D(11, 19) && case2.TotalPlannedReceipt == 350, Por(case2));

var case3 = Run(woodDemands, [new MrpScheduledReceipt(Wood, D(11, 21), 250)], [woodInput]).Materials.Single();
Check("TH3 đơn 250 về 21/11 (sau ngày cần đầu): thiếu 200 ngày 20/11 (đặt 17/11), 150 ngày 22/11 (đặt 19/11)",
    At(case3, D(11, 20)).PlannedReceipt == 200 && At(case3, D(11, 20)).PlannedReleaseDate == D(11, 17)
    && At(case3, D(11, 21)).ProjectedBalanceAfterPlan == 250
    && At(case3, D(11, 22)).PlannedReceipt == 150 && At(case3, D(11, 22)).PlannedReleaseDate == D(11, 19), Por(case3));

var case4 = Run(woodDemands, [new MrpScheduledReceipt(Wood, D(11, 19), 250)], [woodInput with { SafetyStock = 100 }]).Materials.Single();
Check("TH4 như TH2 + tồn an toàn 100: đề xuất 50 ngày 20/11, 400 ngày 22/11, tổng 450; tồn sau đề xuất = 100",
    At(case4, D(11, 20)).PlannedReceipt == 50 && At(case4, D(11, 22)).PlannedReceipt == 400
    && case4.TotalPlannedReceipt == 450 && At(case4, D(11, 20)).ProjectedBalanceAfterPlan == 100
    && At(case4, D(11, 22)).ProjectedBalanceAfterPlan == 100, Por(case4));

var cum = 0m;
var invariant = case3.Buckets.All(b => { cum += b.PlannedReceipt; return b.ProjectedBalanceAfterPlan == b.ProjectedBalance + cum; });
Check("Tồn sau đề xuất = tồn nếu không mua + đề xuất lũy kế (mọi mốc ngày)", invariant);
Check("Luôn có dòng ngày chạy (tồn đầu kỳ)", case1.Buckets[0].Date == today && case1.Buckets[0].ProjectedBalance == 300);

// ─── 2. Phân bổ cho kế hoạch / lệnh (BR-MRP-21, Q1) ───────────────────────────
var withKh2 = woodDemands.Prepend(PlanDemand(Wood, D(11, 19), 250, planId: 2, product: 103, seq: 2)).ToList();
var alloc = Run(withKh2, materials: [woodInput]).Allocations;
string AllocText(IEnumerable<MrpAllocation> a) => string.Join("; ", a.Select(x => $"KH{x.Demand.SourceId}/{x.Demand.ProductId}: cấp {x.Allocated} thiếu {x.Shortage}"));
Check("Thêm KH-2 cần 250 ngày 19/11: KH-2 đủ, Bàn A thiếu 450, Ghế B thiếu 400, tổng thiếu 850",
    alloc.Single(a => a.Demand.SourceId == 2).Shortage == 0
    && alloc.Single(a => a.Demand.ProductId == TableA).Allocated == 50 && alloc.Single(a => a.Demand.ProductId == TableA).Shortage == 450
    && alloc.Single(a => a.Demand.ProductId == ChairB).Shortage == 400 && alloc.Sum(a => a.Shortage) == 850, AllocText(alloc));

var alloc3 = Run(woodDemands, [new MrpScheduledReceipt(Wood, D(11, 21), 250)], [woodInput]).Allocations;
Check("Hàng về sau ngày cần không cấp cho nhu cầu đó; tổng thiếu phân bổ = tổng đề xuất khi SS = 0 (350)",
    alloc3.Single(a => a.Demand.ProductId == TableA).Shortage == 200 && alloc3.Single(a => a.Demand.ProductId == ChairB).Shortage == 150
    && alloc3.Sum(a => a.Shortage) == case3.TotalPlannedReceipt, AllocText(alloc3));

var sameDay = Run([PlanDemand(Wood, D(11, 20), 100, planId: 1, seq: 1), OrderDemand(Wood, D(11, 20), 100, orderId: 9, seq: 5)],
    materials: [new MrpMaterialInput(Wood, 100, 0, 3)]).Allocations;
Check("Cùng ngày cần: lệnh được cấp trước kế hoạch (dù kế hoạch tạo trước)",
    sameDay.Single(a => a.Demand.Kind == MrpDemandKind.Order).Allocated == 100
    && sameDay.Single(a => a.Demand.Kind == MrpDemandKind.Plan).Shortage == 100);

var sameKind = Run([PlanDemand(Wood, D(11, 20), 100, planId: 7, seq: 7), PlanDemand(Wood, D(11, 20), 100, planId: 3, seq: 3)],
    materials: [new MrpMaterialInput(Wood, 100, 0, 3)]).Allocations;
Check("Cùng ngày, cùng loại: nguồn tạo trước được cấp trước",
    sameKind.Single(a => a.Demand.SourceId == 3).Allocated == 100 && sameKind.Single(a => a.Demand.SourceId == 7).Shortage == 100);

var reordered = Run(Enumerable.Reverse(withKh2), materials: [woodInput]).Allocations;
Check("Kết quả phân bổ không phụ thuộc thứ tự dữ liệu vào",
    reordered.Select(a => (a.Demand.SourceId, a.Demand.ProductId, a.Allocated)).SequenceEqual(alloc.Select(a => (a.Demand.SourceId, a.Demand.ProductId, a.Allocated))));

var sameDayReceipt = Run([PlanDemand(Wood, D(11, 20), 500)], [new MrpScheduledReceipt(Wood, D(11, 20), 500)], [new MrpMaterialInput(Wood, 0, 0, 3)]);
Check("Hàng về đúng ngày cần được dùng cho ngày đó",
    sameDayReceipt.Materials.Single().TotalPlannedReceipt == 0 && sameDayReceipt.Allocations.Single().Shortage == 0
    && sameDayReceipt.Materials.Single().Status == MrpMaterialStatus.CoveredByReceipts);

// ─── 3. Ngày đặt hàng, trễ, thời gian giao (BR-MRP-23..25) ────────────────────
var late = Run([PlanDemand(Wood, D(11, 18), 500)], materials: [woodInput]).Materials.Single();
Check("Dời sản xuất lên 18/11: thiếu 200, ngày đặt 15/11 đã qua → Trễ, sớm nhất có hàng 19/11",
    At(late, D(11, 18)).PlannedReceipt == 200 && At(late, D(11, 18)).PlannedReleaseDate == D(11, 15)
    && At(late, D(11, 18)).IsLate && late.Status == MrpMaterialStatus.Late && late.EarliestAvailableDate == D(11, 19), Por(late));

var noLt = Run(woodDemands, materials: [woodInput with { LeadTimeDays = null }]).Materials.Single();
Check("NVL chưa có thời gian giao: vẫn có số thiếu, không có ngày đặt, trạng thái riêng",
    noLt.TotalPlannedReceipt == 600 && noLt.Buckets.All(b => b.PlannedReleaseDate == null && !b.IsLate)
    && noLt.Status == MrpMaterialStatus.NoLeadTime);

var lt5 = Run([PlanDemand(Wood, D(11, 20), 500)], materials: [woodInput with { LeadTimeDays = 5 }]).Materials.Single();
Check("Đổi thời gian giao 3 → 5 ngày: số đề xuất giữ 200, ngày đặt 15/11 → Trễ",
    lt5.TotalPlannedReceipt == 200 && At(lt5, D(11, 20)).PlannedReleaseDate == D(11, 15) && lt5.Status == MrpMaterialStatus.Late);

var negLt = Run([PlanDemand(Wood, D(11, 20), 500)], materials: [woodInput with { LeadTimeDays = -2 }]).Materials.Single();
Check("Thời gian giao âm coi như chưa khai báo", negLt.LeadTimeDays == null && negLt.Status == MrpMaterialStatus.NoLeadTime);

Func<DateOnly, bool> weekdays = d => d.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday);
var weekend = Run([PlanDemand(Screw, D(11, 22), 1600)], materials: [new MrpMaterialInput(Screw, 0, 0, 1)],
    s: settings with { IsWorkingDay = weekdays }).Materials.Single();
Check("Nghỉ thứ Bảy, Chủ nhật: ngày đặt rơi vào thứ Bảy 21/11 lùi về thứ Sáu 20/11",
    At(weekend, D(11, 22)).PlannedReleaseDate == D(11, 20), Por(weekend));

var buffers = Run([PlanDemand(Wood, D(11, 23), 500)], materials: [new MrpMaterialInput(Wood, 0, 0, 3)],
    s: settings with { IsWorkingDay = weekdays, SafetyDays = 1, InspectionDays = 1 }).Materials.Single();
Check("Đệm 1 + kiểm nhận 1 ngày làm việc qua cuối tuần: cần T2 23/11 → hàng phải tới T5 19/11 → đặt T2 16/11 (không trễ)",
    At(buffers, D(11, 23)).RequiredReceiptDate == D(11, 19) && At(buffers, D(11, 23)).PlannedReleaseDate == D(11, 16)
    && !At(buffers, D(11, 23)).IsLate);

// ─── 4. Dữ liệu biên (BR-MRP-03, 04, 14) ─────────────────────────────────────
var past = Run([PlanDemand(Wood, D(11, 15), 100)], materials: [woodInput]);
Check("Ngày cần đã qua (15/11) tính là hôm nay", past.Materials.Single().Buckets.Single().Date == today
    && past.Materials.Single().Buckets.Single().GrossRequirement == 100 && past.Allocations.Single().EffectiveNeedDate == today);

var overdue = Run([PlanDemand(Wood, D(11, 20), 500)], [new MrpScheduledReceipt(Wood, D(11, 13), 250)], [woodInput]).Materials.Single();
Check("Đơn quá ngày giao mà chưa về: tính là về hôm nay, gắn cờ",
    At(overdue, today).ScheduledReceipt == 250 && overdue.HasOverdueReceipt && overdue.TotalPlannedReceipt == 0);

var outOfPeriod = Run([PlanDemand(Wood, D(12, 20), 999)], [new MrpScheduledReceipt(Wood, D(12, 18), 999)], [woodInput]).Materials.Single();
Check("Nhu cầu và hàng về sau ngày cuối kỳ bị bỏ qua",
    outOfPeriod.TotalGrossRequirement == 0 && outOfPeriod.TotalScheduledReceipt == 0 && outOfPeriod.Buckets.Count == 1);

var summed = Run([PlanDemand(Wood, D(11, 20), 500, planId: 1), PlanDemand(Wood, D(11, 20), 400, planId: 2)], materials: [woodInput]).Materials.Single();
Check("Nhiều nhu cầu cùng NVL, cùng ngày: cộng dồn thành một mốc", At(summed, D(11, 20)).GrossRequirement == 900 && summed.Buckets.Count == 2);

var zero = Run([PlanDemand(Wood, D(11, 20), 0), PlanDemand(Wood, D(11, 21), -5)], materials: [woodInput]);
Check("Số lượng ≤ 0 bị bỏ qua", zero.Allocations.Count == 0 && zero.Materials.Single().TotalGrossRequirement == 0);

var enough = Run([PlanDemand(Wood, D(11, 20), 500)], materials: [woodInput with { OpeningBalance = 600 }]).Materials.Single();
Check("Đủ tồn (600 cho nhu cầu 500): không đề xuất, tồn ngày 20/11 còn 100",
    enough.TotalPlannedReceipt == 0 && At(enough, D(11, 20)).ProjectedBalance == 100 && enough.Status == MrpMaterialStatus.Sufficient);

var negative = Run([PlanDemand(Wood, D(11, 20), 100)], materials: [woodInput with { OpeningBalance = -50 }]);
var negPlan = negative.Materials.Single();
Check("Tồn âm −50: bù 50 ngày chạy rồi 100 ngày 20/11; phân bổ không cấp gì cho nhu cầu",
    At(negPlan, today).PlannedReceipt == 50 && At(negPlan, D(11, 20)).PlannedReceipt == 100
    && negative.Allocations.Single().Allocated == 0 && negative.Allocations.Single().Shortage == 100, Por(negPlan));

var ssOnly = Run([], materials: [new MrpMaterialInput(Wood, 50, 100, 3)]).Materials.Single();
Check("Không có nhu cầu nhưng tồn 50 dưới mức an toàn 100: đề xuất 50 ngày chạy", ssOnly.Buckets.Single().PlannedReceipt == 50);

var idle = Run([], materials: [new MrpMaterialInput(Paint, 10, 0, 2)]).Materials.Single();
Check("NVL chỉ có dữ liệu, không biến động: một dòng ngày chạy, Đủ", idle.Buckets.Count == 1 && idle.Status == MrpMaterialStatus.Sufficient);

var unknown = Run([PlanDemand(Screw, D(11, 20), 30)]).Materials.Single();
Check("NVL không có dữ liệu đầu vào: tồn 0, thiếu đủ nhu cầu, chưa có thời gian giao",
    unknown.OpeningBalance == 0 && unknown.TotalPlannedReceipt == 30 && unknown.Status == MrpMaterialStatus.NoLeadTime);

var threw = false;
try { Run([], s: new MrpSettings(today, D(11, 15))); } catch (ArgumentException) { threw = true; }
Check("Ngày cuối kỳ trước hôm nay → lỗi tham số", threw);

// ─── 5. Gom theo tuần / tháng và làm tròn đề xuất ─────────────────────────────
var series = new List<(DateOnly, decimal)> { (D(11, 16), 10), (D(11, 20), 20), (D(11, 22), 30), (D(11, 23), 40), (D(12, 1), 50) };
var weeks = MrpPolicy.Aggregate(series, MrpPeriod.Week);
Check("Gom tuần (bắt đầu thứ Hai): 16/11 = 60, 23/11 = 40, 30/11 = 50",
    weeks.SequenceEqual([(D(11, 16), 60m), (D(11, 23), 40m), (D(11, 30), 50m)]),
    string.Join("; ", weeks.Select(w => $"{w.PeriodStart:dd/MM}={w.Quantity}")));
var months = MrpPolicy.Aggregate(series, MrpPeriod.Month);
Check("Gom tháng: 11/2026 = 100, 12/2026 = 50", months.SequenceEqual([(D(11, 1), 100m), (D(12, 1), 50m)]));
Check("Tổng theo ngày = theo tuần = theo tháng",
    MrpPolicy.Aggregate(series, MrpPeriod.Day).Sum(x => x.Quantity) == weeks.Sum(x => x.Quantity)
    && weeks.Sum(x => x.Quantity) == months.Sum(x => x.Quantity));
Check("Chủ nhật 22/11 thuộc tuần bắt đầu thứ Hai 16/11", MrpPolicy.PeriodStart(D(11, 22), MrpPeriod.Week) == D(11, 16));
Check("Làm tròn đề xuất lên số nguyên: 252,5 → 253; 253 → 253; 0 → 0",
    MrpPolicy.RoundUpForPurchase(252.5m) == 253 && MrpPolicy.RoundUpForPurchase(253) == 253 && MrpPolicy.RoundUpForPurchase(0) == 0);

var pass = results.Count(r => r.Pass);
var fail = results.Count - pass;
Console.WriteLine($"TỔNG: {results.Count} | PASS: {pass} | FAIL: {fail}");
return fail == 0 ? 0 : 1;
