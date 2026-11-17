using FluentValidation;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Helpers;

/// <summary>Thông báo của luồng kế hoạch sản xuất (UC-PP-01..06).</summary>
public static class ProductionPlanMessages
{
    public const string PlanNotFound = "Không tìm thấy kế hoạch sản xuất.";
    public const string StatusNotAllowed = "Kế hoạch sản xuất không thể thực hiện thao tác này ở trạng thái hiện tại.";
    public const string ApprovalFeatureRequired = "Chỉ người có quyền duyệt kế hoạch sản xuất mới được thực hiện thao tác này.";
    public const string NotApproved = "Chỉ được lập lệnh sản xuất từ kế hoạch đã duyệt."; // BR-PP-16
    public const string ReasonRequired = "Vui lòng nhập lý do.";
    public const string HasActiveOrders =
        "Kế hoạch đã có lệnh sản xuất chưa hủy. Vui lòng hủy các lệnh đó hoặc dùng chức năng Đóng kế hoạch."; // BR-PP-22
    public const string PastPeriodNoteRequired =
        "Kỳ kế hoạch đã kết thúc trước hôm nay. Vui lòng ghi lý do vào ô Ghi chú."; // Q-V1
    public const string QuantityTooLarge = "Số lượng kế hoạch mỗi thành phẩm tối đa 999.999.999,99."; // Q-V7
    public const string DateOutOfRange = "Ngày phải nằm trong khoảng năm 2000 – 2100."; // Q-V8
}

