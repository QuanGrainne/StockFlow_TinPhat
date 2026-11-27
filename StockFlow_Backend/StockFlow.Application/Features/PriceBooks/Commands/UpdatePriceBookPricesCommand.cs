using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PriceBooks.DTOs;
using StockFlow.Application.Features.PriceBooks.Services;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PriceBooks.Commands;

public record UpdatePriceBookPricesCommand(
    int PriceBookId,
    List<UpdateProductPriceItemDto> Items
) : IRequest<Result>;

public class UpdatePriceBookPricesCommandHandler : IRequestHandler<UpdatePriceBookPricesCommand, Result>
{
    private readonly IStockFlowDbContext _context;

    public UpdatePriceBookPricesCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(UpdatePriceBookPricesCommand request, CancellationToken cancellationToken)
    {
        if (request.Items == null || !request.Items.Any())
        {
            return Result.Success();
        }

        var pb = await _context.MstPriceBooks
            .FirstOrDefaultAsync(p => p.PriceBookId == request.PriceBookId, cancellationToken);

        if (pb == null)
        {
            return Result.Failure("Không tìm thấy bảng giá.");
        }

        // Giá đơn vị quy đổi (UnitCode) chỉ sửa ở Bảng giá chung: lưu vào giá bán của đơn vị trong variants_json
        var unitItems = request.Items.Where(i => !string.IsNullOrWhiteSpace(i.UnitCode)).ToList();
        var baseItems = request.Items.Where(i => string.IsNullOrWhiteSpace(i.UnitCode)).ToList();
        if (unitItems.Count > 0 && !pb.IsDefault)
        {
            return Result.Failure("Giá của đơn vị quy đổi chỉ sửa được ở Bảng giá chung.");
        }
        if (unitItems.Count > 0)
        {
            var unitError = await UpdateUnitSalePricesAsync(unitItems, cancellationToken);
            if (unitError != null) return Result.Failure(unitError);
        }

        var productIds = baseItems.Select(i => i.ProductId).Distinct().ToList();
        var existingItems = await _context.DtlPriceBookItems
            .Where(i => i.PriceBookId == request.PriceBookId && productIds.Contains(i.ProductId))
            .ToListAsync(cancellationToken);

        var existingMap = existingItems.ToDictionary(i => i.ProductId, i => i);

        foreach (var item in baseItems)
        {
            var validPrice = Math.Max(0, item.Price);
            if (existingMap.TryGetValue(item.ProductId, out var existing))
            {
                existing.Price = validPrice;
                existing.UpdatedAt = VietnamTime.Now;
            }
            else
            {
                await _context.DtlPriceBookItems.AddAsync(new DtlPriceBookItem
                {
                    PriceBookId = request.PriceBookId,
                    ProductId = item.ProductId,
                    Price = validPrice,
                    UpdatedAt = VietnamTime.Now
                }, cancellationToken);
            }
        }

        pb.UpdatedAt = VietnamTime.Now;

        // Nếu cập nhật Bảng giá chung (hoặc bảng giá mặc định):
        // 1. Đồng bộ giá bán StandardPrice vào bảng MstProducts để toàn bộ hệ thống (danh mục hàng hóa, đơn hàng) nhận giá mới
        // 2. Tự động tính toán lại đơn giá cho các bảng giá khác có công thức dựa trên Giá chung
        if (pb.IsDefault)
        {
            var products = await _context.MstProducts
                .Where(p => productIds.Contains(p.ProductId))
                .ToListAsync(cancellationToken);

            var priceLookup = baseItems
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => Math.Max(0, g.Last().Price));
            foreach (var prod in products)
            {
                if (priceLookup.TryGetValue(prod.ProductId, out var newStdPrice))
                {
                    prod.StandardPrice = newStdPrice;
                }
            }

            // Tìm các bảng giá phụ thuộc theo công thức
            var dependentBooks = await _context.MstPriceBooks
                .Where(b => b.IsActive && !b.IsDefault &&
                    (b.FormulaBaseType == "STANDARD" ||
                     (b.FormulaBaseType == "PRICE_BOOK" && b.FormulaBasePriceBookId == pb.PriceBookId)))
                .ToListAsync(cancellationToken);

            if (dependentBooks.Any())
            {
                var depBookIds = dependentBooks.Select(b => b.PriceBookId).ToList();
                var depExistingItems = await _context.DtlPriceBookItems
                    .Where(i => depBookIds.Contains(i.PriceBookId) && productIds.Contains(i.ProductId))
                    .ToListAsync(cancellationToken);

                var depItemMap = depExistingItems
                    .GroupBy(i => (i.PriceBookId, i.ProductId))
                    .ToDictionary(g => g.Key, g => g.First());

                foreach (var depBook in dependentBooks)
                {
                    foreach (var item in baseItems)
                    {
                        var basePrice = Math.Max(0, item.Price);
                        var calculatedPrice = PriceFormulaCalculator.CalculatePrice(
                            basePrice,
                            depBook.FormulaOperator,
                            depBook.FormulaValue,
                            depBook.FormulaUnit
                        );

                        if (depItemMap.TryGetValue((depBook.PriceBookId, item.ProductId), out var existingDepItem))
                        {
                            existingDepItem.Price = calculatedPrice;
                            existingDepItem.UpdatedAt = VietnamTime.Now;
                        }
                        else
                        {
                            await _context.DtlPriceBookItems.AddAsync(new DtlPriceBookItem
                            {
                                PriceBookId = depBook.PriceBookId,
                                ProductId = item.ProductId,
                                Price = calculatedPrice,
                                UpdatedAt = VietnamTime.Now
                            }, cancellationToken);
                        }
                    }

                    depBook.UpdatedAt = VietnamTime.Now;
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    /// <summary>
    /// Ghi giá bán của đơn vị quy đổi (theo mã đơn vị) vào variants_json của hàng: mọi dòng "variants" có Code trùng.
    /// Trả thông báo lỗi nếu không tìm thấy đơn vị; null = thành công (chưa SaveChanges).
    /// </summary>
    private async Task<string?> UpdateUnitSalePricesAsync(List<UpdateProductPriceItemDto> unitItems, CancellationToken ct)
    {
        var ids = unitItems.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.MstProducts.Where(p => ids.Contains(p.ProductId)).ToListAsync(ct);
        foreach (var group in unitItems.GroupBy(i => i.ProductId))
        {
            var product = products.FirstOrDefault(p => p.ProductId == group.Key);
            if (product == null || string.IsNullOrWhiteSpace(product.VariantsJson))
            {
                return $"Không tìm thấy hàng hóa có đơn vị quy đổi (id {group.Key}).";
            }

            JsonNode? root;
            try
            {
                root = JsonNode.Parse(product.VariantsJson);
            }
            catch (System.Text.Json.JsonException)
            {
                return $"Dữ liệu đơn vị của hàng {product.ProductCode} bị lỗi, không lưu được giá.";
            }
            var variants = (root?["variants"] ?? root?["Variants"]) as JsonArray;
            if (variants == null)
            {
                return $"Hàng {product.ProductCode} chưa thiết lập đơn vị quy đổi.";
            }

            foreach (var item in group)
            {
                var code = item.UnitCode!.Trim();
                var matched = false;
                foreach (var v in variants.OfType<JsonObject>())
                {
                    var vCode = (v["Code"] ?? v["code"])?.GetValue<string>();
                    if (vCode == null || !vCode.Trim().Equals(code, StringComparison.OrdinalIgnoreCase)) continue;
                    var key = v.ContainsKey("SalePrice") || !v.ContainsKey("salePrice") ? "SalePrice" : "salePrice";
                    v[key] = Math.Max(0, item.Price);
                    matched = true;
                }
                if (!matched)
                {
                    return $"Không tìm thấy đơn vị có mã {code} của hàng {product.ProductCode}.";
                }
            }
            product.VariantsJson = root!.ToJsonString();
        }
        return null;
    }
}
