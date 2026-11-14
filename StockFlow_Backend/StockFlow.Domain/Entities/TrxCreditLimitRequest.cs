using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxCreditLimitRequest
{
    public int RequestId { get; set; }

    public int PartnerId { get; set; }

    public int? SalesOrderId { get; set; }

    public int RequestedBy { get; set; }

    public decimal? CurrentLimit { get; set; }

    public decimal? RequestedLimit { get; set; }

    public string? Reason { get; set; }

    public string? Status { get; set; }

    public int? ApprovedBy { get; set; }

    public DateTime? RequestDate { get; set; }

    public DateTime? ApprovalDate { get; set; }

    public string? ApprovalNotes { get; set; }

    /// <summary>Mã yêu cầu (VD YCHM00001), sinh từ sequence seq_credit_request_code. Null với dữ liệu cũ.</summary>
    public string? RequestCode { get; set; }

    /// <summary>Loại duyệt: ONE_TIME / NEW_LIMIT (CreditApprovalType). Null khi chờ hoặc từ chối.</summary>
    public string? ApprovalType { get; set; }

    /// <summary>
    /// Mức Kế toán trưởng duyệt (có thể khác số Sales đề xuất ở RequestedLimit):
    /// ONE_TIME = dư nợ tối đa sau hóa đơn; NEW_LIMIT = hạn mức mới của khách. Null khi chờ hoặc từ chối.
    /// </summary>
    public decimal? ApprovedLimit { get; set; }

    public virtual SecUser? ApprovedByNavigation { get; set; }

    public virtual MstBusinessPartner Partner { get; set; } = null!;

    public virtual SecUser RequestedByNavigation { get; set; } = null!;

    public virtual TrxOrder? SalesOrder { get; set; }
}

