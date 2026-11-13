using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Helpers;

/// <summary>Luật nhập thành phẩm dùng chung cho bước kiểm tra và bước ghi nhận (UC-49, BR-35, BR-37).</summary>
public static class FinishedGoodsRules
{
    /// <summary>Số thành phẩm đã sản xuất luỹ kế của lệnh (đạt + lỗi) theo các báo cáo đã ghi.</summary>
    public static async Task<(decimal Accepted, decimal Defect)> ProducedSoFarAsync(
        IStockFlowDbContext context, int productionOrderId, CancellationToken ct)
    {
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
        IStockFlowDbContext context, TrxProductionOrder order, decimal producedAfter, CancellationToken ct)
    {
        var planned = order.PlannedQuantity ?? 0;
        var reqs = await context.TrxProductionMaterialRequirements.AsNoTracking()
            .Where(r => r.ProductionOrderId == order.ProductionOrderId)
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
