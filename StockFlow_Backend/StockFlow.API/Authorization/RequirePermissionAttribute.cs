using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.API.Authorization;

/// <summary>
/// Yêu cầu người dùng có mã quyền (VD: "STOCK_CREATE") theo ma trận phân quyền
/// trong PermissionConstants (MODULE_ACTION). Admin luôn được phép.
/// Dùng trên controller hoặc action: [RequirePermission("PURCHASE_CREATE")].
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class RequirePermissionAttribute : AuthorizeAttribute, IAuthorizationRequirementData
{
    public RequirePermissionAttribute(string permissionCode)
    {
        PermissionCode = permissionCode.ToUpperInvariant();
    }

    public string PermissionCode { get; }

    public IEnumerable<IAuthorizationRequirement> GetRequirements()
    {
        yield return new PermissionRequirement(PermissionCode);
    }
}

public sealed record PermissionRequirement(string PermissionCode) : IAuthorizationRequirement;

/// <summary>
/// Chỉ Quản trị viên (UC-07, UC-10: Primary Actor = Admin). Dùng cho các thao tác có thể
/// tự nâng quyền như sửa ma trận quyền của vai trò hay cấp quyền kho.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireAdminAttribute : AuthorizeAttribute, IAuthorizationRequirementData
{
    public IEnumerable<IAuthorizationRequirement> GetRequirements()
    {
        yield return new AdminRequirement();
    }
}

public sealed record AdminRequirement : IAuthorizationRequirement;

public sealed class AdminAuthorizationHandler : AuthorizationHandler<AdminRequirement>
{
    private readonly IUserPermissionService _permissionService;

    public AdminAuthorizationHandler(IUserPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AdminRequirement requirement)
    {
        var idClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(idClaim, out var userId) && await _permissionService.IsAdminAsync(userId))
        {
            context.Succeed(requirement);
        }
    }
}

/// <summary>
/// Kiểm tra quyền dựa trên dữ liệu hiện tại trong DB (không tin quyền ghi trong token),
/// nên thu hồi quyền hoặc khóa tài khoản có hiệu lực ngay ở request kế tiếp.
/// </summary>
public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IUserPermissionService _permissionService;

    public PermissionAuthorizationHandler(IUserPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var idClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idClaim, out var userId)) return;

        var codes = await _permissionService.GetPermissionCodesAsync(userId);
        if (codes.Contains(requirement.PermissionCode))
        {
            context.Succeed(requirement);
        }
    }
}

/// <summary>
/// Trả 401/403 kèm JSON { message } giống format lỗi BadRequest của các controller,
/// để frontend hiển thị được thông báo tiếng Việt.
/// </summary>
public sealed class JsonAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        // Giữ nguyên tiếng Việt trong JSON (giống format lỗi BadRequest của controller)
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    private readonly AuthorizationMiddlewareResultHandler _default = new();

    public async Task HandleAsync(
        RequestDelegate next,
        HttpContext context,
        AuthorizationPolicy policy,
        PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Challenged)
        {
            await WriteAsync(context, StatusCodes.Status401Unauthorized,
                "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
            return;
        }

        if (authorizeResult.Forbidden)
        {
            var missing = authorizeResult.AuthorizationFailure?.FailedRequirements
                .OfType<PermissionRequirement>()
                .Select(r => r.PermissionCode)
                .ToList() ?? new List<string>();

            var adminOnly = authorizeResult.AuthorizationFailure?.FailedRequirements
                .OfType<AdminRequirement>()
                .Any() ?? false;

            var message = adminOnly
                ? "Chỉ Quản trị viên mới được thực hiện thao tác này."
                : missing.Count > 0
                ? $"Bạn không có quyền thực hiện thao tác này (cần quyền {string.Join(", ", missing)})."
                : "Bạn không có quyền thực hiện thao tác này.";

            await WriteAsync(context, StatusCodes.Status403Forbidden, message);
            return;
        }

        await _default.HandleAsync(next, context, policy, authorizeResult);
    }

    private static async Task WriteAsync(HttpContext context, int statusCode, string message)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json; charset=utf-8";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { message }, JsonOptions));
    }
}
