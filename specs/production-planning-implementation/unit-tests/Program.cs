// Kiểm thử đơn vị luật thuần của Kế hoạch sản xuất (UC-PP-01..06). Không cần database.
// Mỗi ca in PASS / FAIL; mã thoát 1 nếu có ca lỗi.

using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

var results = new List<(string Id, string Name, bool Pass, string Detail)>();

void Check(string id, string name, bool pass, string detail = "")
{
    results.Add((id, name, pass, detail));
    Console.WriteLine($"{(pass ? "PASS" : "FAIL")} {id} {name}{(string.IsNullOrEmpty(detail) ? "" : " -> " + detail)}");
}

TrxProductionPlan Plan(string status, int createdBy = 10) => new() { Status = status, CreatedBy = createdBy };

// ─── 1. Chuyển trạng thái (TrxProductionPlan.Status.cs) ──────────────────────
var expected = new Dictionary<string, (bool EditAll, bool EditLimited, bool Submit, bool Approve, bool Cancel, bool Close, bool CreateOrder)>
{
    [ProductionPlanStatus.Draft] = (true, false, true, false, true, false, false),
    [ProductionPlanStatus.PendingApproval] = (false, false, false, true, true, false, false),
    [ProductionPlanStatus.Approved] = (false, true, false, false, true, true, true),
    [ProductionPlanStatus.Rejected] = (true, false, true, false, true, false, false),
    [ProductionPlanStatus.Closed] = (false, false, false, false, false, false, false),
    [ProductionPlanStatus.Cancelled] = (false, false, false, false, false, false, false),
};
var n = 1;
foreach (var (status, e) in expected)
{
    var p = Plan(status);
    var actual = (p.CanEditAll(), p.CanEditLimited(), p.CanSubmit(), p.CanApprove(), p.CanCancel(), p.CanClose(), p.CanCreateOrder());
    Check($"UT-{n++:00}", $"Bảng Can*() đúng với trạng thái {status}", actual == e, actual.ToString());
    if (p.CanApprove() != p.CanReject()) Check($"UT-{n++:00}", $"CanReject = CanApprove ở {status}", false);
}
Check($"UT-{n++:00}", "Trạng thái so khớp không phân biệt hoa thường", Plan("approved").CanCreateOrder());

var plan = Plan(ProductionPlanStatus.Draft);
plan.MarkPendingApproval(); var s1 = plan.Status;
plan.MarkRejected(); var s2 = plan.Status;
plan.MarkPendingApproval(); plan.MarkApproved(); var s3 = plan.Status;
plan.MarkClosed(); var s4 = plan.Status;
Check($"UT-{n++:00}", "Mark*: Nháp → Chờ duyệt → Bị từ chối → Chờ duyệt → Đã duyệt → Đã đóng",
    s1 == "PENDING_APPROVAL" && s2 == "REJECTED" && s3 == "APPROVED" && s4 == "CLOSED", $"{s1},{s2},{s3},{s4}");
var c = Plan(ProductionPlanStatus.Draft); c.MarkCancelled();
Check($"UT-{n++:00}", "MarkCancelled → CANCELLED", c.Status == "CANCELLED");
Check($"UT-{n++:00}", "Mọi giá trị trạng thái vừa cột varchar(20)", ProductionPlanStatus.All.All(x => x.Length <= 20));

// ─── 2. Validator form kế hoạch (BR-PP-02/03/04/06) ──────────────────────────
// "Hôm nay" cố định 15/11/2026 để ca kiểm thử không đổi kết quả theo ngày chạy (Q-V1 phụ thuộc hôm nay)
var fixedToday = new DateOnly(2026, 11, 15);
var validator = new SaveProductionPlanRequestValidator(() => fixedToday);
var d = (int m, int day) => new DateOnly(2026, m, day);
SaveProductionPlanItemInput Line(int productId, decimal qty, DateOnly? start = null, DateOnly? end = null, string? notes = null) =>
    new(productId, qty, start ?? d(11, 20), end ?? d(12, 20), null, notes);
