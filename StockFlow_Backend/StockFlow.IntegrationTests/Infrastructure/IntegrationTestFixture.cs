using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StockFlow.Infrastructure.Persistence;
using Xunit;

namespace StockFlow.IntegrationTests.Infrastructure;

/// <summary>
/// Dùng chung cho cả lượt chạy (xUnit collection fixture):
/// 1. Tạo database stockflow_integration_test rỗng trên PostgreSQL cục bộ;
/// 2. Khởi động API thật (Program.cs tự chạy toàn bộ migration + DatabaseSeeder);
/// 3. Kiểm tra migration đã áp đủ, rồi thêm dữ liệu test (TestDataSeeder);
/// 4. Chụp thành database mẫu. Trước mỗi test: dựng lại database chạy test từ bản mẫu (ResetDatabaseAsync).
/// Kết thúc: dừng API, xoá 2 database (trừ khi KeepDatabaseAfterRun = true), ghi số liệu thời gian.
/// </summary>
public sealed class IntegrationTestFixture : IAsyncLifetime
{
    private readonly Dictionary<string, string> _tokens = new();
    private bool _freshFromTemplate;

    public IntegrationTestSettings Settings { get; private set; } = null!;
    public PostgresTestDatabase Database { get; private set; } = null!;
    public StockFlowApiFactory Factory { get; private set; } = null!;
    public FaultInjector Faults { get; } = new();
    public SeedIds Ids { get; private set; } = null!;
    public RunMetrics Metrics { get; } = new();

    public async Task InitializeAsync()
    {
        var total = Stopwatch.StartNew();
        Settings = IntegrationTestSettings.Load();
        Database = new PostgresTestDatabase(Settings);

        var step = Stopwatch.StartNew();
        await Database.RecreateEmptyMainAsync();
        Metrics.CreateEmptyDatabaseMs = step.ElapsedMilliseconds;

        var uploads = Path.Combine(Path.GetTempPath(), "stockflow-it-uploads", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(uploads);
        Factory = new StockFlowApiFactory(Database.MainConnectionString, uploads, Faults);

        step.Restart();
        _ = Factory.Server; // khởi động host: Program.cs chạy MigrateAsync + DatabaseSeeder.SeedAsync
        Metrics.HostStartWithMigrationAndSeedMs = step.ElapsedMilliseconds;

        await VerifySchemaAsync();

        step.Restart();
        Ids = await TestDataSeeder.SeedAsync(Factory.Services);
        Metrics.TestDataSeedMs = step.ElapsedMilliseconds;

        step.Restart();
        await Database.SnapshotTemplateAsync();
        Metrics.SnapshotTemplateMs = step.ElapsedMilliseconds;
        _freshFromTemplate = true;

        Metrics.FixtureInitializeMs = total.ElapsedMilliseconds;
    }

    /// <summary>Migration phải áp đủ và không còn migration chờ; database đúng là database test; có schema stockflow.</summary>
    private async Task VerifySchemaAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StockFlowDbContext>();
        var connectedTo = db.Database.GetDbConnection().Database;
        DatabaseGuard.EnsureTestDatabaseName(connectedTo);

        var all = db.Database.GetMigrations().ToList();
        var applied = (await db.Database.GetAppliedMigrationsAsync()).ToList();
        var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
        Metrics.MigrationsInAssembly = all.Count;
        Metrics.MigrationsApplied = applied.Count;
        Metrics.LastMigration = applied.LastOrDefault() ?? "";
        if (pending.Count > 0 || applied.Count == 0)
            throw new InvalidOperationException(
                $"Migration chưa áp đủ khi API khởi động (đã áp {applied.Count}/{all.Count}, còn chờ: {string.Join(", ", pending)}). Xem log lỗi của Program.cs.");

        Metrics.TablesInSchemaStockflow = await db.Database
            .SqlQueryRaw<int>("SELECT COUNT(*)::int AS \"Value\" FROM information_schema.tables WHERE table_schema = 'stockflow' AND table_type = 'BASE TABLE'")
            .SingleAsync();
        Metrics.HasPendingModelChanges = db.Database.HasPendingModelChanges();
        if (!await db.MstOrderSettings.AnyAsync(s => s.SettingId == 1))
            throw new InvalidOperationException("Thiếu dòng mst_order_settings id 1 sau migration.");
    }

