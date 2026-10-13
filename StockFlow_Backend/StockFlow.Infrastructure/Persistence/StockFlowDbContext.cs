using Microsoft.EntityFrameworkCore;

namespace StockFlow.Infrastructure.Persistence;

/// <summary>
/// Main EF Core DbContext backed by PostgreSQL via Npgsql.
/// Business DbSets will be added here as features are implemented.
/// </summary>
public class StockFlowDbContext(DbContextOptions<StockFlowDbContext> options) : DbContext(options)
{
    // Business DbSets will be added here (e.g. public DbSet<Product> Products => Set<Product>();)

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply all IEntityTypeConfiguration<T> from this assembly automatically
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(StockFlowDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
