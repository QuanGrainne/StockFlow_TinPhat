using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StockFlow.API.Authorization;
using StockFlow.API.Controllers;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;
using Xunit;

namespace StockFlow.UnitTests.Authorization;

/// <summary>
/// Các ca 403 của workbook (P-05 / D.1 ghi "API-level"). Thay vì dựng web server, test chạy đúng chuỗi phân quyền của API ở mức unit:
/// 1) đọc [RequireAdmin] / [RequirePermission] / [RequireFeature] trên action thật của controller (reflection);
/// 2) dựng policy từ các requirement đó và chạy DefaultAuthorizationService với handler thật của dự án
///    (AdminAuthorizationHandler, PermissionAuthorizationHandler, FeatureAuthorizationHandler) – IUserPermissionService là mock;
/// 3) đưa kết quả Forbid vào JsonAuthorizationResultHandler thật để lấy mã 403 và câu thông báo JSON.
/// Ngoài phạm vi unit: middleware xác thực JWT và FallbackPolicy – vẫn thuộc API test.
/// </summary>
public class ApiPermissionTests
{
    private const string AdminOnly = "Chỉ Quản trị viên mới được thực hiện thao tác này.";

    /// <summary>Người dùng id 3 đã đăng nhập, không phải Admin, không có mã quyền nào nhưng có đủ chức năng navbar.</summary>
    private static async Task<(int Status, string Message)> CallAsNonAdmin(Type controller, string action)
    {
        var method = controller.GetMethods(BindingFlags.Public | BindingFlags.Instance).Single(m => m.Name == action);
        var requirements = method.GetCustomAttributes<AuthorizeAttribute>()
            .OfType<IAuthorizationRequirementData>()
            .SelectMany(a => a.GetRequirements())
            .ToList();
        Assert.NotEmpty(requirements);

        var permissions = new Mock<IUserPermissionService>();
        permissions.Setup(p => p.IsAdminAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        permissions.Setup(p => p.GetPermissionCodesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(new HashSet<string>());
        permissions.Setup(p => p.GetFeatureCodesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FeatureConstants.Features.Select(f => f.Code).ToHashSet(StringComparer.OrdinalIgnoreCase));

        var services = new ServiceCollection()
            .AddLogging()
            .AddAuthorizationCore()
            .AddSingleton(permissions.Object)
            .AddSingleton<IAuthorizationHandler, AdminAuthorizationHandler>()
            .AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>()
            .AddSingleton<IAuthorizationHandler, FeatureAuthorizationHandler>()
            .BuildServiceProvider();

        var policy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().AddRequirements(requirements.ToArray()).Build();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "3"), new Claim(ClaimTypes.Role, "SalesStaff"),
        }, "Bearer"));

        var result = await services.GetRequiredService<IAuthorizationService>().AuthorizeAsync(user, null, policy);
        Assert.False(result.Succeeded);

        var http = new DefaultHttpContext { User = user };
        http.Response.Body = new MemoryStream();
        await new JsonAuthorizationResultHandler().HandleAsync(_ => Task.CompletedTask, http, policy, PolicyAuthorizationResult.Forbid(result.Failure));
        http.Response.Body.Position = 0;
        using var json = await JsonDocument.ParseAsync(http.Response.Body);
        return (http.Response.StatusCode, json.RootElement.GetProperty("message").GetString()!);
    }

    private static async Task AssertForbidden(Type controller, string action, string message)
    {
        var (status, text) = await CallAsNonAdmin(controller, action);
        Assert.Equal(StatusCodes.Status403Forbidden, status);
        Assert.Equal(message, text);
    }

    [Fact(DisplayName = "CreateStaff/UTCID08 – không phải Admin: 403 \"Chỉ Quản trị viên mới được thực hiện thao tác này.\"")]
    [Trait("Function", "CreateStaff")][Trait("UTCID", "CreateStaff/UTCID08")][Trait("Type", "A")]
    public Task CreateStaff_UTCID08() => AssertForbidden(typeof(StaffController), nameof(StaffController.CreateStaff), AdminOnly);

    [Fact(DisplayName = "ToggleStaffStatus/UTCID05 – không phải Admin: 403")]
    [Trait("Function", "ToggleStaffStatus")][Trait("UTCID", "ToggleStaffStatus/UTCID05")][Trait("Type", "A")]
    public Task ToggleStaffStatus_UTCID05() => AssertForbidden(typeof(StaffController), nameof(StaffController.ToggleStaffStatus), AdminOnly);

    [Fact(DisplayName = "ResetStaffPassword/UTCID03 – không phải Admin: 403")]
    [Trait("Function", "ResetStaffPassword")][Trait("UTCID", "ResetStaffPassword/UTCID03")][Trait("Type", "A")]
    public Task ResetStaffPassword_UTCID03() => AssertForbidden(typeof(StaffController), nameof(StaffController.ResetStaffPassword), AdminOnly);

    [Fact(DisplayName = "SaveRolePermissions/UTCID06 – không phải Admin: 403")]
    [Trait("Function", "SaveRolePermissions")][Trait("UTCID", "SaveRolePermissions/UTCID06")][Trait("Type", "A")]
    public Task SaveRolePermissions_UTCID06() => AssertForbidden(typeof(RolesController), nameof(RolesController.SaveRolePermissions), AdminOnly);

    [Fact(DisplayName = "SaveFeatureMatrix/UTCID07 – không phải Admin: 403")]
    [Trait("Function", "SaveFeatureMatrix")][Trait("UTCID", "SaveFeatureMatrix/UTCID07")][Trait("Type", "A")]
    public Task SaveFeatureMatrix_UTCID07() => AssertForbidden(typeof(RolesController), nameof(RolesController.SaveFeatureMatrix), AdminOnly);

    [Fact(DisplayName = "UpdateWarehouseAccess/UTCID06 – không phải Admin: 403")]
    [Trait("Function", "UpdateWarehouseAccess")][Trait("UTCID", "UpdateWarehouseAccess/UTCID06")][Trait("Type", "A")]
    public Task UpdateWarehouseAccess_UTCID06() =>
        AssertForbidden(typeof(WarehousePermissionsController), nameof(WarehousePermissionsController.UpdateWarehouseAccess), AdminOnly);

    [Fact(DisplayName = "UpdateSettings/UTCID05 – thiếu AUTH_UPDATE: 403 \"…(cần quyền AUTH_UPDATE).\"")]
    [Trait("Function", "UpdateSettings")][Trait("UTCID", "UpdateSettings/UTCID05")][Trait("Type", "A")]
    public Task UpdateSettings_UTCID05() =>
        AssertForbidden(typeof(OrderSettingsController), nameof(OrderSettingsController.UpdateSettings),
            "Bạn không có quyền thực hiện thao tác này (cần quyền AUTH_UPDATE).");

    [Fact(DisplayName = "ImportProducts/UTCID05 – thiếu GOODS_CREATE: 403")]
    [Trait("Function", "ImportProducts")][Trait("UTCID", "ImportProducts/UTCID05")][Trait("Type", "A")]
    public Task ImportProducts_UTCID05() =>
        AssertForbidden(typeof(ProductsController), nameof(ProductsController.ImportProducts),
            "Bạn không có quyền thực hiện thao tác này (cần quyền GOODS_CREATE).");

    [Fact(DisplayName = "ToggleProductStatus/UTCID04 – thiếu GOODS_UPDATE: 403")]
    [Trait("Function", "ToggleProductStatus")][Trait("UTCID", "ToggleProductStatus/UTCID04")][Trait("Type", "A")]
    public Task ToggleProductStatus_UTCID04() =>
        AssertForbidden(typeof(ProductsController), nameof(ProductsController.ToggleProductStatus),
            "Bạn không có quyền thực hiện thao tác này (cần quyền GOODS_UPDATE).");
}
