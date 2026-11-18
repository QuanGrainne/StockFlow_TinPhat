using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// Chạy MRP (mã tạm UC-MRP, specs/mrp/review/04_MRP_WORKFLOW.md): đọc nhu cầu (kế hoạch + lệnh) và nguồn (tồn + đơn đặt có ngày giao)
/// của các kho đã chọn, tính bằng <see cref="MrpPolicy"/>, lưu một lần chạy (trx_mrp_runs), kết quả theo ngày (dtl_mrp_run_lines)
/// và truy vết nhu cầu được cấp / thiếu (dtl_mrp_run_demands) trong một transaction.
/// Không đổi tồn kho, không tạo đơn đặt (BR-MRP-10, 28). Kỳ tính từ hôm nay (giờ Việt Nam) tới PeriodEnd.
/// </summary>
public record RunMrpCommand(RunMrpRequest Request) : IRequest<Result<MrpRunSummaryDto>>;

public class RunMrpCommandValidator : AbstractValidator<RunMrpCommand>
{
    public const int MaxPeriodDays = 366;

    public RunMrpCommandValidator()
    {
        RuleFor(x => x.Request).NotNull().WithMessage("Thiếu dữ liệu chạy MRP.");
        RuleFor(x => x.Request.PeriodEnd)
            .Must(end =>
            {
                var today = DateOnly.FromDateTime(VietnamTime.Now);
                return end >= today && end <= today.AddDays(MaxPeriodDays);
            })
            .WithMessage("Ngày cuối kỳ phải từ hôm nay và không quá 366 ngày.");
        RuleFor(x => x.Request.WarehouseIds)
            .Must(ids => ids is { Count: > 0 }).WithMessage("Vui lòng chọn ít nhất một kho nguyên vật liệu.")
            .Must(ids => ids == null || ids.Count <= 20).WithMessage("Chọn tối đa 20 kho.");
    }
}

