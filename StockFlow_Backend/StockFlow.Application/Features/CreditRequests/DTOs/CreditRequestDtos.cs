namespace StockFlow.Application.Features.CreditRequests.DTOs;

/// <summary>Sales Accountant gửi yêu cầu khi POS báo vượt hạn mức (UC-27).</summary>
public class CreateCreditRequestRequest
{
    public int PartnerId { get; set; }

    /// <summary>Nợ mới dự kiến của hóa đơn bị chặn (Tổng phải thu − Khách trả).</summary>
    public decimal ExpectedNewDebt { get; set; }

    /// <summary>Hạn mức đề xuất (không bắt buộc). Bỏ trống thì hệ thống lấy dư nợ hiện tại + nợ mới dự kiến.</summary>
    public decimal? RequestedLimit { get; set; }

    public string Reason { get; set; } = string.Empty;
}

/// <summary>Manager duyệt: ONE_TIME (ngoại lệ một lần) hoặc NEW_LIMIT (nâng hạn mức) – UC-64, BR-13.</summary>
public class ApproveCreditRequestRequest
{
    public string ApprovalType { get; set; } = string.Empty;

    /// <summary>
    /// Mức Kế toán trưởng duyệt (sửa được; bỏ trống = theo số Sales đề xuất).
    /// ONE_TIME: dư nợ tối đa sau hóa đơn; NEW_LIMIT: hạn mức mới (A62.2: Manager nhập hạn mức mới).
    /// </summary>
    public decimal? ApprovedLimit { get; set; }

    public string? Notes { get; set; }
}

/// <summary>Manager từ chối, bắt buộc lý do (BR-13, BR-50).</summary>
public class RejectCreditRequestRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class CreditRequestDto
{
    public int RequestId { get; set; }
    public string? RequestCode { get; set; }
    public int PartnerId { get; set; }
    public string? PartnerCode { get; set; }
    public string? PartnerName { get; set; }

    /// <summary>Dư nợ hiện tại của khách (đọc lúc xem).</summary>
    public decimal CurrentDebt { get; set; }

    /// <summary>Hạn mức hiện tại của khách (đọc lúc xem).</summary>
    public decimal CurrentCreditLimit { get; set; }

    /// <summary>Hạn mức của khách tại thời điểm gửi yêu cầu (cột current_limit).</summary>
    public decimal? LimitAtRequest { get; set; }

    /// <summary>Số Sales đề xuất (dư nợ tối đa cần có sau hóa đơn).</summary>
    public decimal? RequestedLimit { get; set; }

    /// <summary>Số Kế toán trưởng duyệt (null khi chờ / từ chối).</summary>
    public decimal? ApprovedLimit { get; set; }

    public string? Reason { get; set; }
    public string? Status { get; set; }
    public string? ApprovalType { get; set; }

    public int RequestedBy { get; set; }
    public string? RequestedByName { get; set; }
    public DateTime? RequestDate { get; set; }

    public int? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovalDate { get; set; }

    /// <summary>Ghi chú duyệt hoặc lý do từ chối.</summary>
    public string? ApprovalNotes { get; set; }

    /// <summary>Hóa đơn đã dùng ngoại lệ một lần (null nếu chưa dùng).</summary>
    public int? SalesOrderId { get; set; }
    public string? SalesOrderCode { get; set; }
    public bool IsUsed { get; set; }
}

public class CreditRequestListDto
{
    public List<CreditRequestDto> Items { get; set; } = new();

    /// <summary>Số yêu cầu đang chờ duyệt (hiển thị trên tab Approval Inbox).</summary>
    public int PendingCount { get; set; }
}

/// <summary>Kết quả thao tác (gửi / duyệt / từ chối) kèm thông báo hiển thị.</summary>
public class CreditRequestActionResultDto
{
    public CreditRequestDto Request { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Thông tin khách hàng để Kế toán trưởng xét duyệt (A62.2): tổng quan mua hàng và lịch sử thanh toán.
/// Chưa có hạn trả nợ nên chưa tính nợ quá hạn (BR-18).
/// </summary>
public class CustomerCreditHistoryDto
{
    public int PartnerId { get; set; }
    public string? PartnerCode { get; set; }
    public string? PartnerName { get; set; }
    public string? Phone { get; set; }
    /// <summary>Ngày tạo hồ sơ khách (khách từ ngày)</summary>
    public DateTime? CustomerSince { get; set; }
    public decimal CurrentDebt { get; set; }
    public decimal CreditLimit { get; set; }

    // ── Tổng quan mua hàng ──
    public int InvoiceCountAll { get; set; }
    public decimal TotalPurchaseAll { get; set; }
    public int InvoiceCount12M { get; set; }
    public decimal TotalPurchase12M { get; set; }
    public decimal AverageInvoice12M { get; set; }
    public DateTime? FirstPurchaseDate { get; set; }
    public DateTime? LastPurchaseDate { get; set; }
    /// <summary>12 tháng gần nhất, cũ → mới</summary>
    public List<CreditHistoryMonthDto> MonthlyPurchases { get; set; } = new();
    public List<CreditHistoryInvoiceDto> RecentInvoices { get; set; } = new();

    // ── Lịch sử thanh toán ──
    public decimal TotalPaidAll { get; set; }
    public decimal TotalPaid12M { get; set; }
    public int PaymentCount12M { get; set; }
    public DateTime? LastPaymentDate { get; set; }
    public decimal? LastPaymentAmount { get; set; }
    /// <summary>Giá trị hàng khách trả lại 12 tháng (giảm nợ)</summary>
    public decimal TotalReturns12M { get; set; }
    public List<CreditHistoryPaymentDto> RecentPayments { get; set; } = new();
}

public record CreditHistoryMonthDto(string Month, int InvoiceCount, decimal Purchase, decimal Paid);

public record CreditHistoryInvoiceDto(int OrderId, string OrderCode, DateTime? OrderDate, decimal Total, decimal Paid, decimal Outstanding);

public record CreditHistoryPaymentDto(string Code, DateTime? Date, decimal Amount, string? PaymentMethod, string? OrderCode);
