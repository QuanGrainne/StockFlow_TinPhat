using Moq;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;

namespace StockFlow.UnitTests.Common;

/// <summary>Mock IUserPermissionService: quyền chức năng (feature) đọc từ ma trận quyền trong DB ở bản thật.</summary>
public static class Permissions
{
    /// <summary>featureIds dạng "feat-production-plans"; mã lưu trong DB tính bằng FeatureConstants.ToCode.</summary>
    public static Mock<IUserPermissionService> WithFeatures(params string[] featureIds)
    {
        var codes = new HashSet<string>(featureIds.Select(FeatureConstants.ToCode));
        var mock = new Mock<IUserPermissionService>();
        mock.Setup(x => x.GetFeatureCodesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(codes);
        mock.Setup(x => x.GetPermissionCodesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HashSet<string>());
        mock.Setup(x => x.IsAdminAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        return mock;
    }
}