/// <summary>
/// Luật dữ liệu thuần của form lập / sửa kế hoạch (BR-PP-02, 03, 04, 06; V-01, V-07, V-10, V-13). Dùng chung cho Create và Update.
/// <paramref name="today"/> cho phép kiểm thử truyền ngày cố định; mặc định là hôm nay theo giờ Việt Nam.
/// </summary>
public class SaveProductionPlanRequestValidator : AbstractValidator<SaveProductionPlanRequest>
{
    public SaveProductionPlanRequestValidator(Func<DateOnly>? today = null)
    {
        var getToday = today ?? ProductionPlanRules.Today;

        // Tên, ghi chú: đếm độ dài sau khi trim vì handler lưu bản đã trim (V-10)
        RuleFor(x => x.PlanName)
            .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Vui lòng nhập tên kế hoạch.")
            .Must(n => n == null || n.Trim().Length <= ProductionPlanRules.NameMaxLength).WithMessage("Tên kế hoạch tối đa 150 ký tự.");
        RuleFor(x => x.Notes)
            .Must(n => n == null || n.Trim().Length <= ProductionPlanRules.NotesMaxLength).WithMessage("Ghi chú tối đa 500 ký tự.");

        // Kỳ kế hoạch: bắt buộc (V-01), năm hợp lý (V-07), không ngược
        RuleFor(x => x.PeriodStart).NotNull().WithMessage("Vui lòng chọn ngày bắt đầu kỳ kế hoạch.");
        RuleFor(x => x.PeriodEnd).NotNull().WithMessage("Vui lòng chọn ngày kết thúc kỳ kế hoạch.");
        RuleFor(x => x.PeriodStart)
            .Must(d => d == null || ProductionPlanRules.IsDateInRange(d.Value)).WithMessage(ProductionPlanMessages.DateOutOfRange);
        RuleFor(x => x.PeriodEnd)
            .Must(d => d == null || ProductionPlanRules.IsDateInRange(d.Value)).WithMessage(ProductionPlanMessages.DateOutOfRange);
        RuleFor(x => x)
            .Must(x => x.PeriodStart == null || x.PeriodEnd == null || x.PeriodStart <= x.PeriodEnd)
            .WithName("PeriodEnd")
            .WithMessage("Ngày kết thúc kỳ kế hoạch không được trước ngày bắt đầu.");

        // Q-V1: kỳ đã kết thúc trước hôm nay thì bắt buộc ghi lý do vào ghi chú
        RuleFor(x => x)
            .Must(x => !ProductionPlanRules.RequiresPastPeriodNote(x.PeriodEnd, x.Notes, getToday()))
            .WithName("Notes")
            .WithMessage(ProductionPlanMessages.PastPeriodNoteRequired);

        RuleFor(x => x.Items)
            .Must(i => i is { Count: > 0 }).WithMessage("Kế hoạch phải có ít nhất một thành phẩm.")
            .Must(i => i == null || i.Select(l => l.ProductId).Distinct().Count() == i.Count)
            .WithMessage("Mỗi thành phẩm chỉ được có một dòng trong cùng một kế hoạch."); // BR-PP-06 (Q3)

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage("Vui lòng chọn thành phẩm.");
            item.RuleFor(i => i.PlannedQuantity)
                .Must(q => q > 0 && ProductionHelper.HasMaxScale(q, ProductionPolicy.QuantityScale))
                .WithMessage("Số lượng kế hoạch phải lớn hơn 0 và có tối đa 2 chữ số thập phân.")
                .LessThanOrEqualTo(ProductionPlanRules.MaxPlannedQuantity)
                .WithMessage(ProductionPlanMessages.QuantityTooLarge);
            item.RuleFor(i => i.PlannedStartDate).NotNull().WithMessage("Vui lòng chọn ngày bắt đầu của dòng.");
            item.RuleFor(i => i.PlannedEndDate).NotNull().WithMessage("Vui lòng chọn ngày kết thúc của dòng.");
            item.RuleFor(i => i)
                .Must(i => (i.PlannedStartDate == null || ProductionPlanRules.IsDateInRange(i.PlannedStartDate.Value))
                           && (i.PlannedEndDate == null || ProductionPlanRules.IsDateInRange(i.PlannedEndDate.Value)))
                .WithName("PlannedStartDate")
                .WithMessage(ProductionPlanMessages.DateOutOfRange);
            item.RuleFor(i => i)
                .Must(i => i.PlannedStartDate == null || i.PlannedEndDate == null || i.PlannedStartDate <= i.PlannedEndDate)
                .WithName("PlannedEndDate")
                .WithMessage("Ngày kết thúc của dòng không được trước ngày bắt đầu.");
            item.RuleFor(i => i.Notes)
                .Must(n => n == null || n.Trim().Length <= ProductionPlanRules.NotesMaxLength).WithMessage("Ghi chú dòng tối đa 500 ký tự.");
        });

        // BR-PP-04: thời gian của dòng nằm trong kỳ kế hoạch (chỉ kiểm khi đủ ngày; thiếu ngày đã báo ở trên)
        RuleFor(x => x)
            .Must(x => x.PeriodStart == null || x.PeriodEnd == null || x.Items == null
                       || x.Items.All(i => i.PlannedStartDate == null || i.PlannedEndDate == null
                                           || (i.PlannedStartDate >= x.PeriodStart && i.PlannedEndDate <= x.PeriodEnd)))
            .WithName("Items")
            .WithMessage("Thời gian của từng dòng phải nằm trong kỳ kế hoạch.");
    }
}

/// <summary>Chức năng của người dùng hiện tại liên quan tới kế hoạch sản xuất.</summary>
public sealed record PlanUserContext(
    int UserId,
    /// <summary>feat-production-plans: lập, sửa, gửi duyệt, hủy kế hoạch chưa duyệt của mình</summary>
    bool CanPlan,
    /// <summary>feat-production-plan-approval: duyệt, từ chối, sửa sau duyệt, hủy, đóng</summary>
    bool CanApprove,
    /// <summary>feat-prod-plan: lập lệnh sản xuất</summary>
    bool CanCreateOrders);

