using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using StockFlow.API.Controllers;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Infrastructure.Persistence;

namespace StockFlow.IntegrationTests.Infrastructure;

/// <summary>
/// Chạy API thật (Program.cs: controller, xác thực JWT, phân quyền, middleware, MediatR, EF Core) trong tiến trình test.
/// Chỉ thay 3 điểm ở ranh giới hạ tầng:
/// 1. Chuỗi kết nối → database stockflow_integration_test (kèm hàng rào DatabaseGuardInterceptor);
/// 2. Thư mục lưu ảnh → thư mục tạm;
/// 3. Cổng thanh toán payOS (dịch vụ bên ngoài) → bản giả không gọi mạng.
/// Program.cs vẫn tự chạy migration + DatabaseSeeder khi khởi động như môi trường thật.
/// Dùng một kiểu public của assembly API (AuthController) làm điểm vào nên không phải sửa Program.cs.
/// </summary>
public sealed class StockFlowApiFactory : WebApplicationFactory<AuthController>
{
    private readonly string _connectionString;
    private readonly string _uploadsPath;

    public StockFlowApiFactory(string connectionString, string uploadsPath, FaultInjector faults)
    {
        _connectionString = connectionString;
        _uploadsPath = uploadsPath;
        Faults = faults;
    }

    public FaultInjector Faults { get; }

    /// <summary>Log lỗi của API trong lúc chạy test (exception sau phản hồi 500…).</summary>
    public ServerLogSink ServerLogs { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Môi trường riêng: không nạp appsettings.Development.json của máy dev, không bật Swagger
        builder.UseEnvironment("IntegrationTest");
        builder.UseSetting("ConnectionStrings:StockFlowDb", _connectionString);
        builder.UseSetting("Storage:UploadsPath", _uploadsPath);
        builder.UseSetting("Seed:DemoData", "true");
        builder.UseSetting("Logging:LogLevel:Default", "Warning");
        builder.UseSetting("Logging:LogLevel:Microsoft.EntityFrameworkCore.Database.Command", "Warning");
        builder.ConfigureLogging(logging =>
        {
            logging.SetMinimumLevel(LogLevel.Warning);
            logging.AddProvider(ServerLogs);
        });

        builder.ConfigureTestServices(services =>
        {
            // Ghi đè chuỗi kết nối (giữ nguyên cấu hình Npgsql khác của Infrastructure) + hàng rào + điểm gây lỗi
            services.ConfigureDbContext<StockFlowDbContext>(options =>
            {
                options.UseNpgsql(_connectionString);
                options.AddInterceptors(new DatabaseGuardInterceptor(), new FaultInjectionInterceptor(Faults));
            });

            services.RemoveAll<IPayosGateway>();
            services.AddSingleton<IPayosGateway, DisabledPayosGateway>();
        });
    }

    /// <summary>payOS là dịch vụ bên ngoài: trong integration test luôn ở trạng thái "chưa cấu hình", không gọi mạng.</summary>
    private sealed class DisabledPayosGateway : IPayosGateway
    {
        private const string Message = "payOS bị tắt trong integration test.";
        public bool IsConfigured => false;
        public string? DisplayBankName => null;
        public string? DisplayAccountNumber => null;
        public Task<Result<PayosPaymentLink>> CreatePaymentLinkAsync(PayosCreateLinkRequest request, CancellationToken ct) =>
            Task.FromResult(Result.Failure<PayosPaymentLink>(Message));
        public Task<Result<PayosPaymentInfo>> GetPaymentInfoAsync(long orderCode, CancellationToken ct) =>
            Task.FromResult(Result.Failure<PayosPaymentInfo>(Message));
        public Task<Result<bool>> CancelPaymentLinkAsync(long orderCode, string reason, CancellationToken ct) =>
            Task.FromResult(Result.Failure<bool>(Message));
        public PayosWebhookData? VerifyWebhook(JsonElement body) => null;
    }
}
