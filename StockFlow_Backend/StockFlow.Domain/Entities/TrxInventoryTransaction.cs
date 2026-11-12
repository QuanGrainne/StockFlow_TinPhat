using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxInventoryTransaction
{
    public int TransactionId { get; set; }

    public int WarehouseId { get; set; }

    public int? LocationId { get; set; }

    public int ProductId { get; set; }

    public int? LotId { get; set; }

    public string? TransactionType { get; set; }

    public decimal? Quantity { get; set; }

    public string? ReferenceType { get; set; }

    public int? ReferenceId { get; set; }

    public DateTime? TransactionDate { get; set; }

    public int CreatedBy { get; set; }

    /// <summary>Thẻ kho – Giá GD: đơn giá trên chứng từ (giá nhập / giá bán / giá trả...). Null nếu chỉ sửa giá vốn / kiểm kho.</summary>
    public decimal? TransactionPrice { get; set; }

    /// <summary>Thẻ kho – Giá vốn của hàng tại kho ngay sau giao dịch.</summary>
    public decimal? UnitCost { get; set; }

    /// <summary>Thẻ kho – Tồn cuối tại kho ngay sau giao dịch.</summary>
    public decimal? BalanceAfter { get; set; }

    public virtual SecUser CreatedByNavigation { get; set; } = null!;

    public virtual MstWarehouseLocation? Location { get; set; }

    public virtual MstInventoryLot? Lot { get; set; }

    public virtual MstProduct Product { get; set; } = null!;

    public virtual MstWarehouse Warehouse { get; set; } = null!;
}