/// <summary>
/// Ai được làm gì với kế hoạch ở từng trạng thái. Command dùng để chặn, query chi tiết dùng để trả AllowedActions,
/// nên frontend và backend luôn cùng một luật. Trả về thông báo lỗi hoặc null nếu được phép.
/// </summary>
public static class ProductionPlanPermissions
{
    public static async Task<PlanUserContext> LoadAsync(IUserPermissionService permissions, int userId, CancellationToken ct)
    {
        var features = await permissions.GetFeatureCodesAsync(userId, ct);
        bool Has(string id) => features.Contains(FeatureConstants.ToCode(id));
        return new PlanUserContext(userId, Has(FeatureConstants.ProductionPlans), Has(FeatureConstants.ProductionPlanApproval),
            Has("feat-prod-plan"));
    }

    /// <summary>Q-V4: kế hoạch chưa duyệt chỉ người lập hoặc người có quyền duyệt được sửa / gửi duyệt / hủy.</summary>
    private static bool IsOwnerOrApprover(TrxProductionPlan plan, PlanUserContext user) =>
        user.CanApprove || (user.CanPlan && plan.CreatedBy == user.UserId);

    private static string OwnerOnly(string action) =>
        $"Chỉ người lập kế hoạch hoặc người có quyền duyệt mới được {action} kế hoạch này.";

    /// <summary>BR-PP-12 / BR-PP-13 / Q5 / Q-V4: Nháp, Bị từ chối sửa toàn bộ (người lập / người duyệt); Đã duyệt chỉ người duyệt sửa hạn chế.</summary>
    public static string? CheckEdit(TrxProductionPlan plan, PlanUserContext user)
    {
        if (plan.CanEditAll()) return IsOwnerOrApprover(plan, user) ? null : OwnerOnly("sửa");
        if (plan.CanEditLimited()) return user.CanApprove ? null : ProductionPlanMessages.ApprovalFeatureRequired;
        return ProductionPlanMessages.StatusNotAllowed;
    }

    public static string? CheckSubmit(TrxProductionPlan plan, PlanUserContext user) =>
        !plan.CanSubmit() ? ProductionPlanMessages.StatusNotAllowed
        : IsOwnerOrApprover(plan, user) ? null : OwnerOnly("gửi duyệt");

    /// <summary>Q2: người duyệt được duyệt cả kế hoạch do chính mình lập.</summary>
    public static string? CheckApproveOrReject(TrxProductionPlan plan, PlanUserContext user) =>
        !plan.CanApprove() ? ProductionPlanMessages.StatusNotAllowed
        : user.CanApprove ? null : ProductionPlanMessages.ApprovalFeatureRequired;

    /// <summary>
    /// UC-PP-06: kế hoạch chưa duyệt do người lập hoặc người có quyền duyệt hủy;
    /// kế hoạch Đã duyệt chỉ người có quyền duyệt hủy và khi không còn lệnh chưa hủy (BR-PP-22).
    /// </summary>
    public static string? CheckCancel(TrxProductionPlan plan, PlanUserContext user, bool hasActiveOrders)
    {
        if (!plan.CanCancel()) return ProductionPlanMessages.StatusNotAllowed;
        if (plan.IsApproved())
        {
            if (!user.CanApprove) return ProductionPlanMessages.ApprovalFeatureRequired;
            return hasActiveOrders ? ProductionPlanMessages.HasActiveOrders : null;
        }
        return IsOwnerOrApprover(plan, user) ? null : OwnerOnly("hủy");
    }

    public static string? CheckClose(TrxProductionPlan plan, PlanUserContext user) =>
        !plan.CanClose() ? ProductionPlanMessages.StatusNotAllowed
        : user.CanApprove ? null : ProductionPlanMessages.ApprovalFeatureRequired;

    public static string? CheckCreateOrder(TrxProductionPlan plan, PlanUserContext user) =>
        !plan.CanCreateOrder() ? ProductionPlanMessages.NotApproved
        : user.CanCreateOrders ? null : "Bạn không có quyền lập lệnh sản xuất.";
}

