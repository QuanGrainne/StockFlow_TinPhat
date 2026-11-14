namespace StockFlow.Application.Features.Disposals.DTOs;

/// <summary>1 dòng hàng hủy gửi lên khi lưu phiếu</summary>
public record DisposalItemRequest(int ProductId, decimal Quantity, string? Reason);

/// <summary>
/// Lưu phiếu xuất hủy. Status = DRAFT (Lưu tạm, chưa trừ tồn) hoặc COMPLETED (Hoàn thành, trừ tồn kho).
/// DisposalCode để trống → hệ thống tự sinh XH000001.
/// </summary>
public record SaveDisposalRequest(
    int WarehouseId,
    string? DisposalCode,
    string? Reason,
    string Status,
    List<DisposalItemRequest> Items);

public record DisposalSummaryDto(
    int DisposalId,
    string DisposalCode,
    int WarehouseId,
    string WarehouseName,
    DateTime? DisposalDate,
    string Status,
    string? Reason,
    int ProcessedBy,
    string ProcessedByName,
    int ItemCount,
    decimal TotalQuantity,
    decimal TotalValue);

/// <summary>
/// UnitCost: phiếu hoàn thành = giá vốn ghi trên thẻ kho lúc hủy; phiếu tạm = giá vốn hiện tại của kho.
/// </summary>
public record DisposalItemDto(
    int DisposalItemId,
    int ProductId,
    string ProductCode,
    string ProductName,
    string Unit,
    decimal Quantity,
    decimal UnitCost,
    decimal Value,
    string? Reason);

public record DisposalDetailDto(DisposalSummaryDto Summary, List<DisposalItemDto> Items);
