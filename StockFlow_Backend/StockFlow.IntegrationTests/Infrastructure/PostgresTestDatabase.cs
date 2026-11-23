using Npgsql;

namespace StockFlow.IntegrationTests.Infrastructure;

/// <summary>
/// Quản lý 2 database trên PostgreSQL cục bộ (kết nối qua database bảo trì "postgres", chỉ để CREATE / DROP):
/// - stockflow_integration_test: database API dùng khi chạy test;
/// - stockflow_integration_test_template: bản mẫu sau migration + seed.
/// Trước mỗi test database chạy test được xoá và tạo lại từ bản mẫu (CREATE DATABASE ... TEMPLATE),
/// nên mọi test bắt đầu từ cùng một dữ liệu, không phụ thuộc thứ tự chạy.
/// </summary>
public sealed class PostgresTestDatabase
{
    private readonly IntegrationTestSettings _settings;

    public PostgresTestDatabase(IntegrationTestSettings settings)
    {
        _settings = settings;
        DatabaseGuard.EnsureTestDatabaseName(settings.DatabaseName);
        DatabaseGuard.EnsureTestDatabaseName(settings.TemplateName);
    }

    public string MainName => _settings.DatabaseName;
    public string TemplateName => _settings.TemplateName;
    public string MainConnectionString => _settings.ConnectionStringFor(MainName);

    /// <summary>Xoá (nếu có) và tạo mới database chạy test rỗng, cùng encoding / collation với template1 của máy chủ.</summary>
    public async Task RecreateEmptyMainAsync()
    {
        var (collate, ctype) = await ServerLocaleAsync();
        await DropAsync(TemplateName);
        await DropAsync(MainName);
        await ExecAsync($"CREATE DATABASE \"{MainName}\" TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE '{Escape(collate)}' LC_CTYPE '{Escape(ctype)}'");
    }

    /// <summary>Chụp database chạy test thành bản mẫu (gọi một lần sau migration + seed).</summary>
    public async Task SnapshotTemplateAsync()
    {
        await TerminateConnectionsAsync(MainName);
        await DropAsync(TemplateName);
        await ExecAsync($"CREATE DATABASE \"{TemplateName}\" TEMPLATE \"{MainName}\" STRATEGY FILE_COPY");
    }

    /// <summary>Dựng lại database chạy test từ bản mẫu (dọn sạch dữ liệu của test trước).</summary>
    public async Task RestoreMainFromTemplateAsync()
    {
        await DropAsync(MainName);
        await ExecAsync($"CREATE DATABASE \"{MainName}\" TEMPLATE \"{TemplateName}\" STRATEGY FILE_COPY");
    }

    public async Task DropAllAsync()
    {
        await DropAsync(MainName);
        await DropAsync(TemplateName);
    }

    private async Task DropAsync(string name)
    {
        DatabaseGuard.EnsureTestDatabaseName(name);
        NpgsqlConnection.ClearAllPools();
        await ExecAsync($"DROP DATABASE IF EXISTS \"{name}\" WITH (FORCE)");
    }

    private async Task TerminateConnectionsAsync(string name)
    {
        DatabaseGuard.EnsureTestDatabaseName(name);
        NpgsqlConnection.ClearAllPools();
        await using var conn = await OpenMaintenanceAsync();
        await using var cmd = new NpgsqlCommand(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = @name AND pid <> pg_backend_pid()", conn);
        cmd.Parameters.AddWithValue("name", name);
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task<(string Collate, string Ctype)> ServerLocaleAsync()
    {
        await using var conn = await OpenMaintenanceAsync();
        await using var cmd = new NpgsqlCommand("SELECT datcollate, datctype FROM pg_database WHERE datname = 'template1'", conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) throw new InvalidOperationException("Không đọc được collation của template1.");
        return (reader.GetString(0), reader.GetString(1));
    }

    private async Task ExecAsync(string sql)
    {
        await using var conn = await OpenMaintenanceAsync();
        await using var cmd = new NpgsqlCommand(sql, conn) { CommandTimeout = 300 };
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task<NpgsqlConnection> OpenMaintenanceAsync()
    {
        var conn = new NpgsqlConnection(_settings.ConnectionStringFor("postgres"));
        await conn.OpenAsync();
        return conn;
    }

    private static string Escape(string value) => value.Replace("'", "''");
}
