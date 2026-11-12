namespace StockFlow.Application.Features.Boms.Helpers;

/// <summary>Trạng thái BOM (khớp CHECK ck_mst_boms_status trong CSDL).</summary>
public static class BomStatuses
{
    public const string Draft = "Draft";
    public const string Active = "Active";
    public const string Inactive = "Inactive";
}