public static class ProductionPlanRules
{
    public const int NameMaxLength = 150;
    public const int NotesMaxLength = 500;
    public const int ReasonMaxLength = 200;
    public const int ClientRequestIdMaxLength = 64;

    /// <summary>Q-V7: số lượng kế hoạch tối đa mỗi dòng.</summary>
    public const decimal MaxPlannedQuantity = 999_999_999.99m;

    /// <summary>Q-V8: khoảng năm hợp lệ cho ngày kỳ và ngày dòng.</summary>
    public const int MinYear = 2000;
    public const int MaxYear = 2100;

    /// <summary>Q-V2: loại hàng được đưa vào kế hoạch; hàng chưa có loại coi là thành phẩm (như danh mục hàng hóa).</summary>
    public static readonly string[] ProducibleProductTypes = { "FINISHED", "SEMI_FINISHED" };

    /// <summary>Hôm nay theo giờ Việt Nam.</summary>
    public static DateOnly Today() => DateOnly.FromDateTime(VietnamTime.Now);

    public static bool IsDateInRange(DateOnly d) => d.Year >= MinYear && d.Year <= MaxYear;

    /// <summary>Q-V1: kỳ kết thúc trước hôm nay mà chưa có ghi chú (lý do).</summary>
    public static bool RequiresPastPeriodNote(DateOnly? periodEnd, string? notes, DateOnly today) =>
        periodEnd.HasValue && periodEnd.Value < today && string.IsNullOrWhiteSpace(notes);

    /// <summary>Khóa dùng chung cho mọi thao tác ghi lên một kế hoạch và lệnh thuộc kế hoạch (chống ghi đồng thời).</summary>
    public static string LockKey(int productionPlanId) => $"production-plan:{productionPlanId}";

    /// <summary>Ghi nhận lần ghi gần nhất (Q-V5, G3).</summary>
    public static void Touch(TrxProductionPlan plan, int userId, DateTime now)
    {
        plan.UpdatedAt = now;
        plan.UpdatedBy = userId;
    }

    /// <summary>
    /// So mã phiên bản client gửi với bản trong DB. Cột timestamp lưu tới micro giây nên so theo micro giây.
    /// </summary>
    public static bool IsSameVersion(DateTime expected, DateTime? actual) =>
        actual.HasValue && expected.Ticks / 10 == actual.Value.Ticks / 10;

    public static string ConcurrencyConflict(string? userName, DateTime? at) =>
        $"Kế hoạch đã được {(string.IsNullOrWhiteSpace(userName) ? "người khác" : userName)} cập nhật"
        + (at.HasValue ? $" lúc {at.Value:dd/MM/yyyy HH:mm:ss}" : "")
        + ". Vui lòng tải lại kế hoạch rồi sửa tiếp.";

    /// <summary>
    /// Thành phẩm của kế hoạch phải tồn tại, đang hoạt động (BR-PP-05) và thuộc loại sản xuất được (Q-V2).
    /// Thông báo nêu mã hàng vi phạm (V-08). Trả về thông báo lỗi hoặc null.
    /// </summary>
    public static async Task<string?> ValidatePlanProductsAsync(
        IStockFlowDbContext context, IEnumerable<int> productIds, CancellationToken ct)
    {
        var ids = productIds.Distinct().ToList();
        var products = await context.MstProducts.AsNoTracking()
            .Where(p => ids.Contains(p.ProductId))
            .Select(p => new { p.ProductId, Code = p.ProductCode ?? "", p.IsActive, p.ProductType })
            .ToListAsync(ct);

        var missing = ids.Except(products.Select(p => p.ProductId)).Select(id => $"#{id}");
        var inactive = products.Where(p => p.IsActive == false).Select(p => p.Code);
        var notUsable = missing.Concat(inactive).ToList();
        if (notUsable.Count > 0)
            return $"Thành phẩm không tồn tại hoặc đã ngừng hoạt động: {string.Join(", ", notUsable)}.";

        var wrongType = products
            .Where(p => p.ProductType != null
                        && !ProducibleProductTypes.Contains(p.ProductType.Trim().ToUpperInvariant()))
            .Select(p => p.Code)
            .ToList();
        if (wrongType.Count > 0)
            return $"Chỉ được đưa thành phẩm hoặc bán thành phẩm vào kế hoạch, không đưa nguyên vật liệu: {string.Join(", ", wrongType)}.";
        return null;
    }

