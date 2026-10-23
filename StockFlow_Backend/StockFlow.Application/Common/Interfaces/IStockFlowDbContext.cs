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
    DbSet<MstBusinessPartner> MstBusinessPartners { get; }
    DbSet<SecPermission> SecPermissions { get; }
    DbSet<MstProduct> MstProducts { get; }
    DbSet<MstProductCategory> MstProductCategories { get; }
    DbSet<MstUnit> MstUnits { get; }
    DbSet<TrxInventoryBalance> TrxInventoryBalances { get; }
    DbSet<TrxInventoryTransaction> TrxInventoryTransactions { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
