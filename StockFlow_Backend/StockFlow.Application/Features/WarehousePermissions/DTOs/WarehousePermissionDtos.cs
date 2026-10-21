namespace StockFlow.Application.Features.WarehousePermissions.DTOs;

public record WarehouseFacilityDto(
    string Id,
    int WarehouseId,
    string Code,
    string Name,
    string Address,
    int StaffCount,
    string Area,
    string Status,
    string? Description = null
);

public record WarehouseSimpleDto(
    int WarehouseId,
    string Code,
    string Name
);

public record WarehouseStaffAccessDto(
    string Id,
    int UserId,
    string Code,
    string Name,
    string Title,
    string Email,
    string Phone,
    string Department,
    string Role,
    string RoleTitle,
    List<string> AssignedWarehouses,
    List<WarehouseSimpleDto> AssignedWarehouseDetails,
    string Status,
    string? Avatar = null
);

public record UpdateWarehouseAccessRequest(
    List<string>? AssignedWarehouses = null,
    List<int>? WarehouseIds = null
);

public record CreateWarehouseRequest(
    string WarehouseCode,
    string WarehouseName,
    string? Address = null,
    string? Description = null,
    bool? IsActive = true
);

public record UpdateWarehouseRequest(
    string WarehouseName,
    string? Address = null,
    string? Description = null,
    bool? IsActive = true
);
