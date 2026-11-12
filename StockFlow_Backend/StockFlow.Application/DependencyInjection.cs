using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using StockFlow.Application.Behaviors;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;

namespace StockFlow.Application;

/// <summary>
/// Registers Application layer services into the DI container.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(assembly);
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
            // Sau validation: chỉ chạy lại handler khi xung đột tồn kho (command đánh dấu IRetryOnConcurrencyConflict)
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ConcurrencyRetryBehavior<,>));
        });

        services.AddValidatorsFromAssembly(assembly);

        // Sổ tồn kho dùng chung (cập nhật tồn + ghi thẻ kho); dùng chung DbContext scoped của request
        services.AddScoped<IInventoryLedger, InventoryLedger>();

        return services;
    }
}
