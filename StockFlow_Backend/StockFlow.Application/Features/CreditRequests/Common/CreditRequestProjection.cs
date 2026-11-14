using System.Linq.Expressions;
using StockFlow.Application.Features.CreditRequests.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.CreditRequests.Common;

/// <summary>Phép chiếu dùng chung cho danh sách / chi tiết yêu cầu (EF dịch được sang SQL).</summary>
public static class CreditRequestProjection
{
    public static readonly Expression<Func<TrxCreditLimitRequest, CreditRequestDto>> ToDto = r => new CreditRequestDto
    {
        RequestId = r.RequestId,
        RequestCode = r.RequestCode,
        PartnerId = r.PartnerId,
        PartnerCode = r.Partner.PartnerCode,
        PartnerName = r.Partner.PartnerName,
        CurrentDebt = r.Partner.CurrentDebt ?? 0,
        CurrentCreditLimit = r.Partner.CreditLimit ?? 0,
        LimitAtRequest = r.CurrentLimit,
        RequestedLimit = r.RequestedLimit,
        Reason = r.Reason,
        Status = r.Status,
        ApprovalType = r.ApprovalType,
        RequestedBy = r.RequestedBy,
        RequestedByName = r.RequestedByNavigation.FullName ?? r.RequestedByNavigation.Username,
        RequestDate = r.RequestDate,
        ApprovedBy = r.ApprovedBy,
        ApprovedByName = r.ApprovedByNavigation != null
            ? (r.ApprovedByNavigation.FullName ?? r.ApprovedByNavigation.Username)
            : null,
        ApprovalDate = r.ApprovalDate,
        ApprovalNotes = r.ApprovalNotes,
        SalesOrderId = r.SalesOrderId,
        SalesOrderCode = r.SalesOrder != null ? r.SalesOrder.OrderCode : null,
        IsUsed = r.SalesOrderId != null,
    };
}
