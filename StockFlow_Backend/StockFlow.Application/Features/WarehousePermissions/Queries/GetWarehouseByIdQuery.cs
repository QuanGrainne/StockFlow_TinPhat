using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.WarehousePermissions.DTOs;

namespace StockFlow.Application.Features.WarehousePermissions.Queries;

public record GetWarehouseByIdQuery(int WarehouseId) : IRequest<Result<WarehouseDetailDto>>;

public class GetWarehouseByIdQueryHandler : IRequestHandler<GetWarehouseByIdQuery, Result<WarehouseDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetWarehouseByIdQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<WarehouseDetailDto>> Handle(GetWarehouseByIdQuery request, CancellationToken cancellationToken)
    {
        var warehouse = await _context.MstWarehouses
            .Include(w => w.JncUserWarehouseAccesses)
                .ThenInclude(wa => wa.User)
                    .ThenInclude(u => u.JncUserRoles)
                        .ThenInclude(ur => ur.Role)
            .Include(w => w.TrxInventoryBalances)
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.WarehouseId == request.WarehouseId, cancellationToken);

        if (warehouse == null)
        {
            return Result.Failure<WarehouseDetailDto>("Không tìm thấy thông tin kho.");
        }

        var assignedStaff = warehouse.JncUserWarehouseAccesses
            .Where(wa => wa.User != null)
            .Select(wa => new WarehouseStaffSimpleDto(
                UserId: wa.User.UserId,
                FullName: wa.User.FullName ?? wa.User.Username ?? "",
                Username: wa.User.Username ?? "",
                Email: wa.User.Email ?? "",
                Role: wa.User.JncUserRoles.FirstOrDefault()?.Role?.RoleName ?? "WarehouseStaff"
            )).ToList();

        var totalProducts = warehouse.TrxInventoryBalances.Select(b => b.ProductId).Distinct().Count();
        var totalStock = warehouse.TrxInventoryBalances.Sum(b => b.Quantity ?? 0);

        var dto = new WarehouseDetailDto(
            Id: warehouse.WarehouseCode ?? $"FAC-{warehouse.WarehouseId:D2}",
            WarehouseId: warehouse.WarehouseId,
            Code: warehouse.WarehouseCode ?? $"WH-{warehouse.WarehouseId:D2}",
            Name: warehouse.WarehouseName ?? $"Kho #{warehouse.WarehouseId}",
            Address: warehouse.Address ?? "Hà Nội, Việt Nam",
            StaffCount: assignedStaff.Count,
            Area: !string.IsNullOrWhiteSpace(warehouse.Description) && warehouse.Description.Contains("m²") ? warehouse.Description : "3,500 m²",
            Status: warehouse.IsActive != false ? "ACTIVE" : "INACTIVE",
            Description: warehouse.Description,
            TotalProductCount: totalProducts,
            TotalStockQuantity: totalStock,
            AssignedStaff: assignedStaff
        );

        return Result.Success(dto);
    }
}
