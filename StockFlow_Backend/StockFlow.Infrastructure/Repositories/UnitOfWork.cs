using StockFlow.Domain.Interfaces;
using StockFlow.Infrastructure.Persistence;

namespace StockFlow.Infrastructure.Repositories;

/// <summary>
/// Unit of Work implementation. Wraps StockFlowDbContext SaveChanges.
/// </summary>
public class UnitOfWork(StockFlowDbContext dbContext) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => dbContext.SaveChangesAsync(ct);

    public void Dispose() => dbContext.Dispose();
}