    /// <summary>Dọn dữ liệu: dựng lại database chạy test từ bản mẫu. Test đầu tiên sau khi chụp mẫu dùng luôn database hiện có.</summary>
    public async Task ResetDatabaseAsync()
    {
        Faults.Reset();
        if (_freshFromTemplate)
        {
            _freshFromTemplate = false;
            return;
        }
        var sw = Stopwatch.StartNew();
        await Database.RestoreMainFromTemplateAsync();
        Metrics.ResetDurationsMs.Add(sw.ElapsedMilliseconds);
    }

    /// <summary>HttpClient đã đăng nhập thật (POST /api/auth/login); token dùng lại trong cả lượt chạy vì tài khoản như nhau ở mọi test.</summary>
    public async Task<HttpClient> ClientAsync(TestUser user)
    {
        var token = await TokenAsync(user);
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    public async Task<string> TokenAsync(TestUser user)
    {
        if (!_tokens.TryGetValue(user.Username, out var token))
        {
            using var anonymous = Factory.CreateClient();
            var response = await anonymous.PostAsJsonAsync("/api/auth/login", new { username = user.Username, password = user.Password });
            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"Đăng nhập {user.Username} thất bại: {(int)response.StatusCode} {body}");
            using var doc = JsonDocument.Parse(body);
            token = doc.RootElement.GetProperty("token").GetString()
                    ?? throw new InvalidOperationException("Phản hồi đăng nhập không có token.");
            _tokens[user.Username] = token;
        }
        return token;
    }

    public async Task DisposeAsync()
    {
        try
        {
            await Factory.DisposeAsync();
        }
        finally
        {
            if (!Settings.KeepDatabaseAfterRun) await Database.DropAllAsync();
            Metrics.Write();
        }
    }
}

/// <summary>Số liệu thời gian của lượt chạy, ghi ra it-run-metrics.json cạnh DLL test (dùng cho báo cáo).</summary>
public sealed class RunMetrics
{
    public string StartedAt { get; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
    public long CreateEmptyDatabaseMs { get; set; }
    public long HostStartWithMigrationAndSeedMs { get; set; }
    public long TestDataSeedMs { get; set; }
    public long SnapshotTemplateMs { get; set; }
    public long FixtureInitializeMs { get; set; }
    public int MigrationsInAssembly { get; set; }
    public int MigrationsApplied { get; set; }
    public string LastMigration { get; set; } = "";
    public int TablesInSchemaStockflow { get; set; }
    public bool HasPendingModelChanges { get; set; }
    public List<long> ResetDurationsMs { get; } = new();

    public void Write()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "it-run-metrics.json");
        File.WriteAllText(path, JsonSerializer.Serialize(new
        {
            StartedAt, CreateEmptyDatabaseMs, HostStartWithMigrationAndSeedMs, TestDataSeedMs, SnapshotTemplateMs, FixtureInitializeMs,
            MigrationsInAssembly, MigrationsApplied, LastMigration, TablesInSchemaStockflow, HasPendingModelChanges,
            Resets = ResetDurationsMs.Count,
            ResetAvgMs = ResetDurationsMs.Count == 0 ? 0 : ResetDurationsMs.Average(),
            ResetMaxMs = ResetDurationsMs.Count == 0 ? 0 : ResetDurationsMs.Max(),
            EndedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
        }, new JsonSerializerOptions { WriteIndented = true }));
    }
}

[CollectionDefinition(Name)]
public sealed class IntegrationTestCollection : ICollectionFixture<IntegrationTestFixture>
{
    public const string Name = "StockFlow integration (PostgreSQL)";
}
