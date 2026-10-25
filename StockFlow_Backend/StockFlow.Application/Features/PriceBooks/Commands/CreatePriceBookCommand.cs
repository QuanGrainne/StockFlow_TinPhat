using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PriceBooks.DTOs;
using StockFlow.Application.Features.PriceBooks.Services;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PriceBooks.Commands;

public record CreatePriceBookCommand(
    string PriceBookName,
    DateTime? EffectiveFrom = null,
    DateTime? EffectiveTo = null,
    bool IsActive = true,
    string? FormulaBaseType = null,
    int? FormulaBasePriceBookId = null,
    string? FormulaOperator = null,
    decimal? FormulaValue = null,
    string? FormulaUnit = null,
    bool AllowUnlistedProducts = true,
    bool WarnUnlistedProducts = false,
    string ScopeBranchType = "ALL",
    List<int>? ScopeWarehouseIds = null,
    string ScopeCustomerType = "ALL",
    List<string>? ScopeCustomerGroupCodes = null,
    string ScopeUserType = "ALL",
    List<int>? ScopeUserIds = null,
    bool AutoApplyFormula = true
) : IRequest<Result<PriceBookDto>>;

public class CreatePriceBookCommandValidator : AbstractValidator<CreatePriceBookCommand>
{
    public CreatePriceBookCommandValidator()
    {
        RuleFor(x => x.PriceBookName)
            .NotEmpty().WithMessage("Tên bảng giá không được để trống.")
            .MaximumLength(255).WithMessage("Tên bảng giá không vượt quá 255 ký tự.");

        When(x => !string.IsNullOrWhiteSpace(x.FormulaBaseType), () =>
        {
            RuleFor(x => x.FormulaOperator)
                .Must(op => op == "+" || op == "-")
                .When(x => x.FormulaValue.HasValue && x.FormulaValue > 0)
                .WithMessage("Toán tử phải là '+' hoặc '-'.");

            RuleFor(x => x.FormulaUnit)
                .Must(u => u == "VND" || u == "PERCENT")
                .When(x => x.FormulaValue.HasValue && x.FormulaValue > 0)
                .WithMessage("Đơn vị điều chỉnh phải là 'VND' hoặc 'PERCENT'.");
        });
    }
}

public class CreatePriceBookCommandHandler : IRequestHandler<CreatePriceBookCommand, Result<PriceBookDto>>
{
    private readonly IStockFlowDbContext _context;

