using System;

namespace StockFlow.Application.Features.PriceBooks.Services;

public static class PriceFormulaCalculator
{
    public static decimal CalculatePrice(
        decimal basePrice,
        string? op,
        decimal? val,
        string? unit)
    {
        if (string.IsNullOrWhiteSpace(op) || !val.HasValue || val.Value <= 0)
        {
            return Math.Max(0, Math.Round(basePrice, 0));
        }

        var isPercent = string.Equals(unit, "PERCENT", StringComparison.OrdinalIgnoreCase);
        decimal newPrice;

        if (isPercent)
        {
            var delta = basePrice * (val.Value / 100m);
            newPrice = op == "-" ? (basePrice - delta) : (basePrice + delta);
        }
        else // VND
        {
            newPrice = op == "-" ? (basePrice - val.Value) : (basePrice + val.Value);
        }

        return Math.Max(0, Math.Round(newPrice, 0));
    }
}
