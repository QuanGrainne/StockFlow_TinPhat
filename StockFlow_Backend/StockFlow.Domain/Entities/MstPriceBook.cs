using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class MstPriceBook
{
    public int PriceBookId { get; set; }

    public string? PriceBookCode { get; set; }

    public string PriceBookName { get; set; } = null!;

    public DateTime? EffectiveFrom { get; set; }

    public DateTime? EffectiveTo { get; set; }

    public bool IsActive { get; set; } = true;

    public bool IsDefault { get; set; } = false;

    /// <summary>
    /// Nguồn giá cơ sở: "COST" (Giá vốn), "LATEST_PURCHASE" (Giá nhập cuối), "STANDARD" (Bảng giá chung), "PRICE_BOOK" (Bảng giá khác)
    /// </summary>
    public string? FormulaBaseType { get; set; }

    /// <summary>
    /// ID bảng giá nguồn khi FormulaBaseType = "PRICE_BOOK"
    /// </summary>
    public int? FormulaBasePriceBookId { get; set; }

    /// <summary>
    /// Toán tử: "+" hoặc "-"
    /// </summary>
    public string? FormulaOperator { get; set; }

    /// <summary>
    /// Giá trị điều chỉnh
    /// </summary>
    public decimal? FormulaValue { get; set; }

    /// <summary>
    /// Đơn vị điều chỉnh: "VND" hoặc "PERCENT"
    /// </summary>
    public string? FormulaUnit { get; set; }

    /// <summary>
    /// Được phép thêm hàng hóa không có trong bảng giá khi lên đơn (true/false)
    /// </summary>
    public bool AllowUnlistedProducts { get; set; } = true;

    /// <summary>
    /// Cảnh báo khi thêm hàng hóa không có trong bảng giá (true/false)
    /// </summary>
    public bool WarnUnlistedProducts { get; set; } = false;

    /// <summary>
    /// Phạm vi chi nhánh/kho: "ALL" hoặc "SPECIFIC"
    /// </summary>
    public string ScopeBranchType { get; set; } = "ALL";

    /// <summary>
    /// JSON lưu danh sách ID kho áp dụng, ví dụ: [1, 2]
    /// </summary>
    public string? ScopeWarehouseIds { get; set; }

    /// <summary>
    /// Phạm vi nhóm khách hàng: "ALL" hoặc "SPECIFIC"
    /// </summary>
    public string ScopeCustomerType { get; set; } = "ALL";

    /// <summary>
    /// JSON lưu danh sách mã nhóm khách hàng áp dụng
    /// </summary>
    public string? ScopeCustomerGroupCodes { get; set; }

    /// <summary>
    /// Phạm vi người tạo giao dịch: "ALL" hoặc "SPECIFIC"
    /// </summary>
    public string ScopeUserType { get; set; } = "ALL";

    /// <summary>
    /// JSON lưu danh sách User ID được phép dùng bảng giá này
    /// </summary>
    public string? ScopeUserIds { get; set; }

    /// <summary>
    /// JSON danh sách PartnerId khách hàng áp dụng khi ScopeCustomerType = "SPECIFIC", ví dụ: [12, 15].
    /// (Thay cho ScopeCustomerGroupCodes: hệ thống không có nhóm khách hàng.)
    /// </summary>
    public string? ScopeCustomerIds { get; set; }

    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual MstPriceBook? FormulaBasePriceBook { get; set; }

    public virtual ICollection<DtlPriceBookItem> DtlPriceBookItems { get; set; } = new List<DtlPriceBookItem>();
}
