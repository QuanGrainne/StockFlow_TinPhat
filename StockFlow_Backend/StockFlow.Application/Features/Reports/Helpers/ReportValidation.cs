using FluentValidation;

namespace StockFlow.Application.Features.Reports.Helpers;

/// <summary>Tham số kỳ + kho chung của các query báo cáo.</summary>
public interface IReportPeriodQuery
{
    DateOnly From { get; }
    DateOnly To { get; }
    int? WarehouseId { get; }
}

/// <summary>Luật kiểm dùng chung cho validator của các báo cáo.</summary>
public static class ReportValidation
{
    public const int MaxPageSize = 500;

    /// <summary>Từ ngày ≤ đến ngày, kỳ tối đa 366 ngày, mã kho (nếu có) &gt; 0.</summary>
    public static void AddPeriodRules<T>(AbstractValidator<T> validator) where T : IReportPeriodQuery
    {
        validator.RuleFor(x => x.From).LessThanOrEqualTo(x => x.To).WithMessage("Từ ngày phải trước hoặc bằng đến ngày.");
        validator.RuleFor(x => x.To)
            .Must((x, to) => x.From > to || ReportScope.IsValidPeriod(x.From, to))
            .WithMessage($"Kỳ báo cáo tối đa {ReportScope.MaxPeriodDays} ngày.");
        validator.RuleFor(x => x.WarehouseId).GreaterThan(0).When(x => x.WarehouseId.HasValue).WithMessage("Kho không hợp lệ.");
    }

    public static void AddPagingRules<T>(AbstractValidator<T> validator, Func<T, int> page, Func<T, int> pageSize)
    {
        validator.RuleFor(x => page(x)).GreaterThanOrEqualTo(1).OverridePropertyName("Page").WithMessage("Trang phải từ 1 trở lên.");
        validator.RuleFor(x => pageSize(x)).InclusiveBetween(1, MaxPageSize).OverridePropertyName("PageSize")
            .WithMessage($"Số dòng mỗi trang từ 1 đến {MaxPageSize}.");
    }
}
