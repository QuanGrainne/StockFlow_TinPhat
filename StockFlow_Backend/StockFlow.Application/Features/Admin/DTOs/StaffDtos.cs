namespace StockFlow.Application.Features.Admin.DTOs;

public record StaffDto(
    string Id,
    string Code,
    string Name,
    string Title,
    string Email,
    string Phone,
    string Department,
    string Role,
    string RoleTitle,
    List<string> AssignedWarehouses,
    string Status,
    string? Avatar
);

public record CreateStaffRequest(
    string? Code,
    string Name,
    string? Title,
    string Email,
    string? Phone,
    string? Department,
    string Role,
    string? RoleTitle,
    List<string>? AssignedWarehouses,
    string? Status
);

public record UpdateStaffRequest(
    string Name,
    string? Title,
    string Email,
    string? Phone,
    string? Department,
    string Role,
    string? RoleTitle,
    List<string>? AssignedWarehouses
);
