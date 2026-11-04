using System;
using System.Collections.Generic;

namespace StockFlow.Application.Features.Transfers.DTOs;

public record TransferListDto(
    int StockTransferId,
    string TransferCode,
    DateTime? TransferDate,
    DateTime? ReceivedDate,
    int SourceWarehouseId,
    string SourceWarehouseCode,
    string SourceWarehouseName,
    int DestWarehouseId,
    string DestWarehouseCode,
    string DestWarehouseName,
    int CreatedBy,
    string CreatedByName,
    string Status,
    decimal TotalQuantity,
    decimal? TotalReceivedQuantity,
    decimal TotalAmount,
    string? Notes
);

public record TransferItemDetailDto(
    int TransferItemId,
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    decimal SourceStock,
    decimal DestStock,
    decimal TransferQuantity,
    decimal? ReceivedQuantity,
    decimal TransferPrice,
    decimal LineTotal,
    string? Notes,
    string? ReceiveNotes = null
);

public record TransferDetailDto(
    int StockTransferId,
    string TransferCode,
    DateTime? TransferDate,
    DateTime? ReceivedDate,
    int SourceWarehouseId,
    string SourceWarehouseCode,
    string SourceWarehouseName,
    int DestWarehouseId,
    string DestWarehouseCode,
    string DestWarehouseName,
    int CreatedBy,
    string CreatedByName,
    string Status,
    decimal TotalQuantity,
    decimal? TotalReceivedQuantity,
    decimal TotalAmount,
    string? Notes,
    List<TransferItemDetailDto> Items,
    string? ReceivedByName = null,
    string? ReceiveNotes = null
);

public record ProductWithStockDto(
    int ProductId,
    string ProductCode,
    string ProductName,
    string UnitName,
    decimal CostPrice,
    decimal StandardPrice,
    decimal SourceStock,
    decimal DestStock,
    string? ImageUrl = null
);

public class CreateTransferItemRequest
{
    public int ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal? TransferPrice { get; set; }
    public string? Notes { get; set; }
}

public class CreateTransferRequest
{
    public string? TransferCode { get; set; }
    public int SourceWarehouseId { get; set; }
    public int DestWarehouseId { get; set; }
    public DateTime? TransferDate { get; set; }
    public string? Notes { get; set; }
    public string? Status { get; set; } = "DRAFT";
    public List<CreateTransferItemRequest> Items { get; set; } = new();
}

public class UpdateTransferRequest
{
    public int DestWarehouseId { get; set; }
    public DateTime? TransferDate { get; set; }
    public string? Notes { get; set; }
    public List<CreateTransferItemRequest> Items { get; set; } = new();
}

/// <summary>Sửa ghi chú phiếu chuyển: null = giữ nguyên, chuỗi rỗng = xóa.</summary>
public class UpdateTransferNotesRequest
{
    public string? Notes { get; set; }
    public string? ReceiveNotes { get; set; }
}

public class ReceiveTransferItemRequest
{
    public int? TransferItemId { get; set; }
    public int ProductId { get; set; }
    public decimal ReceivedQuantity { get; set; }
    /// <summary>Ghi chú dòng hàng lúc nhận (VD: "thiếu 1")</summary>
    public string? Notes { get; set; }
}

public class ReceiveTransferRequest
{
    public DateTime? ReceivedDate { get; set; }
    public string? Notes { get; set; }
    public List<ReceiveTransferItemRequest>? Items { get; set; }
}
