using Moq;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.UnitTests.Common;

/// <summary>
/// Mock ICurrentUserService. Quyền kho (jnc_user_warehouse_access) là danh sách kho được tích;
/// quyền chức năng (STOCK_UPDATE...) do [RequirePermission] ở tầng API kiểm nên không mô phỏng ở đây.
/// </summary>
public static class CurrentUser
{
    public static Mock<ICurrentUserService> WithWarehouses(int userId, params int[] warehouseIds)
    {
        var mock = new Mock<ICurrentUserService>();
        mock.SetupGet(x => x.UserId).Returns(userId);
        mock.SetupGet(x => x.Username).Returns($"user{userId}");
        mock.SetupGet(x => x.IsAuthenticated).Returns(true);
        mock.SetupGet(x => x.IsAdmin).Returns(false);
        mock.SetupGet(x => x.Roles).Returns(new[] { "WarehouseStaff" });
        mock.SetupGet(x => x.WarehouseIds).Returns(warehouseIds);
        mock.Setup(x => x.GetAuthorizedWarehouseIdsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(warehouseIds);
        mock.Setup(x => x.HasWarehouseAccessAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int warehouseId, CancellationToken _) => warehouseIds.Contains(warehouseId));
        return mock;
    }

    /// <summary>Không xác định được người dùng (UserId = null) – nhánh phòng thủ của handler; quyền kho vẫn như tham số.</summary>
    public static Mock<ICurrentUserService> WithoutUser(params int[] warehouseIds)
    {
        var mock = WithWarehouses(0, warehouseIds);
        mock.SetupGet(x => x.UserId).Returns((int?)null);
        return mock;
    }

    /// <summary>Admin (IsAdmin = true) có danh sách kho được tích như tham số.</summary>
    public static Mock<ICurrentUserService> Admin(int userId, params int[] warehouseIds)
    {
        var mock = WithWarehouses(userId, warehouseIds);
        mock.SetupGet(x => x.IsAdmin).Returns(true);
        mock.SetupGet(x => x.Roles).Returns(new[] { "Admin" });
        return mock;
    }
}
