namespace StockFlow.Application.Features.Roles.Common;

/// <summary>
/// Một chức năng trên navbar (= 1 ô tick trong màn Phân quyền chức năng).
/// </summary>
/// <param name="Id">Mã chức năng phía frontend, VD "feat-pos" (khớp config/navbar.ts)</param>
/// <param name="Module">Phân hệ quyền chính (PermissionConstants), được cấp đủ thao tác khi tick</param>
/// <param name="ExtraModules">Phân hệ phụ cần ghi khi dùng chức năng (VD POS tạo nhanh khách hàng → PARTNER)</param>
public record FeatureDefinition(string Id, string Name, string Module, string[] ExtraModules)
{
    /// <summary>Mã quyền lưu trong sec_permissions, VD feat-purchase-orders → FEAT_PURCHASE_ORDERS</summary>
    public string Code => FeatureConstants.ToCode(Id);
}

/// <summary>
/// Danh sách chức năng navbar được phân quyền theo vai trò. Mục được tick lưu thành mã quyền FEAT_*
/// trong bảng quyền của vai trò (cùng chỗ với các mã MODULE_ACTION), backend chặn API theo các mã này.
/// Giữ khớp với StockFlow_Frontend/src/features/roles/config/navbar.ts.
/// </summary>
public static class FeatureConstants
{
    public const string Prefix = "FEAT_";

    /// <summary>Phân hệ (cột module) của các dòng quyền chức năng trong sec_permissions</summary>
    public const string PermissionModule = "FEATURE";

    /// <summary>
    /// Mã đánh dấu vai trò đã được cấu hình ma trận chức năng (kể cả khi bỏ tick hết),
    /// để phân biệt với vai trò chưa cấu hình (dùng mặc định).
    /// </summary>
    public const string ConfiguredMarker = "FEAT__CONFIGURED";

    private static readonly string[] None = Array.Empty<string>();

    /// <summary>Xem, lập, sửa, gửi duyệt kế hoạch sản xuất.</summary>
    public const string ProductionPlans = "feat-production-plans";

    /// <summary>Duyệt / từ chối, sửa kế hoạch đã duyệt, hủy, đóng kế hoạch sản xuất.</summary>
    public const string ProductionPlanApproval = "feat-production-plan-approval";

    /// <summary>Chạy tính toán và xem hoạch định nhu cầu nguyên vật liệu (MRP).</summary>
    public const string ProductionMrp = "feat-production-mrp";

    /// <summary>Báo cáo tổng quan, doanh thu – lợi nhuận, nhập – xuất – tồn, công nợ (UC-86, 87, 88, 90). Chỉ đọc.</summary>
    public const string Reports = "feat-reports";

    public static readonly List<FeatureDefinition> Features = new()
    {
        new("feat-dashboard", "Tổng quan", "AUTH", None),
        new("feat-staff", "Nhân viên", "AUTH", None),
        new("feat-roles", "Danh mục vai trò", "AUTH", None),
        new("feat-role-matrix", "Phân quyền chức năng", "AUTH", None),
        new("feat-warehouse-perms", "Phân quyền kho", "AUTH", None),

        new("feat-goods", "Danh mục hàng hóa", "GOODS", new[] { "STOCK" }),
        new("feat-price-books", "Thiết lập giá", "GOODS", None),
        new("feat-transfers", "Chuyển hàng", "STOCK", None),
        new("feat-stocktake", "Kiểm kho", "STOCK", None),
        new("feat-disposal", "Xuất hủy", "STOCK", None),

        new("feat-customers", "Khách hàng", "PARTNER", new[] { "FIN" }),

        new("feat-pos", "Bán hàng", "SALES", new[] { "PARTNER", "FIN" }),
        new("feat-sales-booking", "Đặt hàng", "SALES", None),
        new("feat-invoices", "Hóa đơn", "SALES", new[] { "FIN" }),
        new("feat-sales-returns", "Trả hàng", "SALES", None),
        // Approval Inbox (UC-64): duyệt yêu cầu vượt hạn mức. Mặc định chỉ Manager/Admin.
        new("feat-credit-approvals", "Duyệt hạn mức", "SALES", None),

        new("feat-purchase-orders", "Đặt hàng nhập", "PURCHASE", new[] { "PARTNER", "GOODS", "FIN" }),
        new("feat-purchase", "Nhập hàng", "PURCHASE", new[] { "PARTNER", "GOODS", "FIN" }),
        new("feat-purchase-returns", "Trả hàng nhập", "PURCHASE", new[] { "FIN" }),
        new("feat-suppliers", "Nhà cung cấp", "PARTNER", new[] { "FIN" }),

        // Sản xuất (UC-44–50, UC-58–61): xem lệnh; lập / điều hành lệnh (Manager); xuất NVL, nhập thành phẩm (Production Accountant)
        new("feat-prod", "Lệnh sản xuất", "PROD", None),
        new("feat-prod-plan", "Lập lệnh sản xuất", "PROD", None),
        new("feat-prod-issue", "Xuất NVL sản xuất", "PROD", None),
        new("feat-prod-receipt", "Nhập thành phẩm", "PROD", None),
        // Kế hoạch sản xuất (UC-PP-01..06): lập / gửi duyệt (Manager, Production Accountant); duyệt, đóng, sửa sau duyệt (Manager).
        // Tách bằng chức năng vì mọi chức năng phân hệ PROD đều được đủ PROD_* (DeriveModulePermissionCodes).
        new(ProductionPlans, "Kế hoạch sản xuất", "PROD", None),
        new(ProductionPlanApproval, "Duyệt kế hoạch sản xuất", "PROD", None),
        new(ProductionMrp, "Hoạch định NVL (MRP)", "PROD", None),

        new("feat-bom", "Định mức BOM", "BOM", None),

        // Báo cáo (UC-86, 87, 88, 90): mặc định Manager / Admin; API cần FIN_READ
        new(Reports, "Báo cáo", "FIN", None),
    };

