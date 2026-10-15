namespace StockFlow.Application.Features.Auth.DTOs;

public record LoginRequest(string Username, string Password);

public record WarehouseSummaryDto(int WarehouseId, string WarehouseCode, string WarehouseName);

public record LoginResponse(
    string Token,
    int UserId,
    string Username,
    string FullName,
    string Email,
    List<string> Roles,
    List<WarehouseSummaryDto> Warehouses);

public record CurrentUserResponse(
    int UserId,
    string Username,
    string FullName,
    string Email,
    string? Phone,
    bool IsActive,
    List<string> Roles,
    List<WarehouseSummaryDto> Warehouses);

