using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StockFlow.Infrastructure.Persistence;

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
        {
            options.UseNpgsql(
                configuration.GetConnectionString("StockFlowDb"),
                npgsql =>
                {
                    npgsql.MigrationsAssembly(typeof(StockFlowDbContext).Assembly.FullName);
                    npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "stockflow");
                }
            );
            options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        });

        // DbContext interface mapping
        services.AddScoped<StockFlow.Application.Common.Interfaces.IStockFlowDbContext>(sp =>
            sp.GetRequiredService<StockFlowDbContext>());

        // Auth & Identity services
        services.AddHttpContextAccessor();
        services.AddScoped<StockFlow.Application.Common.Interfaces.IPasswordHasher, Services.BcryptPasswordHasher>();
        services.AddScoped<StockFlow.Application.Common.Interfaces.IJwtTokenGenerator, Services.JwtTokenGenerator>();
        services.AddScoped<StockFlow.Application.Common.Interfaces.ICurrentUserService, Services.CurrentUserService>();
        services.AddScoped<StockFlow.Application.Common.Interfaces.IUserPermissionService, Services.UserPermissionService>();
        services.AddScoped<StockFlow.Application.Common.Interfaces.ITransactionCodeGenerator, Services.TransactionCodeGenerator>();

        // Lưu ảnh hàng hóa thành file trên máy chủ (singleton: dùng chung một HttpClient để tải ảnh từ link)
        services.AddSingleton<StockFlow.Application.Common.Interfaces.IImageStorage, Services.LocalImageStorage>();

        return services;
    }
}
