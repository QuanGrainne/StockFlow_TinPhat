using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;

namespace StockFlow.API.Authorization;

/// <summary>
/// Yêu cầu vai trò của người dùng được tick ít nhất một trong các chức năng navbar (màn Phân quyền chức năng).
/// Dùng kèm [RequirePermission] trên các API ghi dữ liệu, VD [RequireFeature("feat-pos")]:
/// bỏ tick "Bán hàng" thì gọi thẳng API tạo hóa đơn POS cũng bị chặn (403).
/// Truyền nhiều mã khi API được dùng chung bởi nhiều chức năng (VD tạo nhanh nhà cung cấp từ màn Nhập hàng).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class RequireFeatureAttribute : AuthorizeAttribute, IAuthorizationRequirementData
{
    public RequireFeatureAttribute(params string[] featureIds)
    {
        FeatureIds = featureIds;
    }

    public string[] FeatureIds { get; }

    public IEnumerable<IAuthorizationRequirement> GetRequirements()
    {
        yield return new FeatureRequirement(FeatureIds);
    }
}

public sealed record FeatureRequirement(string[] FeatureIds) : IAuthorizationRequirement
{
    public IEnumerable<string> FeatureNames =>
        FeatureIds.Select(id => FeatureConstants.FindById(id)?.Name ?? id);
}

public sealed class FeatureAuthorizationHandler : AuthorizationHandler<FeatureRequirement>
{
    private readonly IUserPermissionService _permissionService;

    public FeatureAuthorizationHandler(IUserPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        FeatureRequirement requirement)
    {
        var idClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idClaim, out var userId)) return;

        var features = await _permissionService.GetFeatureCodesAsync(userId);
        if (requirement.FeatureIds.Any(id => features.Contains(FeatureConstants.ToCode(id))))
        {
            context.Succeed(requirement);
        }
    }
}
