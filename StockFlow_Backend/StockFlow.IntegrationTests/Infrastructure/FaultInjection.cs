using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace StockFlow.IntegrationTests.Infrastructure;

/// <summary>
/// Gây lỗi có chủ đích ở tầng lưu dữ liệu (SaveChanges) để kiểm tra transaction rollback trên PostgreSQL thật.
/// Không mock DbContext: lỗi được ném ra giữa chừng một luồng nghiệp vụ nhiều bước ghi, rồi test kiểm tra
/// database không còn dữ liệu dở dang. Kích hoạt một lần (one-shot) và tự tắt sau khi ném lỗi.
/// </summary>
public sealed class FaultInjector
{
    private readonly object _lock = new();
    private Func<DbContext, bool>? _trigger;
    private string _reason = "";

    public int FiredCount { get; private set; }

    /// <summary>Ném lỗi ở lần SaveChanges đầu tiên có bản ghi <typeparamref name="TEntity"/> mới được thêm.</summary>
    public void FailWhenAdding<TEntity>(string reason) where TEntity : class =>
        Arm(ctx => ctx.ChangeTracker.Entries<TEntity>().Any(e => e.State == EntityState.Added), reason);

    /// <summary>Ném lỗi ở lần SaveChanges đầu tiên thoả điều kiện.</summary>
    public void Arm(Func<DbContext, bool> trigger, string reason)
    {
        lock (_lock)
        {
            _trigger = trigger;
            _reason = reason;
        }
    }

    public void Reset()
    {
        lock (_lock)
        {
            _trigger = null;
            _reason = "";
            FiredCount = 0;
        }
    }

    internal void ThrowIfTriggered(DbContext? context)
    {
        if (context == null) return;
        string? reason = null;
        lock (_lock)
        {
            if (_trigger != null && _trigger(context))
            {
                reason = _reason;
                _trigger = null;
                FiredCount++;
            }
        }
        if (reason != null) throw new InvalidOperationException($"[Fault injection – integration test] {reason}");
    }
}

public sealed class FaultInjectionInterceptor : SaveChangesInterceptor
{
    private readonly FaultInjector _faults;

    public FaultInjectionInterceptor(FaultInjector faults) => _faults = faults;

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        _faults.ThrowIfTriggered(eventData.Context);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        _faults.ThrowIfTriggered(eventData.Context);
        return ValueTask.FromResult(result);
    }
}
