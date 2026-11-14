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
    List<int>? ScopeCustomerIds = null,
    bool AutoApplyFormula = true,
    /// <summary>
    /// true = giữ liên kết công thức (giá tự cập nhật khi nguồn đổi);
    /// false = chỉ dùng công thức để tính giá lúc tạo rồi bỏ liên kết.
    /// </summary>
    bool LinkFormula = true
) : IRequest<Result<PriceBookDto>>;

public class CreatePriceBookCommandValidator : AbstractValidator<CreatePriceBookCommand>
{
    public CreatePriceBookCommandValidator()
    {
        RuleFor(x => x.PriceBookName)
            .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Tên bảng giá không được để trống.")
            .MaximumLength(255).WithMessage("Tên bảng giá không vượt quá 255 ký tự.");

        RuleFor(x => x)
            .Must(x => !x.EffectiveFrom.HasValue || !x.EffectiveTo.HasValue || x.EffectiveFrom <= x.EffectiveTo)
            .WithMessage("Ngày bắt đầu hiệu lực phải trước ngày kết thúc.");

        PriceBookFormulaRules.Apply(this, x => x.FormulaBaseType, x => x.FormulaBasePriceBookId,
            x => x.FormulaOperator, x => x.FormulaValue, x => x.FormulaUnit);
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
        var branchType = PriceBookScope.NormalizeType(request.ScopeBranchType);
        var customerType = PriceBookScope.NormalizeType(request.ScopeCustomerType);
        var warehouseIds = branchType == PriceBookScope.Specific ? (request.ScopeWarehouseIds ?? new()).Distinct().ToList() : new List<int>();
        var customerIds = customerType == PriceBookScope.Specific ? (request.ScopeCustomerIds ?? new()).Distinct().ToList() : new List<int>();

        var scopeError = await PriceBookScope.ValidateAsync(_context, branchType, warehouseIds, customerType, customerIds, cancellationToken);
        if (scopeError != null) return Result.Failure<PriceBookDto>(scopeError);

        var formulaError = await PriceBookFormulaRules.ValidateBaseAsync(_context, request.FormulaBaseType, request.FormulaBasePriceBookId, null, cancellationToken);
        if (formulaError != null) return Result.Failure<PriceBookDto>(formulaError);

        var hasFormula = !string.IsNullOrWhiteSpace(request.FormulaBaseType);
        var now = VietnamTime.Now;

        var priceBook = new MstPriceBook
        {
            PriceBookCode = await PriceBookDtoBuilder.NextCodeAsync(_context, cancellationToken),
            PriceBookName = request.PriceBookName.Trim(),
            // Trình duyệt gửi ISO UTC → lưu giờ Việt Nam như các module khác
            EffectiveFrom = request.EffectiveFrom.HasValue ? VietnamTime.From(request.EffectiveFrom) : null,
            EffectiveTo = request.EffectiveTo.HasValue ? VietnamTime.From(request.EffectiveTo) : null,
            IsActive = request.IsActive,
            IsDefault = false,
            FormulaBaseType = hasFormula ? request.FormulaBaseType : null,
            FormulaBasePriceBookId = hasFormula && request.FormulaBaseType == "PRICE_BOOK" ? request.FormulaBasePriceBookId : null,
            FormulaOperator = hasFormula ? request.FormulaOperator ?? "+" : null,
            FormulaValue = hasFormula ? request.FormulaValue ?? 0 : null,
            FormulaUnit = hasFormula ? request.FormulaUnit ?? "VND" : null,
            AllowUnlistedProducts = request.AllowUnlistedProducts,
            WarnUnlistedProducts = request.AllowUnlistedProducts && request.WarnUnlistedProducts,
            ScopeBranchType = branchType,
            ScopeWarehouseIds = PriceBookScope.SerializeIds(warehouseIds),
            ScopeCustomerType = customerType,
            ScopeCustomerIds = PriceBookScope.SerializeIds(customerIds),
            ScopeUserType = PriceBookScope.All,
            CreatedAt = now,
            UpdatedAt = now
        };

        // Tạo bảng giá + nạp giá theo công thức trong cùng 1 transaction
        using var transaction = await _context.BeginTransactionAsync(cancellationToken);
        try
        {
            await _context.MstPriceBooks.AddAsync(priceBook, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            if (request.AutoApplyFormula && hasFormula)
            {
                await ApplyFormulaInternal(priceBook, cancellationToken);
            }

            // Không giữ liên kết: công thức chỉ dùng để tính giá lúc tạo
            if (hasFormula && !request.LinkFormula)
            {
                PriceBookFormulaRules.Clear(priceBook);
                await _context.SaveChangesAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }

        return Result.Success(await PriceBookDtoBuilder.BuildAsync(_context, priceBook, cancellationToken));
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
                UpdatedAt = VietnamTime.Now
            });
        }

        if (priceItems.Any())
        {
            await _context.DtlPriceBookItems.AddRangeAsync(priceItems, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
