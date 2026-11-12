using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.WarehousePermissions.DTOs;

namespace StockFlow.Application.Features.WarehousePermissions.Queries;

/// <summary>
/// Truy vấn danh sách các kho vật lý mà người dùng hiện tại có quyền truy cập (Data Isolation).
/// </summary>
public record GetMyWarehousesQuery : IRequest<Result<List<WarehouseFacilityDto>>>;

public class GetMyWarehousesQueryHandler : IRequestHandler<GetMyWarehousesQuery, Result<List<WarehouseFacilityDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetMyWarehousesQueryHandler(
        IStockFlowDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<WarehouseFacilityDto>>> Handle(GetMyWarehousesQuery request, CancellationToken cancellationToken)
    {
        if (!_currentUserService.IsAuthenticated)
        {
            return Result.Failure<List<WarehouseFacilityDto>>("Yêu cầu xác thực tài khoản để xem kho làm việc.");
        }

        var authorizedWarehouseIds = await _currentUserService.GetAuthorizedWarehouseIdsAsync(cancellationToken);

        var query = _context.MstWarehouses
            .Include(w => w.JncUserWarehouseAccesses)
            .Where(w => w.IsActive != false)
            .AsNoTracking();

        // Mọi vai trò (kể cả Admin) chỉ lấy các kho được tích trong phân quyền kho
        query = query.Where(w => authorizedWarehouseIds.Contains(w.WarehouseId));

        var warehouses = await query.OrderBy(w => w.WarehouseId).ToListAsync(cancellationToken);

        var result = warehouses.Select(w => new WarehouseFacilityDto(
            Id: w.WarehouseCode ?? $"FAC-{w.WarehouseId:D2}",
            WarehouseId: w.WarehouseId,
            Code: w.WarehouseCode ?? $"WH-{w.WarehouseId:D2}",
            Name: w.WarehouseName ?? $"Kho #{w.WarehouseId}",
            Address: w.Address ?? "Hà Nội, Việt Nam",
            StaffCount: w.JncUserWarehouseAccesses.Count,
            Area: !string.IsNullOrWhiteSpace(w.Description) && w.Description.Contains("m²") ? w.Description : "3,500 m²",
            Status: w.IsActive != false ? "ACTIVE" : "INACTIVE",
            Description: w.Description
        )).ToList();

        return Result.Success(result);
    }
}
