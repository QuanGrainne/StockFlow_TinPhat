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
    string? Avatar,
    string? Username = null
);

public class CreateStaffRequest
{
    public string? Code { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Title { get; set; }
    public string? Department { get; set; }
    public string? Avatar { get; set; }
    public string Role { get; set; } = "WAREHOUSE";
    public string? RoleTitle { get; set; }
    public List<string>? AssignedWarehouses { get; set; }
    public string? Status { get; set; }
    public string? Password { get; set; }
    public string? Username { get; set; }
}

public class UpdateStaffRequest
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Title { get; set; }
    public string? Department { get; set; }
    public string? Avatar { get; set; }
    public string Role { get; set; } = "WAREHOUSE";
    public string? RoleTitle { get; set; }
    public List<string>? AssignedWarehouses { get; set; }
    public string? Password { get; set; }
    public string? Username { get; set; }
}