    public CreatePriceBookCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<PriceBookDto>> Handle(CreatePriceBookCommand request, CancellationToken cancellationToken)
    {
        var count = await _context.MstPriceBooks.CountAsync(cancellationToken);
        var code = $"BG{(count + 1):D6}";

        var priceBook = new MstPriceBook
        {
            PriceBookCode = code,
            PriceBookName = request.PriceBookName.Trim(),
            EffectiveFrom = request.EffectiveFrom,
            EffectiveTo = request.EffectiveTo,
            IsActive = request.IsActive,
            IsDefault = false,
            FormulaBaseType = request.FormulaBaseType,
            FormulaBasePriceBookId = request.FormulaBasePriceBookId,
            FormulaOperator = request.FormulaOperator,
            FormulaValue = request.FormulaValue,
            FormulaUnit = request.FormulaUnit,
            AllowUnlistedProducts = request.AllowUnlistedProducts,
            WarnUnlistedProducts = request.WarnUnlistedProducts,
            ScopeBranchType = request.ScopeBranchType ?? "ALL",
            ScopeWarehouseIds = request.ScopeWarehouseIds != null && request.ScopeWarehouseIds.Any()
                ? JsonSerializer.Serialize(request.ScopeWarehouseIds) : null,
            ScopeCustomerType = request.ScopeCustomerType ?? "ALL",
            ScopeCustomerGroupCodes = request.ScopeCustomerGroupCodes != null && request.ScopeCustomerGroupCodes.Any()
                ? JsonSerializer.Serialize(request.ScopeCustomerGroupCodes) : null,
            ScopeUserType = request.ScopeUserType ?? "ALL",
            ScopeUserIds = request.ScopeUserIds != null && request.ScopeUserIds.Any()
                ? JsonSerializer.Serialize(request.ScopeUserIds) : null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.MstPriceBooks.AddAsync(priceBook, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        // Tự động tính giá và áp dụng cho các sản phẩm nếu có công thức hoặc auto-apply
        if (request.AutoApplyFormula)
        {
            await ApplyFormulaInternal(priceBook, cancellationToken);
        }

        return Result.Success(new PriceBookDto(
            PriceBookId: priceBook.PriceBookId,
            PriceBookCode: priceBook.PriceBookCode,
            PriceBookName: priceBook.PriceBookName,
            EffectiveFrom: priceBook.EffectiveFrom,
            EffectiveTo: priceBook.EffectiveTo,
            IsActive: priceBook.IsActive,
            IsDefault: priceBook.IsDefault,
            FormulaBaseType: priceBook.FormulaBaseType,
            FormulaBasePriceBookId: priceBook.FormulaBasePriceBookId,
            FormulaBasePriceBookName: null,
            FormulaOperator: priceBook.FormulaOperator,
            FormulaValue: priceBook.FormulaValue,
            FormulaUnit: priceBook.FormulaUnit,
            AllowUnlistedProducts: priceBook.AllowUnlistedProducts,
            WarnUnlistedProducts: priceBook.WarnUnlistedProducts,
            ScopeBranchType: priceBook.ScopeBranchType,
            ScopeWarehouseIds: request.ScopeWarehouseIds,
            ScopeCustomerType: priceBook.ScopeCustomerType,
            ScopeCustomerGroupCodes: request.ScopeCustomerGroupCodes,
            ScopeUserType: priceBook.ScopeUserType,
            ScopeUserIds: request.ScopeUserIds,
            TotalItemsCount: await _context.DtlPriceBookItems.CountAsync(i => i.PriceBookId == priceBook.PriceBookId, cancellationToken),
            UpdatedAt: priceBook.UpdatedAt
        ));
    }

    private async Task ApplyFormulaInternal(MstPriceBook priceBook, CancellationToken cancellationToken)
    {
        var products = await _context.MstProducts
            .Include(p => p.TrxInventoryBalances)
            .Where(p => p.IsActive != false)
            .ToListAsync(cancellationToken);

        int? primaryWarehouseId = null;
        if (!string.IsNullOrWhiteSpace(priceBook.ScopeWarehouseIds))
        {
            try
            {
                var wIds = JsonSerializer.Deserialize<List<int>>(priceBook.ScopeWarehouseIds);
                if (wIds != null && wIds.Any()) primaryWarehouseId = wIds.First();
            }
            catch { }
        }

        // Lấy giá tham chiếu nếu FormulaBaseType = "PRICE_BOOK"
        Dictionary<int, decimal>? baseBookPrices = null;
        if (priceBook.FormulaBaseType == "PRICE_BOOK" && priceBook.FormulaBasePriceBookId.HasValue)
        {
            baseBookPrices = await _context.DtlPriceBookItems
                .Where(i => i.PriceBookId == priceBook.FormulaBasePriceBookId.Value)
                .ToDictionaryAsync(i => i.ProductId, i => i.Price, cancellationToken);
        }

        // Lấy giá nhập cuối nếu FormulaBaseType = "LATEST_PURCHASE"
        Dictionary<int, decimal>? latestPurchasePrices = null;
        if (priceBook.FormulaBaseType == "LATEST_PURCHASE")
        {
            var receiptQuery = _context.DtlGoodsReceiptItems
                .Include(r => r.Gr)
                .Where(r => r.Gr.ReceivedDate != null);

            if (primaryWarehouseId.HasValue)
            {
                receiptQuery = receiptQuery.Where(r => r.Gr.WarehouseId == primaryWarehouseId.Value);
            }

            var latestItems = await receiptQuery
                .OrderByDescending(r => r.Gr.ReceivedDate)
                .Select(r => new { r.ProductId, UnitCost = r.UnitLandedCost ?? 0 })
                .ToListAsync(cancellationToken);

            latestPurchasePrices = latestItems
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.First().UnitCost);
        }

        var priceItems = new List<DtlPriceBookItem>();

        foreach (var p in products)
        {
            decimal basePrice;
            switch (priceBook.FormulaBaseType)
            {
                case "COST":
                    if (primaryWarehouseId.HasValue)
                    {
                        var b = p.TrxInventoryBalances.FirstOrDefault(x => x.WarehouseId == primaryWarehouseId.Value);
                        basePrice = b?.UnitCost ?? p.MovingAverageCost ?? 0;
                    }
                    else
                    {
                        basePrice = p.MovingAverageCost ?? 0;
                    }
                    break;

                case "LATEST_PURCHASE":
                    if (latestPurchasePrices != null && latestPurchasePrices.TryGetValue(p.ProductId, out var lp))
                    {
                        basePrice = lp;
                    }
                    else
                    {
                        basePrice = p.MovingAverageCost ?? 0;
                    }
                    break;

                case "PRICE_BOOK":
                    if (baseBookPrices != null && baseBookPrices.TryGetValue(p.ProductId, out var bp))
                    {
                        basePrice = bp;
                    }
                    else
                    {
                        basePrice = p.StandardPrice ?? 0;
                    }
                    break;

                case "STANDARD":
                default:
                    basePrice = p.StandardPrice ?? (p.MovingAverageCost > 0 ? Math.Round(p.MovingAverageCost.Value * 1.35m, 0) : 0);
                    break;
            }

            var calculatedPrice = PriceFormulaCalculator.CalculatePrice(
                basePrice,
                priceBook.FormulaOperator,
                priceBook.FormulaValue,
                priceBook.FormulaUnit
            );

            priceItems.Add(new DtlPriceBookItem
            {
                PriceBookId = priceBook.PriceBookId,
                ProductId = p.ProductId,
                Price = calculatedPrice,
                UpdatedAt = DateTime.UtcNow
            });
        }

        if (priceItems.Any())
        {
            await _context.DtlPriceBookItems.AddRangeAsync(priceItems, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