    /// <summary>Admin luôn giữ quyền vào màn phân quyền (không tự khóa mình)</summary>
    public static readonly string[] AdminLockedFeatureIds = { "feat-roles", "feat-role-matrix" };

    private static readonly string[] GoodsFeats = { "feat-goods", "feat-price-books" };
    private static readonly string[] StockFeats = { "feat-transfers", "feat-stocktake", "feat-disposal" };
    private static readonly string[] SalesFeats = { "feat-pos", "feat-sales-booking", "feat-invoices", "feat-sales-returns" };
    private static readonly string[] PurchaseFeats = { "feat-purchase-orders", "feat-purchase", "feat-purchase-returns", "feat-suppliers" };
    private static readonly string[] ProdFeats =
        { "feat-prod", "feat-prod-plan", "feat-prod-issue", "feat-prod-receipt", ProductionPlans, ProductionPlanApproval, ProductionMrp };
    /// <summary>
    /// Production Accountant: xem lệnh, xuất NVL, nhập thành phẩm; không lập lệnh, không sửa BOM (bảng 3.1.6).
    /// Được lập / gửi duyệt kế hoạch sản xuất, không duyệt (Q1, Q2 chốt 14/11/2026). Được chạy / xem MRP (Q10).
    /// </summary>
    private static readonly string[] ProdAccountantFeats = { "feat-prod", "feat-prod-issue", "feat-prod-receipt", ProductionPlans, ProductionMrp };

    public static string ToCode(string featureId)
    {
        var id = featureId.Trim();
        if (id.StartsWith("feat-", StringComparison.OrdinalIgnoreCase)) id = id[5..];
        return Prefix + id.Replace('-', '_').ToUpperInvariant();
    }

    public static bool IsFeatureCode(string? permissionCode) =>
        !string.IsNullOrEmpty(permissionCode) && permissionCode.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase);

    public static FeatureDefinition? FindById(string featureId) =>
        Features.FirstOrDefault(f => f.Id.Equals(featureId.Trim(), StringComparison.OrdinalIgnoreCase));

    public static FeatureDefinition? FindByCode(string code) =>
        Features.FirstOrDefault(f => f.Code.Equals(code, StringComparison.OrdinalIgnoreCase));

    /// <summary>Chức năng mặc định của vai trò chưa được cấu hình (khớp DEFAULT_ROLE_FEATURE_PERMS phía frontend)</summary>
    public static List<string> GetDefaultFeatureIds(string roleCode)
    {
        IEnumerable<string> ids = PermissionConstants.ToRoleCode(roleCode) switch
        {
            "ROLE_ADMIN" => Features.Select(f => f.Id),
            "ROLE_MANAGER" => GoodsFeats.Concat(StockFeats).Append("feat-customers").Concat(SalesFeats)
                .Append("feat-credit-approvals")
                .Concat(PurchaseFeats).Concat(ProdFeats).Append("feat-bom").Append(Reports),
            "ROLE_SALES" => new[] { "feat-goods", "feat-customers" }.Concat(SalesFeats),
            "ROLE_WAREHOUSE" => new[] { "feat-goods" }.Concat(StockFeats).Concat(PurchaseFeats),
            "ROLE_PRODUCTION" => new[] { "feat-goods" }.Concat(ProdAccountantFeats),
            _ => None,
        };
        return ids.Distinct().ToList();
    }

    /// <summary>
    /// Quyền phân hệ suy ra từ các chức năng được tick: xem (READ) mọi phân hệ nghiệp vụ để tra cứu chéo
    /// (VD POS cần đọc hàng hóa, khách hàng); đủ thao tác trên phân hệ của chức năng được tick và phân hệ phụ của nó.
    /// Việc ghi dữ liệu còn bị chặn thêm theo từng chức năng bằng [RequireFeature].
    /// </summary>
    public static HashSet<string> DeriveModulePermissionCodes(IEnumerable<string> featureIds)
    {
        var actions = new[] { "READ", "CREATE", "UPDATE", "DELETE", "APPROVE" };
        var fullModules = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var id in featureIds)
        {
            var f = FindById(id);
            if (f == null) continue;
            fullModules.Add(f.Module);
            fullModules.UnionWith(f.ExtraModules);
        }

        var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var m in PermissionConstants.Modules)
        {
            if (fullModules.Contains(m.ModuleKey))
            {
                foreach (var a in actions) codes.Add($"{m.ModuleKey}_{a}");
            }
            else
            {
                codes.Add($"{m.ModuleKey}_READ");
            }
        }
        return codes;
    }
}