SaveProductionPlanRequest Req(string name = "KH thang 12", DateOnly? ps = null, DateOnly? pe = null, string? notes = null,
    params SaveProductionPlanItemInput[] items) =>
    new(name, ps ?? d(11, 15), pe ?? d(12, 31), notes, items.ToList());

(bool Valid, string Errors) V(SaveProductionPlanRequest r)
{
    var res = validator.Validate(r);
    return (res.IsValid, string.Join(" | ", res.Errors.Select(x => x.ErrorMessage)));
}

var vOk = V(Req(items: [Line(1, 100), Line(2, 50.25m)]));
Check($"UT-{n++:00}", "Kế hoạch hợp lệ (2 thành phẩm) qua validator", vOk.Valid, vOk.Errors);
var cases = new (string Name, SaveProductionPlanRequest Req, string Expect)[]
{
    ("Tên rỗng", Req(name: "  ", items: [Line(1, 10)]), "tên kế hoạch"),
    ("Tên 151 ký tự", Req(name: new string('a', 151), items: [Line(1, 10)]), "150 ký tự"),
    ("Kỳ ngược", Req(ps: d(12, 31), pe: d(11, 15), items: [Line(1, 10, d(12, 31), d(12, 31))]), "kỳ kế hoạch không được trước"),
    ("Không có dòng", Req(items: []), "ít nhất một thành phẩm"),
    ("Trùng thành phẩm", Req(items: [Line(1, 10), Line(1, 20)]), "một dòng"),
    ("Số lượng 0", Req(items: [Line(1, 0)]), "lớn hơn 0"),
    ("Số lượng âm", Req(items: [Line(1, -5)]), "lớn hơn 0"),
    ("Số lượng 3 chữ số thập phân", Req(items: [Line(1, 10.123m)]), "2 chữ số thập phân"),
    ("Ngày dòng ngược", Req(items: [Line(1, 10, d(12, 20), d(11, 20))]), "dòng không được trước"),
    ("Dòng bắt đầu trước kỳ", Req(items: [Line(1, 10, d(11, 1), d(11, 20))]), "nằm trong kỳ"),
    ("Dòng kết thúc sau kỳ", Req(items: [Line(1, 10, d(11, 20), new DateOnly(2027, 1, 5))]), "nằm trong kỳ"),
    ("Mã thành phẩm 0", Req(items: [Line(0, 10)]), "chọn thành phẩm"),
    ("Ghi chú dòng 501 ký tự", Req(items: [Line(1, 10, notes: new string('x', 501))]), "500 ký tự"),
    ("Ghi chú kế hoạch 501 ký tự", Req(notes: new string('x', 501), items: [Line(1, 10)]), "500 ký tự"),
};
foreach (var (name, r, expect) in cases)
{
    var v = V(r);
    Check($"UT-{n++:00}", $"Validator chặn: {name}", !v.Valid && v.Errors.Contains(expect, StringComparison.OrdinalIgnoreCase), v.Errors);
}
var vBig = V(Req(items: [Line(1, 999_999_999.99m)]));
Check($"UT-{n++:00}", "Số lượng đúng mức tối đa 999.999.999,99 hợp lệ (Q-V7)", vBig.Valid, vBig.Errors);
var vEdge = V(Req(items: [Line(1, 1, d(11, 15), d(12, 31))]));
Check($"UT-{n++:00}", "Dòng trùng đúng biên kỳ (ngày đầu / cuối kỳ) hợp lệ", vEdge.Valid, vEdge.Errors);

