using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// Tổng quan một lần chạy MRP và cảnh báo lỗi thời (specs/mrp/review/04_MRP_WORKFLOW.md mục 3):
/// kết quả là ảnh chụp lúc chạy; dữ liệu đầu vào đổi sau đó thì báo để người dùng chạy lại, không tự tính lại.
/// Phát hiện được: kế hoạch được sửa / đổi trạng thái, đơn đặt được tạo / sửa, lệnh mới, mọi biến động kho của NVL trong kỳ.
/// Không phát hiện được (không có cột thời gian): hủy lệnh, kích hoạt BOM khác.
/// </summary>
public record GetMrpRunSummaryQuery(int MrpRunId) : IRequest<Result<MrpRunSummaryDto>>;

public class GetMrpRunSummaryQueryHandler : IRequestHandler<GetMrpRunSummaryQuery, Result<MrpRunSummaryDto>>
{
    private const int MaxReasonsPerKind = 3;

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetMrpRunSummaryQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<MrpRunSummaryDto>> Handle(GetMrpRunSummaryQuery query, CancellationToken ct)
    {
        var (run, whIds, error) = await MrpRunAccess.LoadAsync(_context, _currentUser, query.MrpRunId, ct);
        if (run == null) return Result.Failure<MrpRunSummaryDto>(error!);

        var warehouses = await _context.MstWarehouses.AsNoTracking()
            .Where(w => whIds.Contains(w.WarehouseId))
            .OrderBy(w => w.WarehouseId)
            .Select(w => new MrpWarehouseLookupDto(w.WarehouseId, w.WarehouseName ?? ""))
            .ToListAsync(ct);

        var reasons = new List<string>();

        var plans = await _context.TrxProductionPlans.AsNoTracking()
            .Where(p => p.PeriodStart <= run.PeriodEnd && p.UpdatedAt > run.RunAt)
            .OrderBy(p => p.UpdatedAt)
            .Select(p => new { p.PlanCode, p.UpdatedAt })
            .Take(MaxReasonsPerKind)
            .ToListAsync(ct);
        reasons.AddRange(plans.Select(p => $"Kế hoạch {p.PlanCode} được cập nhật lúc {p.UpdatedAt:dd/MM/yyyy HH:mm}"));

        var orders = await _context.TrxProductionOrders.AsNoTracking()
            .Where(o => o.StartDate > run.RunAt)
            .OrderBy(o => o.StartDate)
            .Select(o => new { o.ProductionOrderCode, o.StartDate })
            .Take(MaxReasonsPerKind)
            .ToListAsync(ct);
        reasons.AddRange(orders.Select(o => $"Lệnh {o.ProductionOrderCode} được lập lúc {o.StartDate:dd/MM/yyyy HH:mm}"));

        var purchaseOrders = await _context.TrxPurchaseOrders.AsNoTracking()
            .Where(po => whIds.Contains(po.WarehouseId) && (po.UpdatedAt > run.RunAt || po.OrderDate > run.RunAt))
            .OrderBy(po => po.PoId)
            .Select(po => po.PoCode)
            .Take(MaxReasonsPerKind)
            .ToListAsync(ct);
        reasons.AddRange(purchaseOrders.Select(code => $"Đơn đặt hàng nhập {code} được tạo / sửa sau lần tính"));

        var materialIds = _context.DtlMrpRunLines.Where(l => l.MrpRunId == run.MrpRunId).Select(l => l.MaterialId);
        var movements = await _context.TrxInventoryTransactions.AsNoTracking()
            .CountAsync(t => whIds.Contains(t.WarehouseId) && t.TransactionDate > run.RunAt
                             && materialIds.Contains(t.ProductId), ct);
        if (movements > 0) reasons.Add($"Tồn kho NVL đã thay đổi ({movements} giao dịch kho sau lần tính)");

        return Result.Success(new MrpRunSummaryDto(
            run.MrpRunId,
            run.RunCode,
            run.RunAt,
            ProductionHelper.UserName(run.RunByNavigation),
            run.PeriodStart,
            run.PeriodEnd,
            warehouses,
            run.IncludePendingPlans,
            run.MaterialCount,
            run.ShortageCount,
            run.LateCount,
            await MrpRunAccess.ProductsWithoutBomAsync(_context, run, ct),
            IsStale: reasons.Count > 0,
            StaleReasons: reasons));
    }
}
