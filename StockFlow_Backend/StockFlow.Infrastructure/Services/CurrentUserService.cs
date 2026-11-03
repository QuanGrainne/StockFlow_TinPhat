using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Infrastructure.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IStockFlowDbContext _context;
    private readonly IUserPermissionService _permissionService;

    public CurrentUserService(
        IHttpContextAccessor httpContextAccessor,
        IStockFlowDbContext context,
        IUserPermissionService permissionService)
    {
        _httpContextAccessor = httpContextAccessor;
        _context = context;
        _permissionService = permissionService;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public int? UserId
    {
        get
        {
            var idClaim = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(idClaim, out var id) ? id : null;
        }
    }

    public string? Username => User?.FindFirst(ClaimTypes.Name)?.Value;

    public IReadOnlyList<string> Roles
    {
        get
        {
            if (User == null) return Array.Empty<string>();
            return User.FindAll(ClaimTypes.Role)
                .Select(c => c.Value)
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
    }

    public bool IsAdmin
    {
        get
        {
            if (!IsAuthenticated) return false;
            return Roles.Any(r => 
                r.Equals("ADMIN", StringComparison.OrdinalIgnoreCase) ||
                r.Equals("ROLE_ADMIN", StringComparison.OrdinalIgnoreCase) ||
                r.Contains("ADMIN", StringComparison.OrdinalIgnoreCase));
        }
    }

    public IReadOnlyList<int> WarehouseIds
    {
        get
        {
            if (User == null) return Array.Empty<int>();
            return User.FindAll("WarehouseId")
                .Select(c => int.TryParse(c.Value, out var id) ? id : 0)
                .Where(id => id > 0)
                .Distinct()
                .ToList();
        }
    }

    /// <summary>
    /// Kiểm tra Admin theo vai trò hiện tại trong DB (claim Role trong token có thể đã cũ).
    /// </summary>
    private Task<bool> IsAdminInDbAsync(CancellationToken cancellationToken)
        => UserId.HasValue
            ? _permissionService.IsAdminAsync(UserId.Value, cancellationToken)
            : Task.FromResult(false);

    public async Task<IReadOnlyList<int>> GetAuthorizedWarehouseIdsAsync(CancellationToken cancellationToken = default)
    {
        // 1. Quản trị viên (Admin) luôn có quyền trên toàn bộ các kho đang hoạt động
        if (await IsAdminInDbAsync(cancellationToken))
        {
            return await _context.MstWarehouses
                .Where(w => w.IsActive != false)
                .OrderBy(w => w.WarehouseId)
                .Select(w => w.WarehouseId)
                .ToListAsync(cancellationToken);
        }

        // 2. Luôn đọc bảng phân quyền jnc_user_warehouse_access trong DB (không tin claim WarehouseId
        //    trong token: token sống 7 ngày, Admin thu hồi kho phải có hiệu lực ngay).
        if (UserId.HasValue)
        {
            return await _context.JncUserWarehouseAccesses
                .Where(a => a.UserId == UserId.Value && (a.Warehouse == null || a.Warehouse.IsActive != false))
                .Select(a => a.WarehouseId)
                .Distinct()
                .ToListAsync(cancellationToken);
        }

        return Array.Empty<int>();
    }

    public async Task<bool> HasWarehouseAccessAsync(int warehouseId, CancellationToken cancellationToken = default)
    {
        // Admin luôn có quyền truy cập mọi kho
        if (await IsAdminInDbAsync(cancellationToken))
        {
            return true;
        }

        // Nếu người dùng không xác thực token, không cho phép truy cập tài nguyên kho
        if (!IsAuthenticated)
        {
            return false;
        }

        var authorizedIds = await GetAuthorizedWarehouseIdsAsync(cancellationToken);
        return authorizedIds.Contains(warehouseId);
    }
}