// Bổ sung theo 06-validation-review (V-01, V-07, V-10, Q-V1, Q-V7)
var casesV = new (string Name, SaveProductionPlanRequest Req, string Expect)[]
{
    ("Thiếu ngày bắt đầu kỳ (V-01)", new SaveProductionPlanRequest("KH", null, d(12, 31), null, [Line(1, 10)]), "ngày bắt đầu kỳ"),
    ("Thiếu ngày kết thúc kỳ (V-01)", new SaveProductionPlanRequest("KH", d(11, 15), null, null, [Line(1, 10)]), "ngày kết thúc kỳ"),
    ("Thiếu ngày bắt đầu dòng (V-01)", Req(items: [new SaveProductionPlanItemInput(1, 10, null, d(12, 20), null, null)]), "ngày bắt đầu của dòng"),
    ("Thiếu ngày kết thúc dòng (V-01)", Req(items: [new SaveProductionPlanItemInput(1, 10, d(11, 20), null, null, null)]), "ngày kết thúc của dòng"),
    ("Năm 1999 (V-07)", Req(ps: new DateOnly(1999, 12, 1), items: [Line(1, 10, new DateOnly(1999, 12, 2), new DateOnly(1999, 12, 3))]), "2000 – 2100"),
    ("Năm 2101 (V-07)", Req(pe: new DateOnly(2101, 1, 1), items: [Line(1, 10)]), "2000 – 2100"),
    ("Số lượng 1.000.000.000 vượt mức tối đa (Q-V7)", Req(items: [Line(1, 1_000_000_000m)]), "999.999.999,99"),
    ("Kỳ đã qua, không ghi chú (Q-V1)", Req(ps: d(10, 1), pe: d(10, 31), items: [Line(1, 10, d(10, 5), d(10, 20))]), "đã kết thúc trước hôm nay"),
    ("Kỳ đã qua, ghi chú chỉ dấu cách (Q-V1)", Req(ps: d(10, 1), pe: d(10, 31), notes: "   ", items: [Line(1, 10, d(10, 5), d(10, 20))]), "đã kết thúc trước hôm nay"),
};
foreach (var (name, r, expect) in casesV)
{
    var v = V(r);
    Check($"UT-{n++:00}", $"Validator chặn: {name}", !v.Valid && v.Errors.Contains(expect, StringComparison.OrdinalIgnoreCase), v.Errors);
}
var vPastOk = V(Req(ps: d(10, 1), pe: d(10, 31), notes: "Nhap bu ke hoach thang 10", items: [Line(1, 10, d(10, 5), d(10, 20))]));
Check($"UT-{n++:00}", "Kỳ đã qua có ghi lý do → hợp lệ (Q-V1)", vPastOk.Valid, vPastOk.Errors);
var vToday = V(Req(ps: d(11, 1), pe: fixedToday, items: [Line(1, 10, d(11, 2), fixedToday)]));
Check($"UT-{n++:00}", "Kỳ kết thúc đúng hôm nay không coi là quá khứ", vToday.Valid, vToday.Errors);
// Ngày kết thúc không bao giờ trước ngày bắt đầu (kỳ và dòng); bằng nhau thì cho phép
var vSameDay = V(Req(ps: d(11, 20), pe: d(11, 20), items: [Line(1, 10, d(11, 20), d(11, 20))]));
Check($"UT-{n++:00}", "Kỳ và dòng có ngày bắt đầu = ngày kết thúc → hợp lệ", vSameDay.Valid, vSameDay.Errors);
var vPeriodOneDay = V(Req(ps: d(11, 21), pe: d(11, 20), items: [Line(1, 10, d(11, 20), d(11, 20))]));
Check($"UT-{n++:00}", "Kỳ: ngày kết thúc trước ngày bắt đầu 1 ngày → chặn",
    !vPeriodOneDay.Valid && vPeriodOneDay.Errors.Contains("kỳ kế hoạch không được trước ngày bắt đầu"), vPeriodOneDay.Errors);
var vLineOneDay = V(Req(items: [Line(1, 10, d(11, 21), d(11, 20))]));
Check($"UT-{n++:00}", "Dòng: ngày kết thúc trước ngày bắt đầu 1 ngày → chặn",
    !vLineOneDay.Valid && vLineOneDay.Errors.Contains("của dòng không được trước ngày bắt đầu"), vLineOneDay.Errors);
var vTrim = V(Req(name: " " + new string('a', 150) + " ", items: [Line(1, 10)]));
Check($"UT-{n++:00}", "Tên 150 ký tự + dấu cách hai đầu hợp lệ (đếm sau trim, V-10)", vTrim.Valid, vTrim.Errors);

