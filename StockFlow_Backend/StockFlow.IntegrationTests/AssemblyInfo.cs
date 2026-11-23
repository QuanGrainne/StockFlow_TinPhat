using System.Runtime.CompilerServices;
using Xunit;

// Mọi test dùng chung một database PostgreSQL (stockflow_integration_test), được dựng lại từ bản mẫu trước mỗi test
// → các test phải chạy tuần tự, không song song.
[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace StockFlow.IntegrationTests;

internal static class TestProcessSetup
{
    /// <summary>
    /// Giống dòng đầu tiên của Program.cs. Npgsql chỉ đọc công tắc này MỘT lần cho cả tiến trình, nên phải đặt trước mọi lần
    /// dùng Npgsql của test (tạo / xoá database). Nếu không, API trong test chạy ở chế độ timestamp khác môi trường thật
    /// (ghi DateTime Kind=UTC vào cột "timestamp without time zone" bị từ chối → 500 giả).
    /// </summary>
    [ModuleInitializer]
    internal static void Initialize() => AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
}
