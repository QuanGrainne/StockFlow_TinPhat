using StockFlow.Application.Features.Reports.DTOs;

namespace StockFlow.Application.Features.Reports.Helpers;

/// <summary>
/// Gom loại giao dịch thẻ kho (transaction_type) vào nhóm của báo cáo nhập – xuất – tồn.
/// Danh sách loại theo GetProductStockCardQuery.TypeNames (thẻ kho); loại chưa biết vào nhóm Khác.
/// </summary>
public static class StockMovementGroups
{
    public const string Purchase = "PURCHASE";
    public const string Sale = "SALE";
    public const string Transfer = "TRANSFER";
    public const string Stocktake = "STOCKTAKE";
    public const string Production = "PRODUCTION";
    public const string Disposal = "DISPOSAL";
    public const string Other = "OTHER";

    private static readonly Dictionary<string, string> GroupByType = new(StringComparer.OrdinalIgnoreCase)
    {
        ["INBOUND_RECEIPT"] = Purchase,
        ["INBOUND_RECEIPT_EDIT_IN"] = Purchase,
        ["INBOUND_RECEIPT_EDIT_OUT"] = Purchase,
        ["INBOUND_RECEIPT_CANCEL"] = Purchase,
        ["OUTBOUND_PURCHASE_RETURN"] = Purchase,
        ["PURCHASE_RETURN_CANCEL"] = Purchase,

        [SalesFigures.SaleIssueType] = Sale,
        [SalesFigures.SaleCancelType] = Sale,
        [SalesFigures.SaleReturnType] = Sale,
        [SalesFigures.SaleReturnCancelType] = Sale,

        ["TRANSFER_OUT"] = Transfer,
        ["TRANSFER_IN"] = Transfer,
        ["TRANSFER_CANCEL_IN"] = Transfer,
        ["TRANSFER_CANCEL_OUT"] = Transfer,

        ["STOCKTAKE_IN"] = Stocktake,
        ["STOCKTAKE_OUT"] = Stocktake,
        ["STOCKTAKE_CANCEL_IN"] = Stocktake,
        ["STOCKTAKE_CANCEL_OUT"] = Stocktake,

        ["PRODUCTION_ISSUE"] = Production,
        ["PRODUCTION_RECEIPT"] = Production,

        ["DISPOSAL"] = Disposal,
        ["DISPOSAL_CANCEL"] = Disposal,

        ["ADJUSTMENT_IN"] = Other,
        ["ADJUSTMENT_OUT"] = Other,
        ["COST_UPDATE"] = Other,
    };

    public static string GroupOf(string? transactionType) =>
        transactionType != null && GroupByType.TryGetValue(transactionType, out var group) ? group : Other;

    /// <summary>Cộng số lượng vào đúng ô nhóm.</summary>
    public static void Add(MovementByGroupDto target, string group, decimal quantity)
    {
        switch (group)
        {
            case Purchase: target.Purchase += quantity; break;
            case Sale: target.Sale += quantity; break;
            case Transfer: target.Transfer += quantity; break;
            case Stocktake: target.Stocktake += quantity; break;
            case Production: target.Production += quantity; break;
            case Disposal: target.Disposal += quantity; break;
            default: target.Other += quantity; break;
        }
    }

    public static void AddAll(MovementByGroupDto target, MovementByGroupDto source)
    {
        target.Purchase += source.Purchase;
        target.Sale += source.Sale;
        target.Transfer += source.Transfer;
        target.Stocktake += source.Stocktake;
        target.Production += source.Production;
        target.Disposal += source.Disposal;
        target.Other += source.Other;
    }
}