// ─── 3. Quyền theo trạng thái (ProductionPlanPermissions) ─────────────────────
var accountant = new PlanUserContext(10, CanPlan: true, CanApprove: false, CanCreateOrders: false);
var otherAccountant = new PlanUserContext(11, CanPlan: true, CanApprove: false, CanCreateOrders: false);
var manager = new PlanUserContext(20, CanPlan: true, CanApprove: true, CanCreateOrders: true);
var orderOnly = new PlanUserContext(30, CanPlan: false, CanApprove: false, CanCreateOrders: true);
bool Ok(string? err) => err == null;

Check($"UT-{n++:00}", "Kế toán SX sửa kế hoạch Nháp", Ok(ProductionPlanPermissions.CheckEdit(Plan("DRAFT"), accountant)));
Check($"UT-{n++:00}", "Kế toán SX sửa kế hoạch Bị từ chối", Ok(ProductionPlanPermissions.CheckEdit(Plan("REJECTED"), accountant)));
Check($"UT-{n++:00}", "Kế toán SX không sửa kế hoạch Đã duyệt (Q5)", !Ok(ProductionPlanPermissions.CheckEdit(Plan("APPROVED"), accountant)));
Check($"UT-{n++:00}", "Manager sửa hạn chế kế hoạch Đã duyệt", Ok(ProductionPlanPermissions.CheckEdit(Plan("APPROVED"), manager)));
Check($"UT-{n++:00}", "Không ai sửa kế hoạch Chờ duyệt / Đã đóng / Đã hủy",
    new[] { "PENDING_APPROVAL", "CLOSED", "CANCELLED" }.All(st => !Ok(ProductionPlanPermissions.CheckEdit(Plan(st), manager))));
Check($"UT-{n++:00}", "Người chỉ có quyền lập lệnh không sửa kế hoạch Nháp", !Ok(ProductionPlanPermissions.CheckEdit(Plan("DRAFT"), orderOnly)));
Check($"UT-{n++:00}", "Gửi duyệt từ Nháp / Bị từ chối",
    Ok(ProductionPlanPermissions.CheckSubmit(Plan("DRAFT"), accountant)) && Ok(ProductionPlanPermissions.CheckSubmit(Plan("REJECTED"), accountant)));
Check($"UT-{n++:00}", "Không gửi duyệt lại kế hoạch Chờ duyệt / Đã duyệt",
    !Ok(ProductionPlanPermissions.CheckSubmit(Plan("PENDING_APPROVAL"), accountant)) && !Ok(ProductionPlanPermissions.CheckSubmit(Plan("APPROVED"), manager)));
Check($"UT-{n++:00}", "Kế toán SX không duyệt", !Ok(ProductionPlanPermissions.CheckApproveOrReject(Plan("PENDING_APPROVAL"), accountant)));
Check($"UT-{n++:00}", "Manager duyệt kế hoạch Chờ duyệt, kể cả do mình lập (Q2)",
    Ok(ProductionPlanPermissions.CheckApproveOrReject(Plan("PENDING_APPROVAL", createdBy: 20), manager)));
Check($"UT-{n++:00}", "Không duyệt kế hoạch Nháp / Đã duyệt",
    !Ok(ProductionPlanPermissions.CheckApproveOrReject(Plan("DRAFT"), manager)) && !Ok(ProductionPlanPermissions.CheckApproveOrReject(Plan("APPROVED"), manager)));
