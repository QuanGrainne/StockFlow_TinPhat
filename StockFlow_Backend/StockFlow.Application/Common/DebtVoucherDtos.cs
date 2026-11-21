namespace StockFlow.Application.Common;

/// <summary>
/// Chi tiết 1 phiếu thu / phiếu chi công nợ (PT..., PC...) để xem từ sổ công nợ Nhà cung cấp / Khách hàng.
/// VoucherType: RECEIPT (phiếu thu — tiền vào) | PAYMENT (phiếu chi — tiền ra).
/// CanCancel: chỉ phiếu thu / chi độc lập (không gắn phiếu nhập / trả hàng) mới hủy được ở đây.
/// </summary>
public record DebtVoucherDetailDto(
    string Code,
    string VoucherType,
    string TypeLabel,
    DateTime? TransactionDate,
    string? CreatedByName,
    string PaymentMethod,
    decimal Amount,
    string? Description,
    string Status,
    string PartnerCode,
    string PartnerName,
    List<DebtVoucherLineDto> Lines,
    bool CanCancel);

/// <summary>
/// Phần phân bổ của phiếu vào chứng từ: DocumentType = GOODS_RECEIPT | PURCHASE_RETURN | SALES_RETURN,
/// null = không gắn chứng từ (thu / chi công nợ chung).
/// </summary>
public record DebtVoucherLineDto(
    string? DocumentType,
    int? DocumentId,
    string? DocumentCode,
    DateTime? DocumentDate,
    decimal Amount);
