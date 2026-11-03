using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxStockTransfer
{
    public int StockTransferId { get; set; }

    public string? TransferCode { get; set; }

    public int SourceWarehouseId { get; set; }

    public int DestWarehouseId { get; set; }

    public int CreatedBy { get; set; }

    public DateTime? TransferDate { get; set; }

    public DateTime? ReceivedDate { get; set; }

    public string? Status { get; set; }

    public string? Notes { get; set; }

    /// <summary>Ghi chú của chi nhánh nhận (lúc nhận hàng / sửa sau)</summary>
    public string? ReceiveNotes { get; set; }

    public virtual SecUser CreatedByNavigation { get; set; } = null!;

    public virtual MstWarehouse DestWarehouse { get; set; } = null!;

    public virtual ICollection<DtlStockTransferItem> DtlStockTransferItems { get; set; } = new List<DtlStockTransferItem>();

    public virtual MstWarehouse SourceWarehouse { get; set; } = null!;
}

