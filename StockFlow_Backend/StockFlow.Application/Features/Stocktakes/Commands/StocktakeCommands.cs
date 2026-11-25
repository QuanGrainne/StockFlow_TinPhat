using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Stocktakes.DTOs;
using StockFlow.Application.Features.Stocktakes.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Stocktakes.Commands;

/// <summary>Tạo phiếu kiểm kho (Lưu tạm hoặc Hoàn thành = cân bằng kho ngay).</summary>
public record CreateStocktakeCommand(SaveStocktakeRequest Request) : IRequest<Result<StocktakeDetailDto>>, IRetryOnConcurrencyConflict;

/// <summary>Sửa phiếu tạm (Lưu tạm hoặc Hoàn thành).</summary>
public record UpdateStocktakeCommand(int Id, SaveStocktakeRequest Request) : IRequest<Result<StocktakeDetailDto>>, IRetryOnConcurrencyConflict;

public record CancelStocktakeCommand(int Id) : IRequest<Result<StocktakeDetailDto>>, IRetryOnConcurrencyConflict;

/// <summary>Gộp nhiều phiếu tạm cùng kho thành 1 phiếu tạm mới; các phiếu cũ chuyển sang Đã hủy.</summary>
public record MergeStocktakesCommand(MergeStocktakesRequest Request) : IRequest<Result<StocktakeDetailDto>>;

