using Microsoft.Extensions.Configuration;
using Npgsql;

namespace StockFlow.IntegrationTests.Infrastructure;

/// <summary>
/// Cấu hình chạy integration test. Thông tin kết nối PostgreSQL lấy theo thứ tự:
/// 1. Biến môi trường STOCKFLOW_IT_PG (chuỗi kết nối, không cần Database);
/// 2. File appsettings.IntegrationTest.local.json (mỗi máy một file, đã có trong .gitignore).
/// Database luôn do test quyết định (mặc định stockflow_integration_test), không bao giờ là stockflow_dev.
/// </summary>
public sealed class IntegrationTestSettings
{
    public const string EnvironmentVariable = "STOCKFLOW_IT_PG";
    public const string LocalFileName = "appsettings.IntegrationTest.local.json";

    /// <summary>Chuỗi kết nối tới máy chủ PostgreSQL, đã bỏ phần Database.</summary>
    public required string ServerConnection { get; init; }

    /// <summary>Database chạy test (bị xoá / dựng lại liên tục).</summary>
    public required string DatabaseName { get; init; }

    /// <summary>Database mẫu: migration + DatabaseSeeder + dữ liệu test, dùng để dựng lại database chạy test.</summary>
    public string TemplateName => DatabaseName + "_template";

    /// <summary>true: giữ lại 2 database sau khi chạy để xem dữ liệu (mặc định xoá).</summary>
    public bool KeepDatabaseAfterRun { get; init; }

    public static IntegrationTestSettings Load()
    {
        var config = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile(LocalFileName, optional: true)
            .Build();
        var section = config.GetSection("IntegrationTest");

        var connection = Environment.GetEnvironmentVariable(EnvironmentVariable);
        if (string.IsNullOrWhiteSpace(connection)) connection = section["PostgresConnection"];
        if (string.IsNullOrWhiteSpace(connection))
            throw new InvalidOperationException(
                $"Chưa cấu hình PostgreSQL cho integration test: đặt biến môi trường {EnvironmentVariable} " +
                $"hoặc tạo {LocalFileName} từ file .example trong StockFlow.IntegrationTests.");

        var databaseName = section["DatabaseName"];
        if (string.IsNullOrWhiteSpace(databaseName)) databaseName = DatabaseGuard.RequiredPrefix;
        DatabaseGuard.EnsureTestDatabaseName(databaseName);
        DatabaseGuard.EnsureTestDatabaseName(databaseName + "_template");

        // Bỏ Database trong chuỗi gốc (nếu có) để không vô tình trỏ vào database phát triển
        var builder = new NpgsqlConnectionStringBuilder(connection);
        builder.Remove("Database");

        return new IntegrationTestSettings
        {
            ServerConnection = builder.ConnectionString,
            DatabaseName = databaseName,
            KeepDatabaseAfterRun = bool.TryParse(section["KeepDatabaseAfterRun"], out var keep) && keep,
        };
    }

    /// <summary>
    /// Chuỗi kết nối tới một database. API trong test dùng Pooling=false: database bị xoá / dựng lại giữa các test,
    /// không giữ kết nối cũ trong pool (kết nối cũ sẽ bị máy chủ cắt và gây lỗi ở request sau).
    /// </summary>
    public string ConnectionStringFor(string database, bool pooling = false)
    {
        var builder = new NpgsqlConnectionStringBuilder(ServerConnection)
        {
            Database = database,
            Pooling = pooling,
        };
        return builder.ConnectionString;
    }
}
