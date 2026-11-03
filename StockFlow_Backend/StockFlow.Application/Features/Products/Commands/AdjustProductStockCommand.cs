using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Products.DTOs;
using StockFlow.Application.Features.Purchases.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Products.Commands;

/// <summary>
/// Nhập thêm / cân chỉnh tồn kho của 1 hàng hóa tại 1 kho.
/// - ADD: cộng thêm Quantity vào tồn hiện tại.
/// - SET: đặt tồn thực tế của kho = Quantity (chênh lệch được ghi nhận).
/// Ghi thẻ kho (ADJUSTMENT_IN / ADJUSTMENT_OUT), giá vốn giữ nguyên theo giá vốn hiện tại của kho.
/// </summary>
public record AdjustProductStockCommand(int ProductId, AdjustProductStockRequest Request)
    : IRequest<Result<ProductStockAdjustmentDto>>;

public class AdjustProductStockHandler : IRequestHandler<AdjustProductStockCommand, Result<ProductStockAdjustmentDto>>
{
    public const string ReferenceType = "STOCK_ADJUSTMENT";

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

        if (delta != 0)
        {
            var products = new Dictionary<int, MstProduct> { [product.ProductId] = product };
            var userId = _currentUser.UserId.Value;
            var defaultKey = new PurchaseStockOps.StockKey(req.WarehouseId, product.ProductId, null, null);

            if (delta > 0)
            {
                var inRef = new PurchaseStockOps.StockRef("ADJUSTMENT_IN", ReferenceType, product.ProductId, userId);
                await PurchaseStockOps.InboundAsync(_context, defaultKey, delta, unitCost, products, inRef, ct);
            }
            else
            {
                // Trừ lần lượt vào các dòng tồn còn hàng (vị trí / lô), phần còn lại vào dòng mặc định
                var outRef = new PurchaseStockOps.StockRef("ADJUSTMENT_OUT", ReferenceType, product.ProductId, userId);
                var remaining = -delta;
                foreach (var b in balances.Where(b => (b.Quantity ?? 0) > 0).OrderByDescending(b => b.Quantity))
                {
                    if (remaining <= 0) break;
                    var take = Math.Min(remaining, b.Quantity ?? 0);
                    var key = new PurchaseStockOps.StockKey(b.WarehouseId, b.ProductId, b.LocationId, b.LotId);
                    await PurchaseStockOps.OutboundAsync(_context, key, take, b.UnitCost ?? unitCost, products, outRef, ct);
                    remaining -= take;
                }
                if (remaining > 0)
                {
                    await PurchaseStockOps.OutboundAsync(_context, defaultKey, remaining, unitCost, products, outRef, ct);
                }
            }

            await _context.SaveChangesAsync(ct);
        }

        return Result.Success(new ProductStockAdjustmentDto(
            ProductId: product.ProductId,
            WarehouseId: warehouse.WarehouseId,
            WarehouseCode: warehouse.WarehouseCode ?? string.Empty,
            WarehouseName: warehouse.WarehouseName ?? string.Empty,
            PreviousQuantity: previousQty,
            NewQuantity: previousQty + delta,
            Delta: delta,
            UnitCost: unitCost));
    }

    /// <summary>Giá vốn hiện tại của kho: bình quân theo SL các dòng còn hàng, nếu không có thì giá vốn chung của hàng hóa.</summary>
    private static decimal CurrentCost(IReadOnlyCollection<TrxInventoryBalance> balances, MstProduct product)
    {
        var positive = balances.Where(b => (b.Quantity ?? 0) > 0).ToList();
        var qty = positive.Sum(b => b.Quantity ?? 0);
        if (qty > 0)
            return Math.Round(positive.Sum(b => (b.Quantity ?? 0) * (b.UnitCost ?? 0)) / qty, 2);
        return balances.Select(b => b.UnitCost).FirstOrDefault(c => c.HasValue && c.Value > 0)
               ?? product.MovingAverageCost ?? 0;
    }
}
