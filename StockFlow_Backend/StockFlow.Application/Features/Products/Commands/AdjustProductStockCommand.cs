using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Application.Features.Products.DTOs;
using StockFlow.Application.Features.Stocktakes.DTOs;
using StockFlow.Application.Features.Stocktakes.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Products.Commands;

/// <summary>
/// Nhập thêm / cân chỉnh tồn kho của 1 hàng hóa tại 1 kho.
/// - ADD: cộng thêm Quantity vào tồn hiện tại.
/// - SET: đặt tồn thực tế của kho = Quantity (chênh lệch được ghi nhận).
/// Mỗi lần thay đổi sinh 1 phiếu kiểm kho "Đã cân bằng kho" (thẻ kho STOCKTAKE_IN / STOCKTAKE_OUT), giá vốn giữ nguyên.
/// </summary>
public record AdjustProductStockCommand(int ProductId, AdjustProductStockRequest Request)
    : IRequest<Result<ProductStockAdjustmentDto>>;

public class AdjustProductStockHandler : IRequestHandler<AdjustProductStockCommand, Result<ProductStockAdjustmentDto>>
{

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public AdjustProductStockHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<ProductStockAdjustmentDto>> Handle(AdjustProductStockCommand command, CancellationToken ct)
    {
        var req = command.Request;
        var mode = (req.Mode ?? "ADD").Trim().ToUpperInvariant();

        if (!_currentUser.UserId.HasValue)
            return Result.Failure<ProductStockAdjustmentDto>("Không xác định được người dùng đăng nhập.");
        if (mode != "ADD" && mode != "SET")
            return Result.Failure<ProductStockAdjustmentDto>("Kiểu điều chỉnh không hợp lệ (ADD hoặc SET).");
        if (mode == "ADD" && req.Quantity <= 0)
            return Result.Failure<ProductStockAdjustmentDto>("Số lượng nhập thêm phải lớn hơn 0.");
        if (mode == "SET" && req.Quantity < 0)
            return Result.Failure<ProductStockAdjustmentDto>("Tồn kho thực tế không được âm.");

        var product = await _context.MstProducts.FirstOrDefaultAsync(p => p.ProductId == command.ProductId, ct);
        if (product == null)
            return Result.Failure<ProductStockAdjustmentDto>("Không tìm thấy hàng hóa.");

        var warehouse = await _context.MstWarehouses.FirstOrDefaultAsync(w => w.WarehouseId == req.WarehouseId, ct);
        if (warehouse == null || warehouse.IsActive == false)
            return Result.Failure<ProductStockAdjustmentDto>("Kho không tồn tại hoặc đã ngừng hoạt động.");
        if (!await _currentUser.HasWarehouseAccessAsync(req.WarehouseId, ct))
            return Result.Failure<ProductStockAdjustmentDto>($"Bạn không có quyền điều chỉnh tồn kho tại {warehouse.WarehouseName}.");

        var balances = await _context.TrxInventoryBalances
            .Where(b => b.ProductId == product.ProductId && b.WarehouseId == req.WarehouseId)
            .ToListAsync(ct);

        var previousQty = balances.Sum(b => b.Quantity ?? 0);
        var unitCost = CurrentCost(balances, product);
        var delta = mode == "ADD" ? req.Quantity : req.Quantity - previousQty;

        string? stocktakeCode = null;
        if (delta != 0)
        {
            // Mọi thay đổi tồn kho từ Danh mục hàng hóa đều sinh 1 phiếu kiểm kho "Đã cân bằng kho" (giống KiotViet):
            // thực tế = tồn mới, cân bằng ngay → ghi thẻ kho STOCKTAKE_IN / STOCKTAKE_OUT, giá vốn giữ nguyên.
            var userId = _currentUser.UserId.Value;
            var code = await StocktakeLogic.ResolveCodeAsync(_context, null, null, ct);
            if (!code.IsSuccess)
                return Result.Failure<ProductStockAdjustmentDto>(code.Error!);

            var autoNote = $"Phiếu kiểm kho được tạo tự động khi cập nhật Hàng hóa {product.ProductCode}";
            var stocktake = new TrxStocktake
            {
                StocktakeCode = code.Value,
                WarehouseId = req.WarehouseId,
                ConductedBy = userId,
                StocktakeDate = VietnamTime.Now,
                Status = StocktakeLogic.Draft,
                Notes = string.IsNullOrWhiteSpace(req.Note) ? autoNote : $"{autoNote} | {req.Note.Trim()}",
            };

            await using var transaction = await _context.BeginTransactionAsync(ct);
            _context.TrxStocktakes.Add(stocktake);
            var items = await StocktakeLogic.ReplaceItemsAsync(_context, stocktake,
                new[] { new StocktakeItemRequest { ProductId = product.ProductId, ActualQty = previousQty + delta } }, userId, ct);
            if (!items.IsSuccess)
                return Result.Failure<ProductStockAdjustmentDto>(items.Error!);
            await _context.SaveChangesAsync(ct);
            await StocktakeLogic.BalanceAsync(_context, stocktake, userId, ct);
            await _context.SaveChangesAsync(ct);
            if (transaction != null) await transaction.CommitAsync(ct);
            stocktakeCode = stocktake.StocktakeCode;
        }

        return Result.Success(new ProductStockAdjustmentDto(
            ProductId: product.ProductId,
            WarehouseId: warehouse.WarehouseId,
            WarehouseCode: warehouse.WarehouseCode ?? string.Empty,
            WarehouseName: warehouse.WarehouseName ?? string.Empty,
            PreviousQuantity: previousQty,
            NewQuantity: previousQty + delta,
            Delta: delta,
            UnitCost: unitCost,
            StocktakeCode: stocktakeCode));
    }

    /// <summary>Giá vốn hiện tại của kho: bình quân theo SL các dòng còn hàng, nếu không có thì giá vốn chung của hàng hóa.</summary>
    private static decimal CurrentCost(IReadOnlyCollection<TrxInventoryBalance> balances, MstProduct product) =>
        InventoryCosting.CostOf(balances, product.MovingAverageCost ?? 0);
}
