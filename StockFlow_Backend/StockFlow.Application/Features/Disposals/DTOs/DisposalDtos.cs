namespace StockFlow.Application.Features.Disposals.DTOs;

/// <summary>1 dòng hàng hủy gửi lên khi lưu phiếu</summary>
public record DisposalItemRequest(int ProductId, decimal Quantity, string? Reason);

/// <summary>
/// Lưu phiếu xuất hủy (form lập phiếu). Status = DRAFT (Lưu tạm, chưa trừ tồn) hoặc COMPLETED (Hoàn thành, trừ tồn kho).
/// DisposalCode để trống → hệ thống tự sinh XH000001. DisposalDate để trống → thời điểm hiện tại.
/// ProcessedBy (Người xuất hủy) để trống → người đang đăng nhập.
/// </summary>
public record SaveDisposalRequest(
    int WarehouseId,
    string? DisposalCode,
    string? Reason,
    string Status,
    List<DisposalItemRequest> Items,
    DateTime? DisposalDate = null,
    int? ProcessedBy = null);

/// <summary>
/// "Lưu" ở chi tiết phiếu: đổi Người xuất hủy, Ngày xuất hủy (chỉ phiếu tạm), Ghi chú — không đổi hàng hóa / tồn kho.
/// </summary>
public record UpdateDisposalInfoRequest(int ProcessedBy, DateTime? DisposalDate, string? Reason);

public record DisposalSummaryDto(
    int DisposalId,
    string DisposalCode,
    int WarehouseId,
    string WarehouseName,
    DateTime? DisposalDate,
    string Status,
    string? Reason,
    int? CreatedBy,
    string CreatedByName,
    int ProcessedBy,
    string ProcessedByName,
    int ItemCount,
    decimal TotalQuantity,
    decimal TotalValue,
    string? CreatedByPhone = null,
    string? ProcessedByPhone = null);

/// <summary>
/// UnitCost: phiếu đã xuất kho = giá vốn ghi trên thẻ kho lúc hủy; phiếu tạm = giá vốn hiện tại của kho.
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

/// <summary>Nhân viên chọn được làm "Người xuất hủy" (có quyền trên kho của phiếu)</summary>
public record DisposalStaffOptionDto(int UserId, string FullName);
