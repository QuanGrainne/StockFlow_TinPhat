using System.Reflection;
using StockFlow.API.Authorization;
using StockFlow.API.Controllers;
using StockFlow.Application.Features.Roles.Common;
using Xunit;

namespace StockFlow.UnitTests.Reports;

/// <summary>Chức năng "Báo cáo" (feat-reports): mặc định theo vai trò và quyền khai trên ReportsController.</summary>
public class ReportsPermissionTests
{
    private const string Function = "ReportsPermission";

    [Fact(DisplayName = "ReportsPermission/UTCID01 – feat-reports (FIN) mặc định bật cho Manager và Admin, không cho vai trò khác")]
    [Trait("Function", Function)][Trait("UTCID", "ReportsPermission/UTCID01")][Trait("Type", "N")]
    public void UTCID01_DefaultRoles()
    {
        var feature = FeatureConstants.FindById(FeatureConstants.Reports);
        Assert.NotNull(feature);
        Assert.Equal(("Báo cáo", "FIN", "FEAT_REPORTS"), (feature!.Name, feature.Module, feature.Code));

        Assert.Contains(FeatureConstants.Reports, FeatureConstants.GetDefaultFeatureIds("ROLE_MANAGER"));
        Assert.Contains(FeatureConstants.Reports, FeatureConstants.GetDefaultFeatureIds("ROLE_ADMIN"));
        foreach (var role in new[] { "ROLE_SALES", "ROLE_WAREHOUSE", "ROLE_PRODUCTION" })
            Assert.DoesNotContain(FeatureConstants.Reports, FeatureConstants.GetDefaultFeatureIds(role));
    }

    [Fact(DisplayName = "ReportsPermission/UTCID02 – mọi action của ReportsController khai FIN_READ và feat-reports")]
    [Trait("Function", Function)][Trait("UTCID", "ReportsPermission/UTCID02")][Trait("Type", "N")]
    public void UTCID02_EveryActionDeclaresPermissionAndFeature()
    {
        var actions = typeof(ReportsController).GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly);
        Assert.NotEmpty(actions);
        foreach (var action in actions)
        {
            var permission = action.GetCustomAttribute<RequirePermissionAttribute>();
            var feature = action.GetCustomAttribute<RequireFeatureAttribute>();
            Assert.True(permission != null, $"{action.Name} thiếu [RequirePermission]");
            Assert.True(feature != null, $"{action.Name} thiếu [RequireFeature]");
            Assert.Equal("FIN_READ", permission!.PermissionCode);
            Assert.Equal(new[] { FeatureConstants.Reports }, feature!.FeatureIds);
        }
    }
}