public class StocktakeCommandHandler :
    IRequestHandler<CreateStocktakeCommand, Result<StocktakeDetailDto>>,
    IRequestHandler<UpdateStocktakeCommand, Result<StocktakeDetailDto>>,
    IRequestHandler<CancelStocktakeCommand, Result<StocktakeDetailDto>>,
    IRequestHandler<MergeStocktakesCommand, Result<StocktakeDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public StocktakeCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public Task<Result<StocktakeDetailDto>> Handle(CreateStocktakeCommand command, CancellationToken ct) =>
        SaveAsync(null, command.Request, ct);

    public Task<Result<StocktakeDetailDto>> Handle(UpdateStocktakeCommand command, CancellationToken ct) =>
        SaveAsync(command.Id, command.Request, ct);

    private async Task<Result<StocktakeDetailDto>> SaveAsync(int? id, SaveStocktakeRequest req, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<StocktakeDetailDto>("Không xác định được người dùng đăng nhập.");
        var userId = _currentUser.UserId.Value;
        var balance = StocktakeLogic.Is(req.Status, StocktakeLogic.Balanced);

        TrxStocktake? stocktake = null;
        if (id.HasValue)
        {
            stocktake = await StocktakeLogic.LoadAsync(_context, id.Value, ct);
            if (stocktake == null)
                return Result.Failure<StocktakeDetailDto>($"Không tìm thấy phiếu kiểm kho #{id}.");
            if (!StocktakeLogic.Is(stocktake.Status, StocktakeLogic.Draft))
                return Result.Failure<StocktakeDetailDto>("Chỉ sửa được phiếu kiểm kho ở trạng thái Phiếu tạm.");
        }

        var warehouseId = stocktake?.WarehouseId ?? req.WarehouseId ?? 0;
        var warehouse = await _context.MstWarehouses.FirstOrDefaultAsync(w => w.WarehouseId == warehouseId, ct);
        if (warehouse == null || warehouse.IsActive == false)
            return Result.Failure<StocktakeDetailDto>("Vui lòng chọn kho kiểm (kho đang hoạt động).");
        if (!await _currentUser.HasWarehouseAccessAsync(warehouseId, ct))
            return Result.Failure<StocktakeDetailDto>($"Bạn không có quyền kiểm kho tại {warehouse.WarehouseName}.");

        var code = await StocktakeLogic.ResolveCodeAsync(_context, req.StocktakeCode ?? stocktake?.StocktakeCode, id, ct);
        if (!code.IsSuccess)
            return Result.Failure<StocktakeDetailDto>(code.Error!);

        await using var transaction = await _context.BeginTransactionAsync(ct);
        try
        {
            if (stocktake == null)
            {
                stocktake = new TrxStocktake
                {
                    WarehouseId = warehouseId,
                    ConductedBy = userId,
                    StocktakeDate = VietnamTime.Now,
                    Status = StocktakeLogic.Draft,
                };
                _context.TrxStocktakes.Add(stocktake);
            }
            stocktake.StocktakeCode = code.Value;
            stocktake.Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();

            var items = await StocktakeLogic.ReplaceItemsAsync(_context, stocktake, req.Items, userId, ct);
            if (!items.IsSuccess)
                return Result.Failure<StocktakeDetailDto>(items.Error!);

            await _context.SaveChangesAsync(ct);

            if (balance)
            {
                await StocktakeLogic.BalanceAsync(_context, stocktake, userId, ct);
                await _context.SaveChangesAsync(ct);
            }

            if (transaction != null) await transaction.CommitAsync(ct);
        }
        catch (Exception ex) when (ex is not DbUpdateConcurrencyException)
        {
            if (transaction != null) await transaction.RollbackAsync(ct);
            return Result.Failure<StocktakeDetailDto>($"Lỗi khi lưu phiếu kiểm kho: {ex.InnerException?.Message ?? ex.Message}");
        }

        var saved = await StocktakeLogic.LoadAsync(_context, stocktake.StocktakeId, ct);
        return Result.Success(await StocktakeLogic.ToDetailAsync(_context, saved!, ct));
    }

    public async Task<Result<StocktakeDetailDto>> Handle(CancelStocktakeCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<StocktakeDetailDto>("Không xác định được người dùng đăng nhập.");
        var stocktake = await StocktakeLogic.LoadAsync(_context, command.Id, ct);
        if (stocktake == null)
            return Result.Failure<StocktakeDetailDto>($"Không tìm thấy phiếu kiểm kho #{command.Id}.");
        if (!await _currentUser.HasWarehouseAccessAsync(stocktake.WarehouseId, ct))
            return Result.Failure<StocktakeDetailDto>("Bạn không có quyền hủy phiếu kiểm của kho này.");
        if (StocktakeLogic.Is(stocktake.Status, StocktakeLogic.Cancelled))
            return Result.Failure<StocktakeDetailDto>("Phiếu kiểm kho đã bị hủy trước đó.");

        await using var transaction = await _context.BeginTransactionAsync(ct);
        try
        {
            if (StocktakeLogic.Is(stocktake.Status, StocktakeLogic.Balanced))
            {
                await StocktakeLogic.ReverseAsync(_context, stocktake, _currentUser.UserId.Value, ct);
            }
            stocktake.Status = StocktakeLogic.Cancelled;
            await _context.SaveChangesAsync(ct);
            if (transaction != null) await transaction.CommitAsync(ct);
        }
        catch (Exception ex) when (ex is not DbUpdateConcurrencyException)
        {
            if (transaction != null) await transaction.RollbackAsync(ct);
            return Result.Failure<StocktakeDetailDto>($"Lỗi khi hủy phiếu kiểm kho: {ex.InnerException?.Message ?? ex.Message}");
        }

        return Result.Success(await StocktakeLogic.ToDetailAsync(_context, stocktake, ct));
    }

    public async Task<Result<StocktakeDetailDto>> Handle(MergeStocktakesCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<StocktakeDetailDto>("Không xác định được người dùng đăng nhập.");
        var userId = _currentUser.UserId.Value;

        var ids = command.Request.StocktakeIds.Distinct().ToList();
        if (ids.Count < 2)
            return Result.Failure<StocktakeDetailDto>("Chọn ít nhất 2 phiếu kiểm kho để gộp.");

        var sources = await _context.TrxStocktakes
            .Include(t => t.DtlStocktakeItems)
            .Where(t => ids.Contains(t.StocktakeId))
            .OrderBy(t => t.StocktakeId)
            .ToListAsync(ct);
        if (sources.Count != ids.Count)
            return Result.Failure<StocktakeDetailDto>("Có phiếu kiểm kho không tồn tại.");
        if (sources.Any(s => !StocktakeLogic.Is(s.Status, StocktakeLogic.Draft)))
            return Result.Failure<StocktakeDetailDto>("Chỉ gộp được các phiếu kiểm kho ở trạng thái Phiếu tạm.");
        if (sources.Select(s => s.WarehouseId).Distinct().Count() > 1)
            return Result.Failure<StocktakeDetailDto>("Chỉ gộp được các phiếu kiểm kho của cùng một kho.");

        var warehouseId = sources[0].WarehouseId;
        if (!await _currentUser.HasWarehouseAccessAsync(warehouseId, ct))
            return Result.Failure<StocktakeDetailDto>("Bạn không có quyền kiểm kho tại kho này.");

        // SL thực tế của cùng 1 hàng trên các phiếu được cộng dồn (mỗi phiếu đếm 1 phần hàng)
        var items = sources
            .SelectMany(s => s.DtlStocktakeItems)
            .GroupBy(i => i.ProductId)
            .Select(g => new StocktakeItemRequest { ProductId = g.Key, ActualQty = g.Sum(i => i.ActualQty ?? 0) })
            .ToList();

        var codes = sources.OrderByDescending(s => s.StocktakeId).Select(s => s.StocktakeCode ?? $"KK{s.StocktakeId:D6}").ToList();
        var code = await StocktakeLogic.ResolveCodeAsync(_context, null, null, ct);
        if (!code.IsSuccess)
            return Result.Failure<StocktakeDetailDto>(code.Error!);

        await using var transaction = await _context.BeginTransactionAsync(ct);
        TrxStocktake merged;
        try
        {
            merged = new TrxStocktake
            {
                StocktakeCode = code.Value,
                WarehouseId = warehouseId,
                ConductedBy = userId,
                StocktakeDate = VietnamTime.Now,
                Status = StocktakeLogic.Draft,
                Notes = $"Gộp các phiếu kiểm kho {string.Join(", ", codes)}",
            };
            _context.TrxStocktakes.Add(merged);

            var replaced = await StocktakeLogic.ReplaceItemsAsync(_context, merged, items, userId, ct);
            if (!replaced.IsSuccess)
                return Result.Failure<StocktakeDetailDto>(replaced.Error!);

            foreach (var s in sources)
            {
                s.Status = StocktakeLogic.Cancelled;
                s.Notes = StocktakeLogic.AppendNote(s.Notes, $"Đã gộp vào phiếu {code.Value}");
            }

            await _context.SaveChangesAsync(ct);
            if (transaction != null) await transaction.CommitAsync(ct);
        }
        catch (Exception ex) when (ex is not DbUpdateConcurrencyException)
        {
            if (transaction != null) await transaction.RollbackAsync(ct);
            return Result.Failure<StocktakeDetailDto>($"Lỗi khi gộp phiếu kiểm kho: {ex.InnerException?.Message ?? ex.Message}");
        }

        var saved = await StocktakeLogic.LoadAsync(_context, merged.StocktakeId, ct);
        return Result.Success(await StocktakeLogic.ToDetailAsync(_context, saved!, ct));
    }
}
