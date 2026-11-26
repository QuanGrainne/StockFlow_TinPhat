namespace StockFlow.Domain.Entities;

/// <summary>
/// Phân loại đối tác (partner_type): SUPPLIER = nhà cung cấp, CUSTOMER = khách hàng, BOTH = vừa là NCC vừa là khách.
/// Chỉ kiểm điều kiện, không truy cập DB. File partial riêng để không sửa file entity kiểu scaffold.
/// </summary>
public partial class MstBusinessPartner
{
    public const string TypeSupplier = "SUPPLIER";
    public const string TypeCustomer = "CUSTOMER";
    public const string TypeBoth = "BOTH";

    /// <summary>Là nhà cung cấp (SUPPLIER hoặc BOTH): được dùng trên phiếu nhập / trả hàng nhập / đặt hàng nhập.</summary>
    public bool IsSupplier() =>
        string.Equals(PartnerType, TypeSupplier, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(PartnerType, TypeBoth, StringComparison.OrdinalIgnoreCase);
}
