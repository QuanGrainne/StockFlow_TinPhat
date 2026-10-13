using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class JncUserWarehouseAccess
{
    public int UserId { get; set; }

    public int WarehouseId { get; set; }

    public DateTime? AssignedAt { get; set; }

    public virtual SecUser User { get; set; } = null!;

    public virtual MstWarehouse Warehouse { get; set; } = null!;
}

