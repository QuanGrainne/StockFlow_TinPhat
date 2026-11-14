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

public record UpdatePriceBookCommand(
    int PriceBookId,
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
    bool RecalculateFormula = false,
    /// <summary>false = bỏ liên kết công thức (giá hiện có giữ nguyên)</summary>
    bool LinkFormula = true
) : IRequest<Result<PriceBookDto>>;

public class UpdatePriceBookCommandValidator : AbstractValidator<UpdatePriceBookCommand>
{
    public UpdatePriceBookCommandValidator()
    {
        RuleFor(x => x.PriceBookId)
            .GreaterThan(0).WithMessage("ID bảng giá không hợp lệ.");

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

public class UpdatePriceBookCommandHandler : IRequestHandler<UpdatePriceBookCommand, Result<PriceBookDto>>
{
    private readonly IStockFlowDbContext _context;

    public UpdatePriceBookCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<PriceBookDto>> Handle(UpdatePriceBookCommand request, CancellationToken cancellationToken)
    {
        var pb = await _context.MstPriceBooks
            .FirstOrDefaultAsync(p => p.PriceBookId == request.PriceBookId, cancellationToken);

        if (pb == null)
        {
            return Result.Failure<PriceBookDto>("Không tìm thấy bảng giá cần sửa.");
        }

        // Bảng giá chung: luôn áp dụng, toàn hệ thống, mọi khách (POS dùng làm bảng giá mặc định)
        var branchType = pb.IsDefault ? PriceBookScope.All : PriceBookScope.NormalizeType(request.ScopeBranchType);
        var customerType = pb.IsDefault ? PriceBookScope.All : PriceBookScope.NormalizeType(request.ScopeCustomerType);
        var warehouseIds = branchType == PriceBookScope.Specific ? (request.ScopeWarehouseIds ?? new()).Distinct().ToList() : new List<int>();
        var customerIds = customerType == PriceBookScope.Specific ? (request.ScopeCustomerIds ?? new()).Distinct().ToList() : new List<int>();

        var scopeError = await PriceBookScope.ValidateAsync(_context, branchType, warehouseIds, customerType, customerIds, cancellationToken);
        if (scopeError != null) return Result.Failure<PriceBookDto>(scopeError);

        var formulaError = await PriceBookFormulaRules.ValidateBaseAsync(_context, request.FormulaBaseType, request.FormulaBasePriceBookId, pb.PriceBookId, cancellationToken);
        if (formulaError != null) return Result.Failure<PriceBookDto>(formulaError);

        var hasFormula = !string.IsNullOrWhiteSpace(request.FormulaBaseType) && request.LinkFormula;

        pb.PriceBookName = request.PriceBookName.Trim();
        pb.EffectiveFrom = request.EffectiveFrom.HasValue ? VietnamTime.From(request.EffectiveFrom) : null;
        pb.EffectiveTo = request.EffectiveTo.HasValue ? VietnamTime.From(request.EffectiveTo) : null;
        pb.IsActive = pb.IsDefault || request.IsActive;
        if (hasFormula)
        {
            pb.FormulaBaseType = request.FormulaBaseType;
            pb.FormulaBasePriceBookId = request.FormulaBaseType == "PRICE_BOOK" ? request.FormulaBasePriceBookId : null;
            pb.FormulaOperator = request.FormulaOperator ?? "+";
            pb.FormulaValue = request.FormulaValue ?? 0;
            pb.FormulaUnit = request.FormulaUnit ?? "VND";
        }
        else
        {
            PriceBookFormulaRules.Clear(pb);
        }
        pb.AllowUnlistedProducts = request.AllowUnlistedProducts;
        pb.WarnUnlistedProducts = request.AllowUnlistedProducts && request.WarnUnlistedProducts;
        pb.ScopeBranchType = branchType;
        pb.ScopeWarehouseIds = PriceBookScope.SerializeIds(warehouseIds);
        pb.ScopeCustomerType = customerType;
        pb.ScopeCustomerIds = PriceBookScope.SerializeIds(customerIds);
        // Bỏ phạm vi "Người tạo giao dịch" và "Nhóm khách hàng" (không còn dùng)
        pb.ScopeUserType = PriceBookScope.All;
        pb.ScopeUserIds = null;
        pb.ScopeCustomerGroupCodes = null;
        pb.UpdatedAt = VietnamTime.Now;

        // Lưu thông tin + tính lại giá trong cùng 1 transaction (trước đây xóa giá cũ rồi mới tính, lỗi giữa chừng là mất giá)
        using var transaction = await _context.BeginTransactionAsync(cancellationToken);
        try
        {
            await _context.SaveChangesAsync(cancellationToken);

            if (request.RecalculateFormula && hasFormula)
            {
                // Chỉ tính lại giá cho các sản phẩm HIỆN CÓ trong bảng giá này, không nạp toàn bộ danh mục sản phẩm khác
                var oldItems = await _context.DtlPriceBookItems
                    .Where(i => i.PriceBookId == pb.PriceBookId)
                    .ToListAsync(cancellationToken);

                if (oldItems.Any())
                {
                    var targetProductIds = oldItems.Select(i => i.ProductId).Distinct().ToList();
                    _context.DtlPriceBookItems.RemoveRange(oldItems);
                    await _context.SaveChangesAsync(cancellationToken);

                    await ApplyFormulaForBook(pb, targetProductIds, cancellationToken);
                }
            }

            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }

        return Result.Success(await PriceBookDtoBuilder.BuildAsync(_context, pb, cancellationToken));
    }

    private async Task ApplyFormulaForBook(MstPriceBook priceBook, List<int>? targetProductIds, CancellationToken cancellationToken)
    {
        var productsQuery = _context.MstProducts
            .Include(p => p.TrxInventoryBalances)
            .Where(p => p.IsActive != false);

        if (targetProductIds != null)
        {
            productsQuery = productsQuery.Where(p => targetProductIds.Contains(p.ProductId));
        }

        var products = await productsQuery.ToListAsync(cancellationToken);

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

        Dictionary<int, decimal>? baseBookPrices = null;
        if (priceBook.FormulaBaseType == "PRICE_BOOK" && priceBook.FormulaBasePriceBookId.HasValue)
        {
            baseBookPrices = await _context.DtlPriceBookItems
                .Where(i => i.PriceBookId == priceBook.FormulaBasePriceBookId.Value)
                .ToDictionaryAsync(i => i.ProductId, i => i.Price, cancellationToken);
        }

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
