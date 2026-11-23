using System.Data.Common;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace StockFlow.IntegrationTests.Infrastructure;

/// <summary>
/// Hàng rào an toàn: integration test chỉ được tạo / xoá / kết nối database có tiền tố stockflow_integration_test.
/// stockflow_dev và database Production không bao giờ được chạm tới.
/// </summary>
public static partial class DatabaseGuard
{
    public const string RequiredPrefix = "stockflow_integration_test";

    private static readonly string[] Forbidden = { "stockflow_dev", "stockflow", "postgres", "template0", "template1" };

    [GeneratedRegex("^[a-z0-9_]+$")]
    private static partial Regex SafeName();

    public static void EnsureTestDatabaseName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)
            || !SafeName().IsMatch(name)
            || !name.StartsWith(RequiredPrefix, StringComparison.Ordinal)
            || Forbidden.Contains(name, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Database '{name}' không phải database integration test (phải bắt đầu bằng '{RequiredPrefix}', chỉ gồm a-z, 0-9, _). Dừng để bảo vệ dữ liệu.");
        }
    }
}

/// <summary>Chặn mọi kết nối EF Core của API tới database không phải database test (kể cả lúc migrate / seed khi khởi động).</summary>
public sealed class DatabaseGuardInterceptor : DbConnectionInterceptor
{
    public override InterceptionResult ConnectionOpening(DbConnection connection, ConnectionEventData eventData, InterceptionResult result)
    {
        DatabaseGuard.EnsureTestDatabaseName(connection.Database);
        return result;
    }

    public override ValueTask<InterceptionResult> ConnectionOpeningAsync(
        DbConnection connection, ConnectionEventData eventData, InterceptionResult result, CancellationToken cancellationToken = default)
    {
        DatabaseGuard.EnsureTestDatabaseName(connection.Database);
        return ValueTask.FromResult(result);
    }
}
