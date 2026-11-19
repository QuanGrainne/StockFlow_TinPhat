using System.Globalization;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Infrastructure.Services;

/// <summary>Cấu hình payOS (appsettings "PayOS" hoặc biến môi trường PayOS__ClientId / PayOS__ApiKey / PayOS__ChecksumKey).</summary>
public sealed class PayosOptions
{
    public string ClientId { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public string ChecksumKey { get; set; } = "";
    public string BaseUrl { get; set; } = "https://api-merchant.payos.vn";

    /// <summary>Trang payOS chuyển về sau khi thanh toán / hủy trên trang checkout (bắt buộc khi tạo link).</summary>
    public string ReturnUrl { get; set; } = "http://localhost:8080/pos";
    public string CancelUrl { get; set; } = "http://localhost:8080/pos";

    /// <summary>Ngân hàng / số tài khoản cố định hiển thị cho khách chuyển khoản thủ công (VD ACB 82004268). Trống = dùng tài khoản payOS trả về.</summary>
    public string BankName { get; set; } = "";
    public string BankAccountNumber { get; set; } = "";
}

/// <summary>
/// Gọi API payOS bằng HttpClient (không dùng SDK — không thêm package):
/// - Tạo link: ký HMAC-SHA256 chuỗi "amount=..&amp;cancelUrl=..&amp;description=..&amp;orderCode=..&amp;returnUrl=.." bằng Checksum Key.
/// - Tra cứu / hủy link theo orderCode.
/// - Kiểm chữ ký webhook.
/// Header x-client-id / x-api-key lấy từ cấu hình; khóa không bao giờ ghi log hay trả về client.
/// </summary>
public sealed class PayosGateway : IPayosGateway
{
    private const string ConnectError = "Không kết nối được payOS. Vui lòng thử lại.";

    private readonly HttpClient _http;
    private readonly PayosOptions _options;
    private readonly ILogger<PayosGateway> _logger;

    public PayosGateway(HttpClient http, IOptions<PayosOptions> options, ILogger<PayosGateway> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
        _http.BaseAddress ??= new Uri(_options.BaseUrl.TrimEnd('/') + "/");
        _http.Timeout = TimeSpan.FromSeconds(20);
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_options.ClientId)
        && !string.IsNullOrWhiteSpace(_options.ApiKey)
        && !string.IsNullOrWhiteSpace(_options.ChecksumKey);

    public string? DisplayBankName => string.IsNullOrWhiteSpace(_options.BankName) ? null : _options.BankName.Trim();

    public string? DisplayAccountNumber =>
        string.IsNullOrWhiteSpace(_options.BankAccountNumber) ? null : _options.BankAccountNumber.Trim();

    public async Task<Result<PayosPaymentLink>> CreatePaymentLinkAsync(PayosCreateLinkRequest request, CancellationToken ct)
    {
        var signData = $"amount={request.Amount}&cancelUrl={_options.CancelUrl}&description={request.Description}" +
                       $"&orderCode={request.OrderCode}&returnUrl={_options.ReturnUrl}";
        var body = new
        {
            orderCode = request.OrderCode,
            amount = request.Amount,
            description = request.Description,
            cancelUrl = _options.CancelUrl,
            returnUrl = _options.ReturnUrl,
            expiredAt = new DateTimeOffset(request.ExpiredAtUtc, TimeSpan.Zero).ToUnixTimeSeconds(),
            signature = HmacHex(signData),
        };

        var response = await SendAsync(HttpMethod.Post, "v2/payment-requests", body, ct);
        if (!response.IsSuccess) return Result.Failure<PayosPaymentLink>(response.Error!);

        var data = response.Value!;
        return Result.Success(new PayosPaymentLink(
            Str(data, "paymentLinkId"),
            Str(data, "checkoutUrl"),
            Str(data, "qrCode"),
            Str(data, "bin"),
            Str(data, "accountNumber"),
            Str(data, "accountName"),
            Str(data, "status")));
    }

    public async Task<Result<PayosPaymentInfo>> GetPaymentInfoAsync(long orderCode, CancellationToken ct)
    {
        var response = await SendAsync(HttpMethod.Get, $"v2/payment-requests/{orderCode}", null, ct);
        if (!response.IsSuccess) return Result.Failure<PayosPaymentInfo>(response.Error!);

        var data = response.Value!;
        string? reference = null;
        if (data.TryGetProperty("transactions", out var txs) && txs.ValueKind == JsonValueKind.Array)
        {
            reference = txs.EnumerateArray()
                .Select(t => t.TryGetProperty("reference", out var r) && r.ValueKind == JsonValueKind.String ? r.GetString() : null)
                .LastOrDefault(r => !string.IsNullOrEmpty(r));
        }
        return Result.Success(new PayosPaymentInfo(Str(data, "status"), Num(data, "amount"), Num(data, "amountPaid"), reference));
    }

