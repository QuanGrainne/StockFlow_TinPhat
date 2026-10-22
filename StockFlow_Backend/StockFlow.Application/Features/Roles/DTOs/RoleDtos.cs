namespace StockFlow.Application.Features.Roles.DTOs;

public record RoleDto(
    string Id,
    string Name,
    string Code,
    string Rank,
    bool IsSystem,
    string Description,
    int StaffCount
);

public record CreateRoleRequest(
    string Name,
    string Code,
    string? Description,
    string? Rank
);

public record UpdateRoleRequest(
    string Name,
    string? Description
);

public record PermissionModuleDto(
    string Id,
    string Stt,
    string Name,
    string Code,
    string Description,
    bool Read,
    bool Create,
    bool Update,
    bool Delete,
    bool Approve
);

public record SaveRolePermissionsRequest(
    List<PermissionModuleDto> Modules
);
