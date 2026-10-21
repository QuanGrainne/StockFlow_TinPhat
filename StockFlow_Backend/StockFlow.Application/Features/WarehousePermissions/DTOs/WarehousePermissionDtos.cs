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

public record WarehouseStaffSimpleDto(
    int UserId,
    string FullName,
    string Username,
    string Email,
    string Role
);

public record WarehouseDetailDto(
    string Id,
    int WarehouseId,
    string Code,
    string Name,
    string Address,
    int StaffCount,
    string Area,
    string Status,
    string? Description,
    int TotalProductCount,
    decimal TotalStockQuantity,
    List<WarehouseStaffSimpleDto> AssignedStaff
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

public class UpdateWarehouseAccessRequest
{
    public List<string>? AssignedWarehouses { get; set; } = new();
    public List<int>? WarehouseIds { get; set; } = new();
}

public class CreateWarehouseRequest
{
    private string? _warehouseCode;
    public string WarehouseCode
    {
        get => !string.IsNullOrWhiteSpace(_warehouseCode) ? _warehouseCode : (Code ?? string.Empty);
        set => _warehouseCode = value;
    }
    public string? Code { get; set; }

    private string? _warehouseName;
    public string WarehouseName
    {
        get => !string.IsNullOrWhiteSpace(_warehouseName) ? _warehouseName : (Name ?? string.Empty);
        set => _warehouseName = value;
    }
    public string? Name { get; set; }

    public string? Address { get; set; }

    private string? _description;
    public string? Description
    {
        get => !string.IsNullOrWhiteSpace(_description) ? _description : Area;
        set => _description = value;
    }
    public string? Area { get; set; }

    public bool? IsActive { get; set; } = true;
}

public class UpdateWarehouseRequest
{
    private string? _warehouseName;
    public string WarehouseName
    {
        get => !string.IsNullOrWhiteSpace(_warehouseName) ? _warehouseName : (Name ?? string.Empty);
        set => _warehouseName = value;
    }
    public string? Name { get; set; }

    public string? Address { get; set; }

    private string? _description;
    public string? Description
    {
        get => !string.IsNullOrWhiteSpace(_description) ? _description : Area;
        set => _description = value;
    }
    public string? Area { get; set; }

    public bool? IsActive { get; set; } = true;
}
