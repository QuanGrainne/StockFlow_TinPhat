using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StockFlow.Domain.Interfaces;
using StockFlow.Infrastructure.Persistence;
using StockFlow.Infrastructure.Repositories;

namespace StockFlow.Infrastructure;

/// <summary>
/// Registers Infrastructure layer services (EF Core, repositories, etc.) into DI.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // PostgreSQL via Npgsql
        services.AddDbContext<StockFlowDbContext>(options =>
            options.UseNpgsql(
                configuration.GetConnectionString("StockFlowDb"),
                npgsql =>
                {
                    npgsql.MigrationsAssembly(typeof(StockFlowDbContext).Assembly.FullName);
                    npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "stockflow");
                }
            )
        );

        // DbContext interface mapping
        services.AddScoped<StockFlow.Application.Common.Interfaces.IStockFlowDbContext>(sp =>
            sp.GetRequiredService<StockFlowDbContext>());

        // Auth services
        services.AddScoped<StockFlow.Application.Common.Interfaces.IPasswordHasher, Services.BcryptPasswordHasher>();
        services.AddScoped<StockFlow.Application.Common.Interfaces.IJwtTokenGenerator, Services.JwtTokenGenerator>();

        // Unit of Work
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Generic repository (concrete feature repos will also be registered here)
        services.AddScoped(typeof(IRepository<>), typeof(GenericRepository<>));

        return services;
    }
}
