using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Helpers;

/// <summary>Luật nhập thành phẩm dùng chung cho bước kiểm tra và bước ghi nhận (UC-49, BR-35, BR-37).</summary>
public static class FinishedGoodsRules
{
    /// <summary>Số thành phẩm đã sản xuất luỹ kế của lệnh hoặc dòng thành phẩm (đạt + lỗi) theo các báo cáo đã ghi.</summary>
    public static async Task<(decimal Accepted, decimal Defect)> ProducedSoFarAsync(
        IStockFlowDbContext context, int productionOrderId, CancellationToken ct, int? productionOrderItemId = null)
    {
        if (productionOrderItemId.HasValue)
        {
            var itemRows = await context.TrxFinishedGoodsReceipts.AsNoTracking()
                .Where(f => f.ProductionOrderId == productionOrderId && f.ProductionOrderItemId == productionOrderItemId.Value)
                .Select(f => new { Accepted = f.Quantity ?? 0, Defect = f.Report.DefectQty ?? 0 })
                .ToListAsync(ct);
            return (itemRows.Sum(r => r.Accepted), itemRows.Sum(r => r.Defect));
        }

        var rows = await context.TrxProductionReports.AsNoTracking()
            .Where(r => r.ProductionOrderId == productionOrderId)
            .Select(r => new { Accepted = r.ProducedQty ?? 0, Defect = r.DefectQty ?? 0 })
            .ToListAsync(ct);
        return (rows.Sum(r => r.Accepted), rows.Sum(r => r.Defect));
    }

    /// <summary>
    /// BR-37: với số thành phẩm sản xuất luỹ kế sau phiếu này (đạt + lỗi), NVL nào cần nhiều hơn số đã xuất thì cảnh báo.
    /// Lượng cần = Nhu cầu của lệnh × SL sản xuất luỹ kế / SL kế hoạch.
    /// </summary>
    public static async Task<List<MaterialUsageWarningDto>> MaterialWarningsAsync(
        IStockFlowDbContext context, TrxProductionOrder order, decimal producedAfter, CancellationToken ct,
        int? productionOrderItemId = null, decimal? itemPlannedQty = null)
    {
        var planned = itemPlannedQty ?? order.PlannedQuantity ?? 0;
        var q = context.TrxProductionMaterialRequirements.AsNoTracking()
            .Where(r => r.ProductionOrderId == order.ProductionOrderId);
        if (productionOrderItemId.HasValue)
            q = q.Where(r => r.ProductionOrderItemId == productionOrderItemId.Value || r.ProductionOrderItemId == null);

        var reqs = await q
            .Select(r => new
            {
                Code = r.Material.ProductCode ?? "",
                Name = r.Material.ProductName ?? "",
                Unit = r.Unit.UnitName ?? "",
                Required = r.RequiredQty ?? 0,
                Issued = r.IssuedQty ?? 0,
            })
            .ToListAsync(ct);

        return reqs
            .Select(r => new { r, Needed = ProductionPolicy.MaterialNeededFor(r.Required, planned, producedAfter) })
            .Where(x => x.Needed > x.r.Issued)
            .Select(x => new MaterialUsageWarningDto(x.r.Code, x.r.Name, x.r.Unit, x.Needed, x.r.Issued))
            .ToList();
    }
}
