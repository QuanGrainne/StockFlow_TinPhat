namespace StockFlow.Application.Features.Boms.Helpers;

/// <summary>
/// Thông báo hệ thống của chức năng BOM, giữ nguyên văn tiếng Anh theo spec (mục 6).
/// MSG70 (xác nhận kích hoạt) là hộp thoại phía giao diện nên không có ở đây.
/// Các thông báo không có mã MSG là bổ sung của backend, chờ nhóm xác nhận.
/// </summary>
public static class BomMessages
{
    public const string Msg66NoMaterial = "Bill of materials must contain at least one material.";
    public const string Msg67DuplicateMaterial = "This material is already in the BOM.";
    public const string Msg68InvalidQuantity = "Quantity must be greater than 0 and have at most 6 decimal places.";
    public const string Msg69InvalidWastage = "Wastage rate must be between 0 and 100 with at most 4 decimal places.";
    public const string Msg74SelfComponent = "A product cannot be a component of its own BOM.";

    /// <summary>MSG71.</summary>
    public static string Msg71Activated(string? version) => $"BOM version {version} activated.";

    // Thông báo bổ sung (không có mã MSG trong spec)
    public const string BomNotFound = "BOM not found.";
    public const string ProductNotFound = "Product not found.";
    public const string ProductInactive = "Product is not active.";
    public const string OnlyDraftEditable = "Only a draft BOM can be edited. Create a new version to change an active BOM.";
    public const string OnlyDraftActivatable = "Only a draft BOM can be activated.";
    public const string OnlyActiveDeactivatable = "Only an active BOM can be deactivated.";
    public const string ActiveCannotBeDeleted = "An active BOM cannot be deleted. Deactivate it first.";
    public const string InUseCannotBeDeleted = "This BOM version is used by production orders and cannot be deleted. Deactivate it instead.";
    public const string ActivationConflict = "Another version of this product's BOM was activated at the same time. Reload and try again.";
    public const string NoLongerDraft = "This BOM is no longer a draft. Reload and try again.";
    public const string NameTooLong = "BOM name must not exceed 100 characters.";
    public const string DescriptionTooLong = "Description must not exceed 500 characters.";

    public static string MaterialNotUsable(int materialId) =>
        $"Material {materialId} does not exist or is not active.";

    public static string UnitNotValid(int materialId, int unitId) =>
        $"Unit {unitId} is not valid for material {materialId}.";
}
