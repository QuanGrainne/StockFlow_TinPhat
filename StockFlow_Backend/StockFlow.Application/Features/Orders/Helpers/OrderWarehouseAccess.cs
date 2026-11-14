using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Orders.Helpers;

/// <summary>
/// Cô lập dữ liệu theo kho cho chứng từ bán hàng (hóa đơn, đơn đặt hàng) – BR-04.
/// - Kho của chứng từ = trx_orders.warehouse_id, cộng thêm kho của mọi phiếu xuất gắn với chứng từ.
/// - Người dùng (kể cả Admin) phải có quyền trên tất cả các kho đó.
/// - Chứng từ không xác định được kho thì chỉ Admin được xem / thao tác.
/// Quyền Admin và danh sách kho đều đọc từ DB, không dùng claim trong token (token có thể đã cũ).
/// </summary>
public static class OrderWarehouseAccess
{
    public static async Task<bool> CanAccessAsync(
        IStockFlowDbContext context,
        ICurrentUserService currentUser,
        IUserPermissionService permissionService,
        TrxOrder order,
        CancellationToken ct)
    {
        if (currentUser.UserId is not int userId) return false;
        // Admin cũng chỉ thao tác chứng từ thuộc kho được phân quyền (không còn toàn quyền mọi kho)

        // Đọc kho từ DB để không phụ thuộc vào việc handler đã Include phiếu xuất hay chưa
        var warehouseIds = await context.TrxStockIssues.AsNoTracking()
            .Where(si => si.SalesOrderId == order.OrderId)
            .Select(si => si.WarehouseId)
            .Distinct()
            .ToListAsync(ct);
        if (order.WarehouseId.HasValue && !warehouseIds.Contains(order.WarehouseId.Value))
            warehouseIds.Add(order.WarehouseId.Value);

        // Không biết chứng từ thuộc kho nào → chỉ Admin được truy cập
        if (warehouseIds.Count == 0) return await permissionService.IsAdminAsync(userId, ct);

        var authorized = await currentUser.GetAuthorizedWarehouseIdsAsync(ct);
        return warehouseIds.All(authorized.Contains);
    }
}
