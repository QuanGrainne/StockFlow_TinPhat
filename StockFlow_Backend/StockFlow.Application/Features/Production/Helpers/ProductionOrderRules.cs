using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Helpers;

/// <summary>Luật dùng chung khi lập / sửa lệnh sản xuất (UC-59, E58.2, BR-31).</summary>
public static class ProductionOrderRules
{
    /// <summary>E58.2: hạn hoàn thành không được ở quá khứ (so theo ngày giờ Việt Nam).</summary>
    public static string? ValidateDeadline(DateTime? deadline)
    {
        if (deadline.HasValue && deadline.Value.Date < VietnamTime.Now.Date)
            return "Hạn hoàn thành không được trước ngày hôm nay.";
        return null;
    }

    /// <summary>Chụp định mức từ BOM đang áp dụng thành nhu cầu NVL của lệnh (BR-31).</summary>
    public static void AddRequirementsFromBom(
        IStockFlowDbContext context, TrxProductionOrder order, MstBom bom, decimal plannedQuantity)
    {
        foreach (var item in bom.DtlBomItems.OrderBy(i => i.BomItemId))
        {
            var norm = item.Quantity ?? 0;
            var rate = item.WastageRate ?? 0;
            var required = ProductionPolicy.CalculateRequirement(plannedQuantity, norm, rate);
            context.TrxProductionMaterialRequirements.Add(new TrxProductionMaterialRequirement
            {
                ProductionOrder = order,
                MaterialId = item.MaterialId,
                UnitId = item.UnitId,
                SourceBomItemId = item.BomItemId,
                NormPerUnit = norm,
                WastageRate = rate,
                RequiredQty = required,
                IssuedQty = 0,
                ShortageQty = required,
                IsAdjusted = false,
            });
        }
    }
}
