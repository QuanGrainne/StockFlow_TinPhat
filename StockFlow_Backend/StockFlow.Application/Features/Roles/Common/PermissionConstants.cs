namespace StockFlow.Application.Features.Roles.Common;

public record ModuleMetadata(
    string Id,
    string Stt,
    string Name,
    string ModuleKey,
    string DisplayCode,
    string Description
);

public static class PermissionConstants
{
    public static readonly List<ModuleMetadata> Modules = new()
    {
        new("MOD-01", "01", "Tài khoản & RBAC", "AUTH", "[AUTH]", "Quản lý người dùng, vai trò và phân quyền kho"),
        new("MOD-02", "02", "Cấu hình Định mức BOM", "BOM", "[BOM]", "Định mức nguyên vật liệu sản xuất và công thức phối liệu"),
        new("MOD-03", "03", "Đối tác & Nợ", "PARTNER", "[PARTNER]", "Khách hàng, nhà cung cấp và hạn mức công nợ"),
        new("MOD-04", "04", "Mua hàng & Nhập", "PURCHASE", "[PURCHASE]", "Đơn mua hàng PO, tiếp nhận và phân bổ chi phí"),
        new("MOD-05", "05", "Bán hàng & Xuất", "SALES", "[SALES]", "Đơn hàng chờ, gộp đơn và lập phiếu xuất bán"),
        new("MOD-06", "06", "Quản lý kho", "STOCK", "[STOCK]", "Xuất nhập tồn, chuyển kho và biên bản kiểm kê"),
        new("MOD-07", "07", "Quản lý sản xuất", "PROD", "[PROD]", "Lệnh sản xuất, xuất vật tư và nhập thành phẩm"),
        new("MOD-08", "08", "Kế toán tài chính", "FIN", "[FIN]", "Thu chi, sổ quỹ và đồng bộ kế toán MISA SME"),
        new("MOD-09", "09", "Danh mục Hàng hóa", "GOODS", "[GOODS]", "Tra cứu mã hàng, tồn khả dụng ATP, thẻ kho và giá niêm yết")
    };

    public static string ToRoleCode(string roleName)
    {
        return roleName.ToUpperInvariant() switch
        {
            "ADMIN" or "ROLE_ADMIN" => "ROLE_ADMIN",
            "MANAGER" or "ROLE_MANAGER" => "ROLE_MANAGER",
            "SALESSTAFF" or "SALES" or "ROLE_SALES" => "ROLE_SALES",
            "WAREHOUSESTAFF" or "WAREHOUSE" or "ROLE_WAREHOUSE" => "ROLE_WAREHOUSE",
            "PRODUCTIONSTAFF" or "PRODUCTION" or "ROLE_PRODUCTION" => "ROLE_PRODUCTION",
            _ => roleName.StartsWith("ROLE_", StringComparison.OrdinalIgnoreCase)
                ? roleName.ToUpperInvariant()
                : $"ROLE_{roleName.ToUpperInvariant()}"
        };
    }

    public static string ToRoleDisplayName(string roleName)
    {
        return roleName.ToUpperInvariant() switch
        {
            "ADMIN" or "ROLE_ADMIN" => "Quản trị viên",
            "MANAGER" or "ROLE_MANAGER" => "Quản lý",
            "SALESSTAFF" or "SALES" or "ROLE_SALES" => "Nhân viên bán hàng",
            "WAREHOUSESTAFF" or "WAREHOUSE" or "ROLE_WAREHOUSE" => "Nhân viên kho",
            "PRODUCTIONSTAFF" or "PRODUCTION" or "ROLE_PRODUCTION" => "Nhân viên sản xuất",
            _ => roleName
        };
    }

    public static List<string> GetDefaultPermissionCodes(string roleCode)
    {
        var target = ToRoleCode(roleCode);
        var result = new List<string>();
        var actions = new[] { "READ", "CREATE", "UPDATE", "DELETE", "APPROVE" };

        switch (target)
        {
            case "ROLE_ADMIN":
                foreach (var m in Modules)
                    foreach (var a in actions)
                        result.Add($"{m.ModuleKey}_{a}");
                break;

            case "ROLE_MANAGER":
                foreach (var m in Modules)
                    foreach (var a in actions)
                    {
                        if (m.ModuleKey == "AUTH" && a == "DELETE") continue;
                        result.Add($"{m.ModuleKey}_{a}");
                    }
                break;

            case "ROLE_SALES":
                foreach (var m in Modules) result.Add($"{m.ModuleKey}_READ");
                result.Add("PARTNER_CREATE");
                result.Add("SALES_CREATE");
                result.Add("SALES_UPDATE");
                break;

            case "ROLE_WAREHOUSE":
                foreach (var m in Modules) result.Add($"{m.ModuleKey}_READ");
                result.Add("PURCHASE_CREATE");
                result.Add("STOCK_CREATE");
                result.Add("STOCK_UPDATE");
                break;

            case "ROLE_PRODUCTION":
                foreach (var m in Modules) result.Add($"{m.ModuleKey}_READ");
                // Ghi nhận xuất NVL / nhập thành phẩm; lập, huỷ, đóng lệnh là của Manager (PROD_CREATE/DELETE/APPROVE)
                result.Add("PROD_UPDATE");
                break;

            default:
                foreach (var m in Modules) result.Add($"{m.ModuleKey}_READ");
                break;
        }

        return result;
    }
}
