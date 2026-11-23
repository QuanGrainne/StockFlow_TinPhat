using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StockFlow.Infrastructure.Persistence;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Infrastructure;

/// <summary>
/// Lớp cơ sở: trước mỗi test dựng lại database từ bản mẫu (độc lập, chạy lại được, không phụ thuộc thứ tự).
/// Cung cấp: client đã đăng nhập, truy vấn / chuẩn bị dữ liệu trực tiếp trên PostgreSQL qua DbContext thật,
/// ghi "Actual Result" vào output của test (TRX) để lập báo cáo.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    protected IntegrationTestBase(IntegrationTestFixture fixture, ITestOutputHelper output)
    {
        Fx = fixture;
        Output = output;
    }

    protected IntegrationTestFixture Fx { get; }
    protected ITestOutputHelper Output { get; }
    protected SeedIds Ids => Fx.Ids;

    public async Task InitializeAsync()
    {
        await Fx.ResetDatabaseAsync();
        Fx.Factory.ServerLogs.Drain(); // bỏ log của test trước / lúc dựng lại database
    }

    public Task DisposeAsync()
    {
        Fx.Faults.Reset();
        foreach (var entry in Fx.Factory.ServerLogs.Drain())
            Output.WriteLine($"SERVER | {entry}");
        return Task.CompletedTask;
    }

    protected Task<HttpClient> ClientAsync(TestUser user) => Fx.ClientAsync(user);

    /// <summary>Client không gửi token.</summary>
    protected HttpClient AnonymousClient() => Fx.Factory.CreateClient();

    /// <summary>Đăng nhập thật (không dùng token đã lưu), trả về phản hồi.</summary>
    protected Task<ApiResult> LoginAsync(string username, string password) =>
        PostAsync(AnonymousClient(), "/api/auth/login", new { username, password });

    /// <summary>Client dùng một token cho trước (token cũ, token sửa chữ ký, token hết hạn...).</summary>
    protected HttpClient ClientWithToken(string token)
    {
        var c = Fx.Factory.CreateClient();
        c.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", $"Bearer {token}");
        return c;
    }

    protected Task<string> TokenAsync(TestUser user) => Fx.TokenAsync(user);

    /// <summary>Đọc dữ liệu trực tiếp từ PostgreSQL (DbContext mới, không theo dõi thay đổi).</summary>
    protected async Task<T> QueryAsync<T>(Func<StockFlowDbContext, Task<T>> query)
    {
        using var scope = Fx.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StockFlowDbContext>();
        db.ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
        return await query(db);
    }

    /// <summary>Chuẩn bị dữ liệu trực tiếp trên PostgreSQL (Arrange có kiểm soát), lưu ngay.</summary>
    protected async Task ArrangeDbAsync(Func<StockFlowDbContext, Task> action)
    {
        using var scope = Fx.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StockFlowDbContext>();
        await action(db);
        await db.SaveChangesAsync();
    }

    /// <summary>Ghi một dòng kết quả thực tế vào output của test.</summary>
    protected void Actual(string label, object? value) =>
        Output.WriteLine($"ACTUAL | {label}: {(value is string s ? s : JsonSerializer.Serialize(value, Json))}");

    protected void Step(string text) => Output.WriteLine($"STEP   | {text}");

    protected async Task<ApiResult> SendAsync(HttpClient client, HttpMethod method, string url, object? body = null)
    {
        using var request = new HttpRequestMessage(method, url);
        if (body != null) request.Content = JsonContent.Create(body, options: Json);
        using var response = await client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        var result = new ApiResult(response.StatusCode, text);
        Output.WriteLine($"HTTP   | {method} {url} → {(int)response.StatusCode} {Shorten(text)}");
        return result;
    }

    protected Task<ApiResult> PostAsync(HttpClient client, string url, object? body = null) => SendAsync(client, HttpMethod.Post, url, body);
    protected Task<ApiResult> PutAsync(HttpClient client, string url, object? body = null) => SendAsync(client, HttpMethod.Put, url, body);
    protected Task<ApiResult> GetAsync(HttpClient client, string url) => SendAsync(client, HttpMethod.Get, url);

    private static string Shorten(string text) => text.Length <= 600 ? text : text[..600] + "…";
}

/// <summary>Phản hồi HTTP đã đọc xong.</summary>
public sealed class ApiResult
{
    public ApiResult(HttpStatusCode status, string body)
    {
        Status = status;
        Body = body;
    }

    public HttpStatusCode Status { get; }
    public string Body { get; }
    public int StatusCode => (int)Status;

    /// <summary>2xx: workbook chỉ ghi "thành công", API có chỗ trả 200 OK, có chỗ 201 Created.</summary>
    public bool IsSuccess => StatusCode is >= 200 and < 300;

    public JsonNode? Node => string.IsNullOrWhiteSpace(Body) ? null : JsonNode.Parse(Body);

    /// <summary>Trường "message" của phản hồi lỗi (BadRequest(new { message })).</summary>
    public string? Message => Node is JsonObject o && o["message"] is JsonValue v && v.TryGetValue<string>(out var s) ? s : null;

    /// <summary>
    /// Mọi câu thông báo của phản hồi: "message" và các câu trong "errors" (lỗi FluentValidation do
    /// ExceptionHandlingMiddleware trả về: { message: "Dữ liệu không hợp lệ.", errors: { field: [..] } }).
    /// </summary>
    public IReadOnlyList<string> Messages
    {
        get
        {
            var list = new List<string>();
            if (Message != null) list.Add(Message);
            if (Node is JsonObject o && o["errors"] is JsonObject errors)
                foreach (var (_, value) in errors)
                    if (value is JsonArray arr)
                        list.AddRange(arr.Select(x => x?.GetValue<string>()).Where(x => x != null)!);
            return list;
        }
    }

    /// <summary>Phần tử của phản hồi dạng danh sách (mảng JSON, hoặc object có "items" / "data").</summary>
    public JsonArray Items => Node switch
    {
        JsonArray a => a,
        JsonObject o when o["items"] is JsonArray a => a,
        JsonObject o when o["data"] is JsonArray a => a,
        _ => new JsonArray(),
    };

    public int Int(string name) => Node?[name]?.GetValue<int>() ?? throw new InvalidOperationException($"Phản hồi không có '{name}': {Body}");
    public decimal Decimal(string name) => Node?[name]?.GetValue<decimal>() ?? throw new InvalidOperationException($"Phản hồi không có '{name}': {Body}");
    public string? String(string name) => Node?[name]?.GetValue<string>();
}
