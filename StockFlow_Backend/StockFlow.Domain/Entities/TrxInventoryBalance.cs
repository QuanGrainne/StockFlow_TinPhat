using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxInventoryBalance
{
    public int InventoryId { get; set; }

    public int WarehouseId { get; set; }

    public int? LocationId { get; set; }

    public int ProductId { get; set; }

    public int? LotId { get; set; }

    public decimal? Quantity { get; set; }

    public decimal? UnitCost { get; set; }

    public DateTime? LastUpdated { get; set; }

    /// <summary>Token khoá lạc quan: ánh xạ vào cột hệ thống xmin của PostgreSQL (không phải cột thật).</summary>
    public uint Version { get; set; }

    public virtual MstWarehouseLocation? Location { get; set; }

    public virtual MstInventoryLot? Lot { get; set; }

    public virtual MstProduct Product { get; set; } = null!;

    public virtual MstWarehouse Warehouse { get; set; } = null!;
}

