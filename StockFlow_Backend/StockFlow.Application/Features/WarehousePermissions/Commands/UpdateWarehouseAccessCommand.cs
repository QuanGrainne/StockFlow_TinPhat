using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.WarehousePermissions.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.WarehousePermissions.Commands;

public record UpdateWarehouseAccessCommand(
    int UserId, 
    UpdateWarehouseAccessRequest Request
) : IRequest<Result<WarehouseStaffAccessDto>>;

public class UpdateWarehouseAccessCommandHandler 
    : IRequestHandler<UpdateWarehouseAccessCommand, Result<WarehouseStaffAccessDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateWarehouseAccessCommandHandler(
        IStockFlowDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<WarehouseStaffAccessDto>> Handle(UpdateWarehouseAccessCommand command, CancellationToken cancellationToken)
    {
        if (_currentUserService.IsAuthenticated && !_currentUserService.IsAdmin)
        {
            return Result.Failure<WarehouseStaffAccessDto>("Chỉ có Quản trị viên (Admin) mới có quyền phân bổ kho làm việc cho nhân sự.");
        }

        var user = await _context.SecUsers
            .Include(u => u.JncUserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.JncUserWarehouseAccesses)
                .ThenInclude(wa => wa.Warehouse)
            .FirstOrDefaultAsync(u => u.UserId == command.UserId, cancellationToken);

        if (user == null)
        {
            return Result.Failure<WarehouseStaffAccessDto>("Không tìm thấy thông tin nhân sự.");
        }

        var allWarehouses = await _context.MstWarehouses.ToListAsync(cancellationToken);

        // Resolve target warehouse IDs
        var targetWarehouseIds = new HashSet<int>();

        if (command.Request.WarehouseIds != null && command.Request.WarehouseIds.Count > 0)
        {
            foreach (var wid in command.Request.WarehouseIds)
            {
                if (allWarehouses.Any(w => w.WarehouseId == wid))
                {
                    targetWarehouseIds.Add(wid);
                }
            }
        }

        if (command.Request.AssignedWarehouses != null && command.Request.AssignedWarehouses.Count > 0)
        {
            foreach (var codeOrId in command.Request.AssignedWarehouses)
            {
                var trimmed = codeOrId.Trim();
                var whByCode = allWarehouses.FirstOrDefault(w => 
                    string.Equals(w.WarehouseCode, trimmed, StringComparison.OrdinalIgnoreCase) ||
                    (int.TryParse(trimmed, out var wid) && w.WarehouseId == wid) ||
                    (trimmed.Equals("WH-HN-01", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "K001" || (w.WarehouseName != null && w.WarehouseName.Contains("Gia Lâm")))) ||
                    (trimmed.Equals("K001", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "WH-HN-01" || (w.WarehouseName != null && w.WarehouseName.Contains("Gia Lâm")))) ||
                    (trimmed.Equals("WH-HN-02", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "K002" || (w.WarehouseName != null && w.WarehouseName.Contains("Đông Anh")))) ||
                    (trimmed.Equals("K002", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "WH-HN-02" || (w.WarehouseName != null && w.WarehouseName.Contains("Đông Anh")))) ||
                    (trimmed.Equals("WH-HN-03", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "K003" || (w.WarehouseName != null && w.WarehouseName.Contains("Hà Đông")))) ||
                    (trimmed.Equals("K003", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "WH-HN-03" || (w.WarehouseName != null && w.WarehouseName.Contains("Hà Đông")))) ||
                    (trimmed.Equals("WH-HN-04", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "K004" || (w.WarehouseName != null && w.WarehouseName.Contains("Hoàn Kiếm")))) ||
                    (trimmed.Equals("K004", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "WH-HN-04" || (w.WarehouseName != null && w.WarehouseName.Contains("Hoàn Kiếm"))))
                );
                
                if (whByCode != null)
                {
                    targetWarehouseIds.Add(whByCode.WarehouseId);
                }
            }
        }

        // Remove access not in target
        var accessesToRemove = user.JncUserWarehouseAccesses
            .Where(wa => !targetWarehouseIds.Contains(wa.WarehouseId))
            .ToList();

        foreach (var access in accessesToRemove)
        {
            _context.JncUserWarehouseAccesses.Remove(access);
        }

        // Add new access
        var currentAccessWarehouseIds = user.JncUserWarehouseAccesses
            .Select(wa => wa.WarehouseId)
            .ToHashSet();

        var now = DateTime.UtcNow;
        foreach (var targetId in targetWarehouseIds)
        {
            if (!currentAccessWarehouseIds.Contains(targetId))
            {
                var newAccess = new JncUserWarehouseAccess
                {
                    UserId = user.UserId,
                    WarehouseId = targetId,
                    AssignedAt = now
                };
                await _context.JncUserWarehouseAccesses.AddAsync(newAccess, cancellationToken);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Reload user accesses
        var updatedAccesses = await _context.JncUserWarehouseAccesses
            .Include(wa => wa.Warehouse)
            .Where(wa => wa.UserId == user.UserId)
            .ToListAsync(cancellationToken);

        var roleMap = new Dictionary<string, (string RoleCode, string RoleTitle, string Department)>(StringComparer.OrdinalIgnoreCase)
        {
            { "Admin", ("ADMIN", "Quản trị viên", "Quản trị hệ thống") },
            { "Manager", ("MANAGER", "Quản lý", "Ban Giám đốc") },
            { "SalesStaff", ("SALES", "Nhân viên bán hàng", "Phòng Kinh doanh") },
            { "WarehouseStaff", ("WAREHOUSE", "Nhân viên kho", "Kho vận & Logistics") },
            { "ProductionStaff", ("PRODUCTION", "Nhân viên sản xuất", "Xưởng Sản xuất") }
        };

        var primaryRole = user.JncUserRoles.FirstOrDefault()?.Role?.RoleName ?? "WarehouseStaff";
        var (roleCode, roleTitle, defaultDept) = roleMap.GetValueOrDefault(primaryRole, ("WAREHOUSE", "Nhân viên", "Kho vận & Logistics"));

        var assignedWarehouseCodes = updatedAccesses
            .Where(w => w.Warehouse?.WarehouseCode != null)
            .Select(w => w.Warehouse!.WarehouseCode!)
            .ToList();

        var assignedDetails = updatedAccesses
            .Where(w => w.Warehouse != null)
            .Select(w => new WarehouseSimpleDto(
                WarehouseId: w.Warehouse.WarehouseId,
                Code: w.Warehouse.WarehouseCode ?? "",
                Name: w.Warehouse.WarehouseName ?? ""
            ))
            .ToList();

        var dto = new WarehouseStaffAccessDto(
            Id: user.UserId.ToString(),
            UserId: user.UserId,
            Code: $"NV-NV{user.UserId:D3}",
            Name: user.FullName ?? user.Username ?? "",
            Title: roleTitle,
            Email: user.Email ?? "",
            Phone: user.Phone ?? "",
            Department: defaultDept,
            Role: roleCode,
            RoleTitle: roleTitle,
            AssignedWarehouses: assignedWarehouseCodes,
            AssignedWarehouseDetails: assignedDetails,
            Status: user.IsActive == false ? "LOCKED" : "ACTIVE",
            Avatar: null
        );

        return Result.Success(dto);
    }
}