Check($"UT-{n++:00}", "Người lập hủy kế hoạch Nháp của mình", Ok(ProductionPlanPermissions.CheckCancel(Plan("DRAFT", 10), accountant, false)));
Check($"UT-{n++:00}", "Kế toán SX khác không hủy kế hoạch Nháp của người khác", !Ok(ProductionPlanPermissions.CheckCancel(Plan("DRAFT", 10), otherAccountant, false)));
Check($"UT-{n++:00}", "Manager hủy kế hoạch Chờ duyệt của người khác", Ok(ProductionPlanPermissions.CheckCancel(Plan("PENDING_APPROVAL", 10), manager, false)));
Check($"UT-{n++:00}", "Kế toán SX không hủy kế hoạch Đã duyệt", !Ok(ProductionPlanPermissions.CheckCancel(Plan("APPROVED", 10), accountant, false)));
var cancelActive = ProductionPlanPermissions.CheckCancel(Plan("APPROVED"), manager, hasActiveOrders: true);
Check($"UT-{n++:00}", "Không hủy kế hoạch Đã duyệt còn lệnh chưa hủy (BR-PP-22)", cancelActive == ProductionPlanMessages.HasActiveOrders, cancelActive ?? "null");
Check($"UT-{n++:00}", "Manager hủy kế hoạch Đã duyệt khi không còn lệnh", Ok(ProductionPlanPermissions.CheckCancel(Plan("APPROVED"), manager, false)));
Check($"UT-{n++:00}", "Không hủy kế hoạch Đã đóng / Đã hủy",
    !Ok(ProductionPlanPermissions.CheckCancel(Plan("CLOSED"), manager, false)) && !Ok(ProductionPlanPermissions.CheckCancel(Plan("CANCELLED"), manager, false)));
Check($"UT-{n++:00}", "Chỉ người duyệt đóng kế hoạch Đã duyệt",
    Ok(ProductionPlanPermissions.CheckClose(Plan("APPROVED"), manager)) && !Ok(ProductionPlanPermissions.CheckClose(Plan("APPROVED"), accountant)));
Check($"UT-{n++:00}", "Không đóng kế hoạch Nháp", !Ok(ProductionPlanPermissions.CheckClose(Plan("DRAFT"), manager)));
Check($"UT-{n++:00}", "Lập lệnh: chỉ kế hoạch Đã duyệt (BR-PP-16)",
    ProductionPlanPermissions.CheckCreateOrder(Plan("PENDING_APPROVAL"), manager) == ProductionPlanMessages.NotApproved
    && ProductionPlanPermissions.CheckCreateOrder(Plan("CLOSED"), manager) == ProductionPlanMessages.NotApproved);
Check($"UT-{n++:00}", "Lập lệnh: cần chức năng Lập lệnh sản xuất",
    Ok(ProductionPlanPermissions.CheckCreateOrder(Plan("APPROVED"), orderOnly)) && !Ok(ProductionPlanPermissions.CheckCreateOrder(Plan("APPROVED"), accountant)));
// Q-V4: kế hoạch chưa duyệt chỉ người lập hoặc người duyệt được sửa / gửi duyệt
Check($"UT-{n++:00}", "Kế toán SX khác không sửa kế hoạch Nháp của người khác (Q-V4)",
    !Ok(ProductionPlanPermissions.CheckEdit(Plan("DRAFT", 10), otherAccountant))
    && !Ok(ProductionPlanPermissions.CheckEdit(Plan("REJECTED", 10), otherAccountant)));
Check($"UT-{n++:00}", "Kế toán SX khác không gửi duyệt kế hoạch của người khác (Q-V4)",
    !Ok(ProductionPlanPermissions.CheckSubmit(Plan("DRAFT", 10), otherAccountant)));
Check($"UT-{n++:00}", "Người duyệt sửa / gửi duyệt được kế hoạch Nháp của người khác",
    Ok(ProductionPlanPermissions.CheckEdit(Plan("DRAFT", 10), manager)) && Ok(ProductionPlanPermissions.CheckSubmit(Plan("DRAFT", 10), manager)));

// ─── 4. Lý do từ chối / hủy (K7) ────────────────────────────────────────────
var at = new DateTime(2026, 11, 15, 8, 5, 0);
var note1 = ProductionPlanRules.AppendNote("Ghi chu", "Từ chối", "Nguyễn Văn A", at, "  Sai so luong  ");
Check($"UT-{n++:00}", "Ghi lý do: nối dòng mới, định dạng [Hành động dd/MM/yyyy HH:mm - Tên] lý do",
    note1 == "Ghi chu\n[Từ chối 15/11/2026 08:05 - Nguyễn Văn A] Sai so luong", note1.Replace("\n", "\\n"));
