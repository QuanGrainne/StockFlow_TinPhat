using Microsoft.EntityFrameworkCore;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Common.Interfaces;

public interface IStockFlowDbContext
{
    DbSet<SecUser> SecUsers { get; }
    DbSet<SecRole> SecRoles { get; }
    DbSet<JncUserRole> JncUserRoles { get; }
    DbSet<MstWarehouse> MstWarehouses { get; }
    DbSet<JncUserWarehouseAccess> JncUserWarehouseAccesses { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
