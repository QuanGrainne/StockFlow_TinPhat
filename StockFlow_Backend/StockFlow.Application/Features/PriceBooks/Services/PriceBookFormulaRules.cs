using System.Linq.Expressions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PriceBooks.Services;

/// <summary>Luật công thức giá dùng chung cho tạo và sửa bảng giá.</summary>
public static class PriceBookFormulaRules
{
    public static readonly string[] BaseTypes = { "COST", "LATEST_PURCHASE", "STANDARD", "PRICE_BOOK" };

    public static void Apply<T>(
        AbstractValidator<T> v,
        Expression<Func<T, string?>> baseType,
        Expression<Func<T, int?>> basePriceBookId,
        Expression<Func<T, string?>> op,
        Expression<Func<T, decimal?>> value,
        Expression<Func<T, string?>> unit)
    {
        var baseTypeFn = baseType.Compile();
        var baseIdFn = basePriceBookId.Compile();
        bool HasFormula(T x) => !string.IsNullOrWhiteSpace(baseTypeFn(x));

        v.RuleFor(baseType)
            .Must(t => t == null || BaseTypes.Contains(t))
            .WithMessage("Nguồn giá của công thức không hợp lệ.");

        v.RuleFor(x => x)
            .Must(x => baseTypeFn(x) != "PRICE_BOOK" || baseIdFn(x) is > 0)
            .WithMessage("Vui lòng chọn bảng giá nguồn cho công thức.");

        v.RuleFor(op).Must(o => o == null || o == "+" || o == "-")
            .When(HasFormula).WithMessage("Toán tử phải là '+' hoặc '-'.");

        v.RuleFor(unit).Must(u => u == null || u == "VND" || u == "PERCENT")
            .When(HasFormula).WithMessage("Đơn vị điều chỉnh phải là 'VND' hoặc 'PERCENT'.");

        v.RuleFor(value).Must(val => val == null || val >= 0)
            .When(HasFormula).WithMessage("Giá trị điều chỉnh không được âm.");
    }

    /// <summary>
    /// Bảng giá nguồn phải tồn tại, khác chính nó và không tạo vòng (A lấy giá từ B, B lại lấy từ A).
    /// </summary>
    public static async Task<string?> ValidateBaseAsync(
        IStockFlowDbContext context, string? baseType, int? basePriceBookId, int? selfId, CancellationToken ct)
    {
        if (baseType != "PRICE_BOOK" || !basePriceBookId.HasValue) return null;
        if (selfId.HasValue && basePriceBookId.Value == selfId.Value)
            return "Bảng giá không thể lấy giá từ chính nó.";

        var visited = new HashSet<int>();
        int? current = basePriceBookId;
        while (current.HasValue)
        {
            if (!visited.Add(current.Value)) break;
            var next = await context.MstPriceBooks.AsNoTracking()
                .Where(b => b.PriceBookId == current.Value)
                .Select(b => new { b.PriceBookId, b.FormulaBaseType, b.FormulaBasePriceBookId })
                .FirstOrDefaultAsync(ct);
            if (next == null)
                return current == basePriceBookId ? "Không tìm thấy bảng giá nguồn." : null;
            if (selfId.HasValue && next.FormulaBaseType == "PRICE_BOOK" && next.FormulaBasePriceBookId == selfId.Value)
                return "Công thức tạo vòng lặp: bảng giá nguồn đang lấy giá từ bảng giá này.";
            current = next.FormulaBaseType == "PRICE_BOOK" ? next.FormulaBasePriceBookId : null;
        }
        return null;
    }

    /// <summary>Bỏ liên kết công thức (giá đã nạp giữ nguyên).</summary>
    public static void Clear(MstPriceBook pb)
    {
        pb.FormulaBaseType = null;
        pb.FormulaBasePriceBookId = null;
        pb.FormulaOperator = null;
        pb.FormulaValue = null;
        pb.FormulaUnit = null;
    }
}
