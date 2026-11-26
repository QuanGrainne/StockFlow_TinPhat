using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Application.Features.PriceBooks.DTOs;
using StockFlow.Application.Features.PriceBooks.Services;
using StockFlow.Application.Features.Products.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PriceBooks.Queries;

public record GetPriceBookMatrixQuery(
    int? WarehouseId = null,
    string? Search = null,
    int? CategoryId = null,
    string? StockCondition = "ALL",
    List<int>? PriceBookIds = null,
    int PageIndex = 1,
    int PageSize = 20,
    // true: mọi hàng hóa (kể cả chưa có trong bảng giá tự tạo) — POS cần giá của mọi hàng theo từng bảng giá
    bool AllProducts = false
) : IRequest<Result<PriceBookMatrixResultDto>>;

public class GetPriceBookMatrixQueryHandler : IRequestHandler<GetPriceBookMatrixQuery, Result<PriceBookMatrixResultDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetPriceBookMatrixQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<PriceBookMatrixResultDto>> Handle(GetPriceBookMatrixQuery request, CancellationToken cancellationToken)
    {
        // 1. Xác định danh sách ID bảng giá cần lấy
        var targetBookIds = request.PriceBookIds?.Distinct().ToList() ?? new List<int>();
        if (!targetBookIds.Any())
        {
            var defaultBook = await _context.MstPriceBooks
                .AsNoTracking()
                .FirstOrDefaultAsync(pb => pb.IsDefault, cancellationToken);
            if (defaultBook != null)
            {
                targetBookIds.Add(defaultBook.PriceBookId);
            }
        }

        // Lấy thông tin metadata các bảng giá để tính toán công thức
        var targetBooks = await _context.MstPriceBooks
            .Where(b => targetBookIds.Contains(b.PriceBookId))
            .AsNoTracking()
            .ToDictionaryAsync(b => b.PriceBookId, cancellationToken);

        // 2. Query cơ bản danh sách sản phẩm
        var query = _context.MstProducts
            .Include(p => p.Category)
            .Include(p => p.BaseUnit)
            .Include(p => p.TrxInventoryBalances)
            .AsNoTracking();

        var search = request.Search?.Trim().ToLower() ?? "";
        if (search.Length > 0)
        {
            var s = search;
            // Mã đơn vị quy đổi (VD SP004330 = "bịch" của SP004328) nằm trong variants_json → vẫn tìm ra
            query = query.Where(p =>
                (p.ProductCode != null && p.ProductCode.ToLower().Contains(s)) ||
                (p.ProductName != null && p.ProductName.ToLower().Contains(s)) ||
                (p.VariantsJson != null && p.VariantsJson.ToLower().Contains(s)));
        }

        if (request.CategoryId.HasValue && request.CategoryId.Value > 0)
        {
            query = query.Where(p => p.CategoryId == request.CategoryId.Value);
        }

        // Nếu có bảng giá tùy biến (non-default) được chọn, chỉ hiển thị các sản phẩm đã được thêm vào bảng giá đó
        var customBookIds = targetBooks.Values
            .Where(b => !b.IsDefault)
            .Select(b => b.PriceBookId)
            .ToList();

        // Đang tìm kiếm: vẫn tìm ra hàng chưa có trong bảng giá (ô giá trống, nhập giá để thêm vào bảng giá)
        if (customBookIds.Any() && !request.AllProducts && string.IsNullOrWhiteSpace(request.Search))
        {
            var allowedProductIds = _context.DtlPriceBookItems
                .Where(i => customBookIds.Contains(i.PriceBookId))
                .Select(i => i.ProductId);

            query = query.Where(p => allowedProductIds.Contains(p.ProductId));
        }

        // 3. Lọc theo tình trạng tồn kho
        if (!string.IsNullOrWhiteSpace(request.StockCondition) && request.StockCondition != "ALL")
        {
            if (request.StockCondition.Equals("IN_STOCK", StringComparison.OrdinalIgnoreCase))
            {
                if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
                {
                    query = query.Where(p => p.TrxInventoryBalances.Any(b => b.WarehouseId == request.WarehouseId.Value && b.Quantity > 0));
                }
                else
                {
                    query = query.Where(p => p.TrxInventoryBalances.Any(b => b.Quantity > 0));
                }
            }
            else if (request.StockCondition.Equals("OUT_OF_STOCK", StringComparison.OrdinalIgnoreCase))
            {
                if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
                {
                    query = query.Where(p => !p.TrxInventoryBalances.Any(b => b.WarehouseId == request.WarehouseId.Value && b.Quantity > 0));
                }
                else
                {
                    query = query.Where(p => !p.TrxInventoryBalances.Any(b => b.Quantity > 0));
                }
            }
        }

        var pageIndex = Math.Max(1, request.PageIndex);
        var pageSize = Math.Clamp(request.PageSize, 5, 100);

        // Phân trang theo DÒNG: mỗi hàng 1 dòng + mỗi đơn vị quy đổi có mã riêng 1 dòng (kiểu KiotViet), để số dòng một trang
        // đúng bằng pageSize và tổng số khớp bảng. AllProducts (màn Bán hàng lấy giá theo mã hàng): chỉ dòng hàng như trước.
        int totalCount;
        List<MstProduct> pagedProducts;
        List<(int ProductId, string? UnitCode)> pageRows;
        if (request.AllProducts)
        {
            totalCount = await query.CountAsync(cancellationToken);
            pagedProducts = await query
                .OrderBy(p => p.ProductId)
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);
            pageRows = pagedProducts.Select(p => (p.ProductId, (string?)null)).ToList();
        }
        else
        {
            // Đọc nhẹ (mã, tên, variants_json, đơn vị cơ bản) của mọi hàng khớp bộ lọc để biết có bao nhiêu dòng
            var light = await query
                .OrderBy(p => p.ProductId)
                .Select(p => new { p.ProductId, p.ProductCode, p.ProductName, p.VariantsJson, BaseUnitName = p.BaseUnit != null ? p.BaseUnit.UnitName : null })
                .ToListAsync(cancellationToken);
            var allRows = light
                .SelectMany(x => RowCodes(
                        new MstProduct
                        {
                            ProductId = x.ProductId,
                            ProductCode = x.ProductCode,
                            ProductName = x.ProductName,
                            VariantsJson = x.VariantsJson,
                            BaseUnit = x.BaseUnitName == null ? null! : new MstUnit { UnitName = x.BaseUnitName },
                        },
                        search)
                    .Select(code => (x.ProductId, code)))
                .ToList();
            totalCount = allRows.Count;
            pageRows = allRows.Skip((pageIndex - 1) * pageSize).Take(pageSize).ToList();
            var pageIds = pageRows.Select(r => r.ProductId).Distinct().ToList();
            pagedProducts = await query.Where(p => pageIds.Contains(p.ProductId)).ToListAsync(cancellationToken);
        }

        var productIds = pagedProducts.Select(p => p.ProductId).ToList();

        // 4. Lấy trước giá của các sản phẩm trên các bảng giá đang chọn
        var priceItems = await _context.DtlPriceBookItems
            .Where(pi => targetBookIds.Contains(pi.PriceBookId) && productIds.Contains(pi.ProductId))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        // Group giá: (ProductId, PriceBookId) -> Price
        var priceMap = priceItems
            .GroupBy(pi => (pi.ProductId, pi.PriceBookId))
            .ToDictionary(g => g.Key, g => g.First().Price);

        // 5. Lấy đơn giá nhập cuối (Latest Purchase Price) cho danh sách sản phẩm này
        var receiptQuery = _context.DtlGoodsReceiptItems
            .Include(item => item.Gr)
            .Where(item => productIds.Contains(item.ProductId) && item.Gr.ReceivedDate != null && item.Gr.Status == "COMPLETED");

        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            receiptQuery = receiptQuery.Where(item => item.Gr.WarehouseId == request.WarehouseId.Value);
        }

        var latestReceiptItems = await receiptQuery
            .OrderByDescending(item => item.Gr.ReceivedDate)
            .Select(item => new { item.ProductId, UnitCost = item.UnitLandedCost ?? 0 })
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var latestPurchasePriceMap = latestReceiptItems
            .GroupBy(x => x.ProductId)
            .ToDictionary(g => g.Key, g => g.First().UnitCost);

        // 6. Dựng mọi dòng của các hàng trên trang (khóa "" = dòng hàng, mã đơn vị = dòng đơn vị) rồi lấy đúng các dòng của trang
        var rowsByProduct = pagedProducts.ToDictionary(p => p.ProductId, p =>
        {
            decimal costPrice;
            decimal stockQty;

            if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
            {
                // Một kho có thể có nhiều dòng tồn (vị trí / lô): cộng dồn SL, giá vốn bình quân theo SL dương
                var bals = p.TrxInventoryBalances.Where(b => b.WarehouseId == request.WarehouseId.Value).ToList();
                stockQty = bals.Sum(b => b.Quantity ?? 0);
                costPrice = InventoryCosting.CostOf(bals, p.MovingAverageCost ?? 0);
            }
            else
            {
                costPrice = p.MovingAverageCost ?? 0;
                stockQty = p.TrxInventoryBalances.Sum(b => b.Quantity ?? 0);
            }

            decimal latestPurchasePrice = 0;
            if (latestPurchasePriceMap.TryGetValue(p.ProductId, out var lp))
            {
                latestPurchasePrice = lp;
            }
            else
            {
                latestPurchasePrice = costPrice;
            }

            // Dictionary giá theo từng bảng giá
            var prices = new Dictionary<int, decimal?>();
            // Bảng giá chung = Giá bán của hàng hóa (MstProducts.StandardPrice), cùng công thức với Danh mục hàng hóa.
            // Không đọc dòng đã lưu của bảng giá chung: sửa giá ở form hàng hóa không cập nhật dòng đó nên có thể đã cũ.
            var productCost = p.MovingAverageCost ?? 0;
            decimal standardBasePrice = p.StandardPrice ?? (productCost > 0 ? Math.Round(productCost * 1.35m, 0) : 0);

            foreach (var bookId in targetBookIds)
            {
                if (targetBooks.TryGetValue(bookId, out var currentBook) && currentBook.IsDefault)
                {
                    prices[bookId] = standardBasePrice;
                }
                else if (priceMap.TryGetValue((p.ProductId, bookId), out var price))
                {
                    prices[bookId] = price;
                }
                else
                {
                    if (targetBooks.TryGetValue(bookId, out var targetBook) && !string.IsNullOrWhiteSpace(targetBook.FormulaBaseType))
                    {
                        decimal sourcePrice = targetBook.FormulaBaseType == "COST" ? costPrice : standardBasePrice;
                        prices[bookId] = PriceFormulaCalculator.CalculatePrice(
                            sourcePrice,
                            targetBook.FormulaOperator,
                            targetBook.FormulaValue,
                            targetBook.FormulaUnit
                        );
                    }
                    else
                    {
                        prices[bookId] = standardBasePrice;
                    }
                }
            }

            var productName = p.ProductName ?? "";
            var rows = new Dictionary<string, PriceBookMatrixItemDto>(StringComparer.OrdinalIgnoreCase)
            {
                [""] = new PriceBookMatrixItemDto(
                    ProductId: p.ProductId,
                    ProductCode: p.ProductCode ?? $"SP{p.ProductId:D5}",
                    ProductName: productName,
                    CategoryName: p.Category?.CategoryName ?? "Chung",
                    UnitName: p.BaseUnit?.UnitName ?? p.BaseUnit?.Abbreviation ?? "Cái",
                    CostPrice: costPrice,
                    LatestPurchasePrice: latestPurchasePrice,
                    StockQuantity: stockQty,
                    Prices: prices
                ),
            };

            // Đơn vị quy đổi: giá = giá bán đã thiết lập cho đơn vị (Hàng cùng loại), chưa có thì giá đơn vị cơ bản × quy đổi
            // (giống cách màn Bán hàng tính giá theo đơn vị). Giá vốn × quy đổi, tồn ÷ quy đổi.
            if (!request.AllProducts)
            {
                foreach (var unit in UnitRowsOf(p))
                {
                    var unitCode = unit.Code!.Trim();
                    var unitPrices = prices.ToDictionary(
                        kv => kv.Key,
                        kv => (decimal?)(unit.SalePrice > 0 ? unit.SalePrice : Math.Round((kv.Value ?? 0) * unit.Rate, 0)));
                    rows[unitCode] = new PriceBookMatrixItemDto(
                        ProductId: p.ProductId,
                        ProductCode: unitCode,
                        ProductName: $"{productName} ({unit.Name})",
                        CategoryName: p.Category?.CategoryName ?? "Chung",
                        UnitName: unit.Name,
                        CostPrice: Math.Round(costPrice * unit.Rate, 2),
                        LatestPurchasePrice: Math.Round(latestPurchasePrice * unit.Rate, 2),
                        StockQuantity: Math.Round(stockQty / unit.Rate, 2),
                        Prices: unitPrices,
                        UnitCode: unitCode,
                        ConversionRate: unit.Rate
                    );
                }
            }
            return rows;
        });

        var items = pageRows
            .Where(r => rowsByProduct.ContainsKey(r.ProductId))
            .Select(r => rowsByProduct[r.ProductId].TryGetValue(r.UnitCode ?? "", out var row) ? row : rowsByProduct[r.ProductId][""])
            .ToList();

        var result = new PriceBookMatrixResultDto(
            Items: items,
            TotalCount: totalCount,
            PageIndex: pageIndex,
            PageSize: pageSize
        );

        return Result.Success(result);
    }

    /// <summary>Đơn vị quy đổi có mã riêng (khác mã hàng) của hàng, mỗi mã một lần</summary>
    private static IEnumerable<SaleUnit> UnitRowsOf(MstProduct p) =>
        ProductSaleUnits.Parse(p)
            .Where(u => !u.IsBase && !string.IsNullOrWhiteSpace(u.Code) &&
                        !u.Code!.Trim().Equals(p.ProductCode, StringComparison.OrdinalIgnoreCase))
            .GroupBy(u => u.Code!.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First());

    /// <summary>
    /// Các dòng của một hàng trong bảng: null = dòng hàng, còn lại = mã đơn vị quy đổi.
    /// Đang tìm kiếm: dòng hàng khi chính hàng khớp (mã / tên), dòng đơn vị khi hàng khớp hoặc mã / tên đơn vị khớp;
    /// khớp ở phần khác của variants_json (VD giá trị thuộc tính) mà không ra dòng nào thì hiện dòng hàng.
    /// </summary>
    private static List<string?> RowCodes(MstProduct p, string search)
    {
        var rows = new List<string?>();
        var baseMatches = search.Length == 0 ||
            (p.ProductCode ?? "").ToLower().Contains(search) ||
            (p.ProductName ?? "").ToLower().Contains(search);
        if (baseMatches) rows.Add(null);
        foreach (var unit in UnitRowsOf(p))
        {
            var code = unit.Code!.Trim();
            if (baseMatches || code.ToLower().Contains(search) || unit.Name.ToLower().Contains(search))
            {
                rows.Add(code);
            }
        }
        if (rows.Count == 0) rows.Add(null);
        return rows;
    }
}