    /// <summary>
    /// Kiểm thành phẩm (<see cref="ValidatePlanProductsAsync"/>) và kho nhận đang hoạt động, thuộc quyền người dùng (BR-PP-07).
    /// Trả về thông báo lỗi hoặc null.
    /// </summary>
    public static async Task<string?> ValidateReferencesAsync(
        IStockFlowDbContext context, ICurrentUserService currentUser, IReadOnlyCollection<SaveProductionPlanItemInput> items,
        CancellationToken ct)
    {
        var productError = await ValidatePlanProductsAsync(context, items.Select(i => i.ProductId), ct);
        if (productError != null) return productError;

        var warehouseIds = items.Where(i => i.WarehouseId.HasValue).Select(i => i.WarehouseId!.Value).Distinct().ToList();
        foreach (var warehouseId in warehouseIds)
        {
            if (!await ProductionHelper.IsActiveWarehouseAsync(context, warehouseId, ct))
                return "Kho nhận thành phẩm không tồn tại hoặc đã ngừng hoạt động.";
            if (!await currentUser.HasWarehouseAccessAsync(warehouseId, ct))
                return ProductionMessages.NoWarehouseAccess;
        }
        return null;
    }

    /// <summary>
    /// Kế hoạch đủ điều kiện chuyển bước (gửi duyệt, duyệt): có ít nhất một dòng; thành phẩm còn hoạt động, đúng loại
    /// (V-08, Q-V2); mọi thành phẩm có BOM đang áp dụng (BR-PP-09). Dùng chung cho gửi duyệt và duyệt (R-05) để
    /// kế hoạch đã duyệt luôn lập lệnh được. Trả về thông báo lỗi (nêu mã hàng) hoặc null.
    /// </summary>
    public static async Task<string?> ValidateReadyForApprovalAsync(
        IStockFlowDbContext context, IReadOnlyCollection<int> productIds, CancellationToken ct)
    {
        if (productIds.Count == 0) return "Kế hoạch phải có ít nhất một thành phẩm.";

        var productError = await ValidatePlanProductsAsync(context, productIds, ct);
        if (productError != null) return productError;

        var withoutBom = await ProductsWithoutActiveBomAsync(context, productIds, ct);
        if (withoutBom.Count == 0) return null;
        var ids = withoutBom.ToList();
        var codes = await context.MstProducts.AsNoTracking()
            .Where(p => ids.Contains(p.ProductId))
            .OrderBy(p => p.ProductCode)
            .Select(p => p.ProductCode)
            .ToListAsync(ct);
        return $"{ProductionMessages.NoActiveBom} ({string.Join(", ", codes)})";
    }

    /// <summary>Thành phẩm chưa có BOM đang áp dụng (có ít nhất một dòng NVL) trong danh sách.</summary>
    public static async Task<HashSet<int>> ProductsWithoutActiveBomAsync(
        IStockFlowDbContext context, IEnumerable<int> productIds, CancellationToken ct)
    {
        var ids = productIds.Distinct().ToList();
        var withBom = await context.MstBoms.AsNoTracking()
            .Where(b => ids.Contains(b.ProductId) && b.IsActive == true && b.DtlBomItems.Any())
            .Select(b => b.ProductId)
            .ToListAsync(ct);
        return ids.Except(withBom).ToHashSet();
    }

