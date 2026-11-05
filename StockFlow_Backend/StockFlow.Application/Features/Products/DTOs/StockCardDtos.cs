namespace StockFlow.Application.Features.Products.DTOs;

/// <summary>
/// 1 dòng thẻ kho của hàng hóa tại 1 kho (chỉ đọc, giao dịch mới nhất đứng đầu).
/// - DocumentCode: PN… nhập hàng, HD… bán hàng, THN… trả hàng nhập, CK… chuyển hàng, KK… kiểm kho, CB… cập nhật giá vốn.
/// - TransactionPrice (Giá GD): đơn giá trên chứng từ; null nếu chỉ sửa giá vốn / kiểm kho.
/// - UnitCost: giá vốn ngay sau giao dịch (dòng cũ trước khi có thẻ kho đầy đủ có thể null).
/// - Quantity: + nhập, − xuất, 0 nếu chỉ sửa giá vốn. EndingBalance: tồn cuối ngay sau giao dịch.
/// - DocumentId: id chứng từ để mở phiếu (PN/THN/CK/KK theo id phiếu, HD theo id hóa đơn); null nếu không mở được (CB…).
/// - PartnerName: NCC (nhập / trả hàng nhập), khách hàng (bán hàng), kho đối ứng (chuyển hàng); nội bộ thì null.
/// </summary>
public record StockCardEntryDto(
    int TransactionId,
    string DocumentCode,
    string? ReferenceType,
    int? ReferenceId,
    int? DocumentId,
    DateTime? TransactionDate,
    string TransactionType,
    string TransactionTypeName,
    decimal? TransactionPrice,
    decimal? UnitCost,
    decimal Quantity,
    decimal EndingBalance,
    string? PartnerName
);
