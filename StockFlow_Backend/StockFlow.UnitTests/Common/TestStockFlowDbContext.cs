using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Storage;
using Moq;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Infrastructure.Persistence;

namespace StockFlow.UnitTests.Common;

/// <summary>
/// DbContext thật của dự án (StockFlowDbContext, cùng model và ánh xạ) chạy trên EF Core InMemory,
/// mỗi test một database riêng nên các test độc lập với nhau.
///
/// Ba hàm của IStockFlowDbContext chỉ chạy được trên PostgreSQL được cài lại cho test
/// (interface re-implementation: lớp con khai lại IStockFlowDbContext nên lời gọi qua interface đi vào các hàm dưới):
/// - GetNextSequenceValueAsync (SELECT nextval): trả số tăng dần theo tên sequence.
/// - BeginTransactionAsync: InMemory không có transaction → trả transaction giả (Moq), ghi nhận Commit / Rollback.
/// - AcquireTransactionLockAsync (pg_advisory_xact_lock): không khóa, chỉ ghi lại khóa đã xin.
/// Không sửa code nghiệp vụ; DbSet, SaveChangesAsync và truy vấn LINQ là của EF Core thật.
/// </summary>
public sealed class TestStockFlowDbContext : StockFlowDbContext, IStockFlowDbContext
{
    private readonly Dictionary<string, long> _sequences = new();

    private TestStockFlowDbContext(DbContextOptions<StockFlowDbContext> options) : base(options)
    {
    }

    /// <summary>Các transaction giả đã mở, theo thứ tự.</summary>
    public List<Mock<IDbContextTransaction>> Transactions { get; } = new();

    /// <summary>Các khóa advisory handler đã xin.</summary>
    public List<string> AcquiredLocks { get; } = new();

    private string _databaseName = "";

    public static TestStockFlowDbContext Create() => Open($"stockflow-unit-{Guid.NewGuid():N}");

    /// <summary>
    /// Mở thêm một DbContext trên cùng database InMemory (mô phỏng 2 người dùng / 2 request đồng thời,
    /// mỗi bên có change tracker riêng – dùng cho ca kiểm concurrency token).
    /// </summary>
    public TestStockFlowDbContext OpenSameDatabase() => Open(_databaseName);

    private static TestStockFlowDbContext Open(string databaseName)
    {
        var options = new DbContextOptionsBuilder<StockFlowDbContext>()
            .UseInMemoryDatabase(databaseName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new TestStockFlowDbContext(options) { _databaseName = databaseName };
    }

    /// <summary>Đặt giá trị hiện tại của một sequence (lần gọi tiếp theo trả value + 1).</summary>
    public void SetSequence(string sequenceName, long value) => _sequences[sequenceName] = value;

    Task<long> IStockFlowDbContext.GetNextSequenceValueAsync(string sequenceName, CancellationToken cancellationToken)
    {
        var next = _sequences.GetValueOrDefault(sequenceName) + 1;
        _sequences[sequenceName] = next;
        return Task.FromResult(next);
    }

    Task<IDbContextTransaction> IStockFlowDbContext.BeginTransactionAsync(CancellationToken cancellationToken)
    {
        var transaction = new Mock<IDbContextTransaction>();
        Transactions.Add(transaction);
        return Task.FromResult(transaction.Object);
    }

    Task IStockFlowDbContext.AcquireTransactionLockAsync(string lockKey, CancellationToken cancellationToken)
    {
        AcquiredLocks.Add(lockKey);
        return Task.CompletedTask;
    }
}