var note2 = ProductionPlanRules.AppendNote(null, "Hủy", "B", at, "x");
Check($"UT-{n++:00}", "Ghi lý do khi ghi chú rỗng", note2 == "[Hủy 15/11/2026 08:05 - B] x", note2);
var longNote = ProductionPlanRules.AppendNote(new string('a', 490), "Từ chối", "B", at, "LY DO MOI");
Check($"UT-{n++:00}", "Ghi chú vượt 500 ký tự: giữ 500 ký tự cuối, còn lý do mới nhất",
    longNote.Length == 500 && longNote.EndsWith("LY DO MOI"), $"len={longNote.Length}");
Check($"UT-{n++:00}", "Lý do bắt buộc", ProductionPlanRules.ValidateReason(null) != null && ProductionPlanRules.ValidateReason("   ") != null);
Check($"UT-{n++:00}", "Lý do tối đa 200 ký tự",
    ProductionPlanRules.ValidateReason(new string('x', 201)) != null && ProductionPlanRules.ValidateReason(new string('x', 200)) == null);
Check($"UT-{n++:00}", "Khóa theo kế hoạch tách biệt từng kế hoạch",
    ProductionPlanRules.LockKey(1) == "production-plan:1" && ProductionPlanRules.LockKey(1) != ProductionPlanRules.LockKey(2));

// ─── 5. Công thức nhu cầu NVL dùng cho kế hoạch (BR-31, BR-PP-14) ─────────────
Check($"UT-{n++:00}", "Nhu cầu = SL × định mức × (1 + hao hụt): 100 × 0,5 × 1,1 = 55",
    ProductionPolicy.CalculateRequirement(100, 0.5m, 10) == 55m, ProductionPolicy.CalculateRequirement(100, 0.5m, 10).ToString());
Check($"UT-{n++:00}", "Cộng dồn 2 thành phẩm dùng chung NVL: 100 × 2 + 50 × 1 × 1,05 = 252,5",
    ProductionPolicy.CalculateRequirement(100, 2, 0) + ProductionPolicy.CalculateRequirement(50, 1, 5) == 252.5m);
// V-04: nhu cầu tràn numeric(18,2) / tràn decimal được phát hiện thay vì lỗi khi lưu
Check($"UT-{n++:00}", "Nhu cầu 1e15 × 100 vượt numeric(18,2) → TryCalculate trả false (V-04)",
    !ProductionPolicy.TryCalculateRequirement(1_000_000_000_000_000m, 100, 0, out _));
Check($"UT-{n++:00}", "Tràn kiểu decimal không ném lỗi → TryCalculate trả false (V-04)",
    !ProductionPolicy.TryCalculateRequirement(9_999_999_999_999_999.99m, 99_999_999_999_999.9999m, 100, out _));
Check($"UT-{n++:00}", "Nhu cầu bình thường → TryCalculate trả true đúng giá trị",
    ProductionPolicy.TryCalculateRequirement(999_999_999.99m, 2, 0, out var okReq) && okReq == 1_999_999_999.98m, okReq.ToString());

// ─── 6. Mã phiên bản phát hiện sửa đồng thời (Q-V5) ──────────────────────────
var ver = new DateTime(2026, 11, 15, 10, 6, 38).AddTicks(3380551); // 7 chữ số; DB lưu tới micro giây
Check($"UT-{n++:00}", "Cùng phiên bản (khác phần dưới micro giây) → trùng", ProductionPlanRules.IsSameVersion(ver, ver.AddTicks(-1)));
Check($"UT-{n++:00}", "Khác phiên bản → không trùng", !ProductionPlanRules.IsSameVersion(ver, ver.AddMilliseconds(1)));
Check($"UT-{n++:00}", "DB chưa có phiên bản (dữ liệu cũ) mà client gửi → không trùng", !ProductionPlanRules.IsSameVersion(ver, null));
var touched = Plan("DRAFT"); ProductionPlanRules.Touch(touched, 7, ver);
Check($"UT-{n++:00}", "Touch ghi người và thời điểm cập nhật", touched.UpdatedAt == ver && touched.UpdatedBy == 7);

var pass = results.Count(r => r.Pass);
var fail = results.Count - pass;
Console.WriteLine($"TỔNG: {results.Count} | PASS: {pass} | FAIL: {fail}");
return fail == 0 ? 0 : 1;