public class RunMrpCommandHandler : IRequestHandler<RunMrpCommand, Result<MrpRunSummaryDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly ITransactionCodeGenerator _codeGenerator;

    public RunMrpCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser, ITransactionCodeGenerator codeGenerator)
    {
        _context = context;
        _currentUser = currentUser;
        _codeGenerator = codeGenerator;
    }

    public async Task<Result<MrpRunSummaryDto>> Handle(RunMrpCommand command, CancellationToken ct)
    {
        var req = command.Request;
        if (_currentUser.UserId is not int userId)
            return Result.Failure<MrpRunSummaryDto>("Không xác định được người dùng đăng nhập.");

        var requestedIds = req.WarehouseIds.Distinct().ToList();
        var warehouses = await _context.MstWarehouses.AsNoTracking()
            .Where(w => requestedIds.Contains(w.WarehouseId) && w.IsActive == true)
            .OrderBy(w => w.WarehouseId)
            .Select(w => new MrpWarehouseLookupDto(w.WarehouseId, w.WarehouseName ?? $"Kho #{w.WarehouseId}"))
            .ToListAsync(ct);
        if (warehouses.Count != requestedIds.Count)
            return Result.Failure<MrpRunSummaryDto>("Kho không tồn tại hoặc đã ngừng hoạt động.");
        if (!await MrpRunAccess.CanViewAsync(_currentUser, requestedIds, ct))
            return Result.Failure<MrpRunSummaryDto>(ProductionMessages.NoWarehouseAccess);
        var whIds = warehouses.Select(w => w.WarehouseId).ToList();

        var today = DateOnly.FromDateTime(VietnamTime.Now);
        var demand = await MrpDemandReader.ReadAsync(_context, req.PeriodEnd, req.IncludePendingPlans, ct);
        var supply = await MrpSupplyReader.ReadAsync(
            _context, whIds, demand.Demands.Select(d => d.MaterialId), today, req.PeriodEnd, ct);

        // Q4: thời gian giao theo ngày lịch; Q9: chưa cấu hình ngày nghỉ, mọi ngày là ngày làm việc
        var result = MrpPolicy.Calculate(demand.Demands, supply.ScheduledReceipts, supply.MaterialInputs,
            new MrpSettings(today, req.PeriodEnd));
        var materials = result.Materials.Where(m => m.TotalGrossRequirement > 0).ToList();

        // Số quá lớn so với cột numeric(18,2): báo rõ thay vì lỗi cơ sở dữ liệu
        bool TooLarge(decimal v) => Math.Abs(v) > ProductionPolicy.MaxStoredQuantity;
        if (materials.SelectMany(m => m.Buckets).Any(b => TooLarge(b.GrossRequirement) || TooLarge(b.ProjectedBalance)
                || TooLarge(b.PlannedReceipt) || TooLarge(b.ScheduledReceipt)))
            return Result.Failure<MrpRunSummaryDto>(ProductionMessages.QuantityLimit);

        var now = VietnamTime.Now;
        var code = await ProductionHelper.NextCodeAsync(_context, _codeGenerator, "MRP_RUN",
            (c, token) => _context.TrxMrpRuns.AnyAsync(r => r.RunCode == c, token), ct);

        var notes = MrpRunAccess.MissingBomNote(demand.ProductsWithoutBom.Select(p => p.ProductCode));

        var run = new TrxMrpRun
        {
            RunCode = code,
            RunAt = now,
            RunBy = userId,
            PeriodStart = today,
            PeriodEnd = req.PeriodEnd,
            WarehouseIds = string.Join(",", whIds),
            IncludePendingPlans = req.IncludePendingPlans,
            MaterialCount = materials.Count,
            ShortageCount = materials.Count(m => m.Status is MrpMaterialStatus.Shortage or MrpMaterialStatus.NoLeadTime
                or MrpMaterialStatus.Late),
            LateCount = materials.Count(m => m.Status == MrpMaterialStatus.Late),
            Notes = notes,
        };

        foreach (var m in materials)
        {
            foreach (var b in m.Buckets)
            {
                run.DtlMrpRunLines.Add(new DtlMrpRunLine
                {
                    MaterialId = m.MaterialId,
                    BucketDate = b.Date,
                    GrossRequirement = b.GrossRequirement,
                    ScheduledReceipt = b.ScheduledReceipt,
                    ProjectedBalance = b.ProjectedBalance,
                    NetRequirement = b.NetRequirement,
                    PlannedReceipt = b.PlannedReceipt,
                    PlannedReleaseDate = b.PlannedReleaseDate,
                    IsLate = b.IsLate,
                });
            }
        }

        // Truy vết: nhu cầu đến từ kế hoạch / lệnh nào, được cấp bao nhiêu (BR-MRP-21). MrpPolicy trả lại đúng đối tượng nhu cầu đã nhận.
        var metaByDemand = demand.Metas.ToDictionary<MrpDemandMeta, MrpDemand>(x => x.Demand, ReferenceEqualityComparer.Instance);
        foreach (var a in result.Allocations)
        {
            var meta = metaByDemand[a.Demand];
            run.DtlMrpRunDemands.Add(new DtlMrpRunDemand
            {
                MaterialId = a.Demand.MaterialId,
                NeedDate = a.EffectiveNeedDate,
                SourceType = a.Demand.Kind == MrpDemandKind.Order ? MrpDemandSource.Order : MrpDemandSource.Plan,
                ProductionPlanId = meta.ProductionPlanId,
                ProductionOrderId = meta.ProductionOrderId,
                ProductId = a.Demand.ProductId,
                RequiredQty = ProductionPolicy.RoundQuantity(a.Demand.Quantity),
                AllocatedQty = a.Allocated,
                ShortageQty = a.Shortage,
            });
        }

        await using var tx = await _context.BeginTransactionAsync(ct);
        _context.TrxMrpRuns.Add(run);
        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var runBy = await _context.SecUsers.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId, ct);
        return Result.Success(new MrpRunSummaryDto(
            run.MrpRunId, run.RunCode, run.RunAt, ProductionHelper.UserName(runBy), run.PeriodStart, run.PeriodEnd,
            warehouses, run.IncludePendingPlans, run.MaterialCount, run.ShortageCount, run.LateCount,
            demand.ProductsWithoutBom, IsStale: false, StaleReasons: new List<string>()));
    }
}
