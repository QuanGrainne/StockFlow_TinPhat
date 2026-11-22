using System.Globalization;

namespace StockFlow.UnitTests.Common;

/// <summary>
/// Đặt culture vi-VN trong phạm vi một test (thông báo có số tiền định dạng {x:N0} → "300.000" như Expected trong Report 5.1).
/// Program.cs không đặt culture mặc định, nên câu thông báo trên máy chủ phụ thuộc culture của hệ điều hành.
/// </summary>
public sealed class VietnameseCulture : IDisposable
{
    private readonly CultureInfo _culture = CultureInfo.CurrentCulture;
    private readonly CultureInfo _uiCulture = CultureInfo.CurrentUICulture;

    public VietnameseCulture()
    {
        var vi = new CultureInfo("vi-VN");
        CultureInfo.CurrentCulture = vi;
        CultureInfo.CurrentUICulture = vi;
    }

    public void Dispose()
    {
        CultureInfo.CurrentCulture = _culture;
        CultureInfo.CurrentUICulture = _uiCulture;
    }
}
