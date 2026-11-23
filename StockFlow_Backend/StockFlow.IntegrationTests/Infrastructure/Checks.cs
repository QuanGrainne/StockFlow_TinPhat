using System.Text.RegularExpressions;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Infrastructure;

/// <summary>
/// Gom nhiều điểm kiểm tra của một Test Case (HTTP + dữ liệu PostgreSQL), ghi từng dòng Expected / Actual vào output,
/// rồi mới báo lỗi một lần ở cuối. Nhờ vậy một điểm sai (VD câu thông báo) không che các điểm khác (VD tồn kho).
/// </summary>
public sealed class Checks
{
    private readonly ITestOutputHelper _output;
    private readonly List<string> _failures = new();

    public Checks(ITestOutputHelper output) => _output = output;

    public void Equal<T>(string what, T expected, T actual)
    {
        var ok = EqualityComparer<T>.Default.Equals(expected, actual);
        Record(ok, what, $"{expected}", $"{actual}");
    }

    /// <summary>Yêu cầu thành công (2xx); ghi lại mã thực tế (200 / 201).</summary>
    public void Success(ApiResult result) =>
        Record(result.IsSuccess, "HTTP thành công (2xx)", "2xx", $"{result.StatusCode}");

    public void True(string what, bool condition, string actualDescription)
    {
        Record(condition, what, "true", actualDescription);
    }

    /// <summary>
    /// So câu thông báo theo Expected Result của workbook. "..." / "…" / "&lt;tên&gt;" trong câu mẫu được hiểu là phần
    /// thay đổi (khớp mọi chuỗi); phần còn lại phải đúng từng ký tự.
    /// </summary>
    public void Message(string what, string expectedPattern, string? actual)
    {
        var ok = actual != null && MessagePattern.IsMatch(expectedPattern, actual);
        Record(ok, what, expectedPattern, actual ?? "(không có message)");
    }

    /// <summary>Như Message(string…) nhưng xét mọi câu của phản hồi ("message" + "errors" của FluentValidation).</summary>
    public void Message(string what, string expectedPattern, ApiResult result)
    {
        var all = result.Messages;
        var ok = all.Any(m => MessagePattern.IsMatch(expectedPattern, m));
        Record(ok, what, expectedPattern, all.Count == 0 ? "(không có message)" : string.Join(" | ", all));
    }

    public void Contains(string what, string expectedPart, ApiResult result)
    {
        var all = result.Messages;
        var ok = all.Any(m => m.Contains(expectedPart, StringComparison.Ordinal));
        Record(ok, what, $"chứa \"{expectedPart}\"", all.Count == 0 ? "(không có message)" : string.Join(" | ", all));
    }

    /// <summary>Yêu cầu bị từ chối: 4xx (workbook chỉ ghi "Request is rejected").</summary>
    public void Rejected(ApiResult result) =>
        Record(result.StatusCode is >= 400 and < 500, "Yêu cầu bị từ chối (4xx)", "4xx", $"{result.StatusCode} {string.Join(" | ", result.Messages)}");

    /// <summary>Thông báo phải chứa đoạn mã / chữ cho trước (VD "PAY-009").</summary>
    public void Contains(string what, string expectedPart, string? actual)
    {
        var ok = actual != null && actual.Contains(expectedPart, StringComparison.Ordinal);
        Record(ok, what, $"chứa \"{expectedPart}\"", actual ?? "(không có message)");
    }

    private void Record(bool ok, string what, string expected, string actual)
    {
        _output.WriteLine($"{(ok ? "PASS" : "FAIL")}   | {what} | Expected: {expected} | Actual: {actual}");
        if (!ok) _failures.Add($"{what}: Expected = {expected} | Actual = {actual}");
    }

    public void Assert()
    {
        if (_failures.Count > 0)
            Xunit.Assert.Fail($"{_failures.Count} điểm kiểm tra không đạt:\n- " + string.Join("\n- ", _failures));
    }
}

public static class MessagePattern
{
    private static readonly Regex Placeholder = new(@"\.\.\.|…|<[^>]+>", RegexOptions.Compiled);

    public static bool IsMatch(string pattern, string actual)
    {
        // Khoảng trắng sát "..." chỉ là cách viết của workbook ("... Tồn khả dụng: 4 ...") → bỏ, để phần thay đổi khớp cả dấu câu liền kề
        var raw = Placeholder.Split(pattern.Trim());
        var parts = raw.Select((p, i) =>
        {
            if (i > 0) p = p.TrimStart();
            if (i < raw.Length - 1) p = p.TrimEnd();
            return Regex.Escape(p);
        });
        var regex = "^" + string.Join(".*?", parts) + "$";
        var text = actual.Trim();
        // Dấu chấm cuối câu đặt ngoài ngoặc kép trong workbook ("… (...)".) → câu mẫu không có dấu chấm thì bỏ dấu chấm cuối của câu thật
        if (!pattern.Trim().EndsWith('.') && text.EndsWith('.')) text = text[..^1];
        return Regex.IsMatch(text, regex, RegexOptions.Singleline);
    }
}
