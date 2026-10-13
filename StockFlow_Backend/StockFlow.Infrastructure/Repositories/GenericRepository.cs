using Microsoft.EntityFrameworkCore;
using StockFlow.Domain.Common;
using StockFlow.Domain.Interfaces;
using StockFlow.Infrastructure.Persistence;
using System.Linq.Expressions;

namespace StockFlow.Infrastructure.Repositories;

/// <summary>
/// Generic EF Core repository implementation.
/// </summary>
public class GenericRepository<T>(StockFlowDbContext context) : IRepository<T>
    where T : BaseEntity
{
    protected readonly DbSet<T> DbSet = context.Set<T>();

    public async Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await DbSet.FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted, ct);

    public async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default)
        => await DbSet.Where(e => !e.IsDeleted).ToListAsync(ct);

    public async Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default)
        => await DbSet.Where(predicate).ToListAsync(ct);

    public async Task AddAsync(T entity, CancellationToken ct = default)
        => await DbSet.AddAsync(entity, ct);

    public void Update(T entity)
        => DbSet.Update(entity);

    public void Remove(T entity)
    {
        entity.IsDeleted = true; // soft delete
        DbSet.Update(entity);
    }
}