    public async Task<Result<bool>> CancelPaymentLinkAsync(long orderCode, string reason, CancellationToken ct)
    {
        var response = await SendAsync(HttpMethod.Post, $"v2/payment-requests/{orderCode}/cancel", new { cancellationReason = reason }, ct);
        return response.IsSuccess ? Result.Success(true) : Result.Failure<bool>(response.Error!);
    }

    public PayosWebhookData? VerifyWebhook(JsonElement body)
    {
        if (!IsConfigured || body.ValueKind != JsonValueKind.Object) return null;
        if (!body.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object) return null;
        if (!body.TryGetProperty("signature", out var sigEl) || sigEl.ValueKind != JsonValueKind.String) return null;

        // Giống thư viện payOS: sắp xếp khóa của data theo thứ tự chữ cái, null → chuỗi rỗng, nối key=value bằng "&"
        var signData = string.Join("&", data.EnumerateObject()
            .OrderBy(p => p.Name, StringComparer.Ordinal)
            .Select(p => $"{p.Name}={WebhookValue(p.Value)}"));
        var expected = Encoding.ASCII.GetBytes(HmacHex(signData));
        var actual = Encoding.ASCII.GetBytes((sigEl.GetString() ?? "").ToLowerInvariant());
        if (!CryptographicOperations.FixedTimeEquals(expected, actual)) return null;

        return new PayosWebhookData(Num(data, "orderCode"), Num(data, "amount"), Str(data, "code"), NullableStr(data, "reference"));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>Gọi payOS, kiểm "code" = "00" và trả về phần "data".</summary>
    private async Task<Result<JsonElement>> SendAsync(HttpMethod method, string path, object? body, CancellationToken ct)
    {
        if (!IsConfigured)
            return Result.Failure<JsonElement>("Chưa cấu hình payOS (PayOS__ClientId, PayOS__ApiKey, PayOS__ChecksumKey).");

        using var message = new HttpRequestMessage(method, path);
        message.Headers.Add("x-client-id", _options.ClientId);
        message.Headers.Add("x-api-key", _options.ApiKey);
        if (body != null) message.Content = JsonContent.Create(body);

        try
        {
            using var response = await _http.SendAsync(message, ct);
            var text = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(text) ? "{}" : text);
            var root = doc.RootElement;
            var code = root.TryGetProperty("code", out var c) ? c.ToString() : "";
            if (!response.IsSuccessStatusCode || code != "00" || !root.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object)
            {
                var desc = root.TryGetProperty("desc", out var d) ? d.ToString() : response.ReasonPhrase;
                _logger.LogWarning("payOS {Method} {Path} lỗi: HTTP {Status}, code {Code}, {Desc}", method, path, (int)response.StatusCode, code, desc);
                return Result.Failure<JsonElement>($"payOS từ chối yêu cầu: {desc} (mã {code}).");
            }
            return Result.Success(data.Clone());
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogWarning(ex, "Không gọi được payOS {Method} {Path}", method, path);
            return Result.Failure<JsonElement>(ConnectError);
        }
    }

    private string HmacHex(string data)
    {
        var hash = HMACSHA256.HashData(Encoding.UTF8.GetBytes(_options.ChecksumKey), Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string WebhookValue(JsonElement v) => v.ValueKind switch
    {
        JsonValueKind.Null or JsonValueKind.Undefined => "",
        JsonValueKind.String => v.GetString() is "null" or "undefined" ? "" : v.GetString() ?? "",
        JsonValueKind.True => "true",
        JsonValueKind.False => "false",
        _ => v.GetRawText(),
    };

    private static string Str(JsonElement e, string name) => NullableStr(e, name) ?? "";

    private static string? NullableStr(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind != JsonValueKind.Null ? v.ToString() : null;

    private static long Num(JsonElement e, string name)
    {
        if (!e.TryGetProperty(name, out var v)) return 0;
        if (v.ValueKind == JsonValueKind.Number && v.TryGetInt64(out var n)) return n;
        return long.TryParse(v.ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) ? parsed : 0;
    }
}
