namespace StockFlow.Domain.Interfaces;

/// <summary>
/// Unit of Work pattern — wraps a database transaction.
/// </summary>
public interface IUnitOfWork : IDisposable
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