    /// <summary>
    /// Số đã lập lệnh theo thành phẩm của một kế hoạch (BR-PP-10): tổng số lượng trên dòng lệnh
    /// của các lệnh thuộc kế hoạch, không tính lệnh đã hủy. <paramref name="excludeOrderId"/> dùng khi sửa lệnh.
    /// </summary>
    public static async Task<Dictionary<int, decimal>> OrderedQuantitiesAsync(
        IStockFlowDbContext context, int productionPlanId, int? excludeOrderId, CancellationToken ct)
    {
        var rows = await context.DtlProductionOrderItems.AsNoTracking()
            .Where(i => i.ProductionOrder.ProductionPlanId == productionPlanId
                        && i.ProductionOrder.Status != ProductionOrderStatus.Cancelled
                        && (excludeOrderId == null || i.ProductionOrderId != excludeOrderId))
            .GroupBy(i => i.ProductId)
            .Select(g => new { ProductId = g.Key, Qty = g.Sum(i => i.PlannedQuantity) })
            .ToListAsync(ct);
        return rows.ToDictionary(r => r.ProductId, r => r.Qty);
    }

    /// <summary>
    /// Lệnh thuộc kế hoạch chỉ được chứa thành phẩm của kế hoạch, và số lượng từng thành phẩm không vượt số còn lại
    /// (BR-PP-19, BR-PP-20 — Q7: chặn). Gọi sau khi đã giữ khóa <see cref="LockKey"/>.
    /// </summary>
    public static async Task<string?> ValidateOrderQuantitiesAsync(
        IStockFlowDbContext context, int productionPlanId, IReadOnlyDictionary<int, decimal> orderQuantities,
        int? excludeOrderId, CancellationToken ct)
    {
        var planItems = await context.DtlProductionPlanItems.AsNoTracking()
            .Where(i => i.ProductionPlanId == productionPlanId)
            .Select(i => new { i.ProductId, i.PlannedQuantity, Code = i.Product.ProductCode })
            .ToListAsync(ct);
        var planByProduct = planItems.ToDictionary(i => i.ProductId);
        var ordered = await OrderedQuantitiesAsync(context, productionPlanId, excludeOrderId, ct);

        foreach (var (productId, qty) in orderQuantities)
        {
            if (!planByProduct.TryGetValue(productId, out var line))
                return "Thành phẩm không thuộc kế hoạch sản xuất của lệnh.";
            var remaining = line.PlannedQuantity - ordered.GetValueOrDefault(productId);
            if (qty > remaining)
                return $"Số lượng lập lệnh của thành phẩm {line.Code} vượt số còn lại của kế hoạch ({Math.Max(0, remaining):0.##}).";
        }
        return null;
    }

    /// <summary>
    /// Ghi lý do từ chối / hủy vào cuối ghi chú kế hoạch (không có cột riêng, file 07 mục G2).
    /// Tổng vượt 500 ký tự thì giữ phần cuối (lý do mới nhất).
    /// </summary>
    public static string AppendNote(string? notes, string action, string userName, DateTime at, string reason)
    {
        var entry = $"[{action} {at:dd/MM/yyyy HH:mm} - {userName}] {reason.Trim()}";
        var combined = string.IsNullOrWhiteSpace(notes) ? entry : $"{notes.TrimEnd()}\n{entry}";
        return combined.Length <= NotesMaxLength ? combined : combined[^NotesMaxLength..];
    }

    /// <summary>Lý do bắt buộc, tối đa 200 ký tự. Trả về thông báo lỗi hoặc null.</summary>
    public static string? ValidateReason(string? reason)
    {
        if (string.IsNullOrWhiteSpace(reason)) return ProductionPlanMessages.ReasonRequired;
        if (reason.Trim().Length > ReasonMaxLength) return "Lý do tối đa 200 ký tự.";
        return null;
    }

    public static string? NormalizeText(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
