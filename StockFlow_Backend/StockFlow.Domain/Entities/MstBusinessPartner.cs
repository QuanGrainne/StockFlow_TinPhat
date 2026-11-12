using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class MstBusinessPartner
{
    public int PartnerId { get; set; }

    public string? PartnerCode { get; set; }

    public string? PartnerName { get; set; }

    public string? PartnerType { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public string? Address { get; set; }

    public decimal? CreditLimit { get; set; }

    public decimal? CurrentDebt { get; set; }

    public decimal? CurrentPayable { get; set; }

    public bool? IsActive { get; set; }

    /// <summary>Thời điểm tạo đối tác (giờ Việt Nam). Null với dữ liệu tạo trước khi có cột này.</summary>
    public DateTime? CreatedAt { get; set; }

    /// <summary>UserId tài khoản đã tạo đối tác (sec_users.user_id).</summary>
    public int? CreatedBy { get; set; }

    public virtual ICollection<TrxCreditLimitRequest> TrxCreditLimitRequests { get; set; } = new List<TrxCreditLimitRequest>();

    public virtual ICollection<TrxFinancialTransaction> TrxFinancialTransactions { get; set; } = new List<TrxFinancialTransaction>();

    public virtual ICollection<TrxGoodsReceipt> TrxGoodsReceipts { get; set; } = new List<TrxGoodsReceipt>();

    public virtual ICollection<TrxOrder> TrxOrders { get; set; } = new List<TrxOrder>();

    public virtual ICollection<TrxReturnRequest> TrxReturnRequests { get; set; } = new List<TrxReturnRequest>();
}

