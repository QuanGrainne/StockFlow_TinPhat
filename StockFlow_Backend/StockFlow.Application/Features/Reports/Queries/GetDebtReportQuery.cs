using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.Helpers;
using StockFlow.Application.Features.Reports.DTOs;
using StockFlow.Application.Features.Reports.Helpers;
using StockFlow.Application.Features.Suppliers.Helpers;

namespace StockFlow.Application.Features.Reports.Queries;

/// <summary>
/// UC-86 – Báo cáo công nợ phải thu khách hàng / phải trả nhà cung cấp theo kỳ. Không lọc theo kho.
/// Phát sinh lấy từ đúng sổ nợ đang hiện ở màn Khách hàng / Nhà cung cấp (CustomerDebtLedger, SupplierDebtLedger):
/// - Nợ cuối kỳ = dư nợ hiện tại (current_debt / current_payable) − tổng các dòng sổ nợ sau kỳ.
/// - Phát sinh tăng / giảm = tổng các dòng sổ nợ dương / âm trong kỳ.
/// - Nợ đầu kỳ = nợ cuối kỳ − tăng + giảm.
/// Số ngày nợ (chỉ khách đang còn nợ): CustomerDebtWarning.GetDebtSinceAsync + DebtDays theo thiết lập cảnh báo công nợ,
/// tính đến hôm nay. Phải trả chưa có hàm số ngày nợ nên để trống.
/// Chỉ hiện đối tác có nợ đầu / cuối kỳ hoặc có phát sinh trong kỳ.
/// </summary>
public record GetDebtReportQuery(
    DateOnly From, DateOnly To, string Type, string? Search = null, int Page = 1, int PageSize = 50)
    : IRequest<Result<DebtReportDto>>, IReportPeriodQuery
{
    /// <summary>Công nợ không lọc theo kho.</summary>
    int? IReportPeriodQuery.WarehouseId => null;
}

public class GetDebtReportQueryValidator : AbstractValidator<GetDebtReportQuery>
{
    public GetDebtReportQueryValidator()
    {
        ReportValidation.AddPeriodRules(this);
        ReportValidation.AddPagingRules(this, x => x.Page, x => x.PageSize);
        RuleFor(x => x.Type)
            .Must(t => DebtReportType.All.Contains((t ?? "").Trim().ToUpperInvariant()))
            .WithMessage("Loại công nợ phải là Phải thu hoặc Phải trả.");
        RuleFor(x => x.Search).MaximumLength(100).WithMessage("Từ khóa tìm kiếm tối đa 100 ký tự.");
    }
}

public class GetDebtReportQueryHandler : IRequestHandler<GetDebtReportQuery, Result<DebtReportDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetDebtReportQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<DebtReportDto>> Handle(GetDebtReportQuery request, CancellationToken ct)
    {
        var type = request.Type.Trim().ToUpperInvariant();
        var receivable = type == DebtReportType.Receivable;
        var period = ReportPeriod.Of(request.From, request.To);

        // ── Đối tác (khách: CUSTOMER / BOTH; NCC: SUPPLIER / BOTH) ──
        var partnerQuery = _context.MstBusinessPartners.AsNoTracking()
            .Where(p => p.PartnerType != null && (receivable
                ? p.PartnerType.ToUpper() == "CUSTOMER" || p.PartnerType.ToUpper() == "BOTH"
                : p.PartnerType.ToUpper() == "SUPPLIER" || p.PartnerType.ToUpper() == "BOTH"));
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var keyword = request.Search.Trim().ToLower();
            partnerQuery = partnerQuery.Where(p =>
                (p.PartnerCode != null && p.PartnerCode.ToLower().Contains(keyword)) ||
                (p.PartnerName != null && p.PartnerName.ToLower().Contains(keyword)) ||
                (p.Phone != null && p.Phone.Contains(keyword)));
        }
        var partners = await partnerQuery
            .Select(p => new
            {
                p.PartnerId,
                p.PartnerCode,
                p.PartnerName,
                p.Phone,
                p.CreditLimit,
                Current = receivable ? p.CurrentDebt ?? 0 : p.CurrentPayable ?? 0,
            })
            .ToListAsync(ct);

        var dto = new DebtReportDto { Type = type, Page = request.Page, PageSize = request.PageSize };
        if (partners.Count == 0)
        {
            dto.Totals = new DebtReportRowDto { Code = "Tổng cộng" };
            if (receivable) dto.Aging = EmptyAging();
            return Result.Success(dto);
        }

        var ids = partners.Select(p => p.PartnerId).ToList();
        var movements = receivable
            ? await CustomerDebtLedger.LoadMovementsAsync(_context, ids, ct)
            : await SupplierDebtLedger.LoadMovementsAsync(_context, ids, ct);
        var byPartner = movements.ToLookup(m => m.PartnerId);

        // ── Số ngày nợ (phải thu): dùng lại hàm của cảnh báo công nợ ──
        Dictionary<int, DateTime> since = new();
        if (receivable)
        {
            var setting = await CustomerDebtWarning.LoadSettingAsync(_context, ct);
            dto.DebtDaysFrom = setting.DebtDaysFrom;
            var debtorIds = partners.Where(p => p.Current > 0).Select(p => p.PartnerId).ToList();
            if (debtorIds.Count > 0)
                since = await CustomerDebtWarning.GetDebtSinceAsync(_context, debtorIds, CustomerDebtWarning.IsFromFirstDebt(setting), ct);
        }

        var rows = new List<DebtReportRowDto>();
        foreach (var p in partners)
        {
            decimal after = 0, increase = 0, decrease = 0;
            foreach (var m in byPartner[p.PartnerId])
            {
                if (m.Date >= period.EndExclusive) after += m.Amount;
                else if (m.Date >= period.Start)
                {
                    if (m.Amount > 0) increase += m.Amount;
                    else decrease -= m.Amount;
                }
            }
            var closing = p.Current - after;
            var opening = closing - increase + decrease;
            if (opening == 0 && closing == 0 && increase == 0 && decrease == 0) continue;

            var row = new DebtReportRowDto
            {
                PartnerId = p.PartnerId,
                Code = p.PartnerCode ?? "",
                Name = p.PartnerName ?? "",
                Phone = p.Phone,
                Opening = opening,
                Increase = increase,
                Decrease = decrease,
                Closing = closing,
                CreditLimit = receivable ? p.CreditLimit ?? 0 : null,
            };
            if (receivable && p.Current > 0 && since.TryGetValue(p.PartnerId, out var start))
            {
                row.DebtDays = CustomerDebtWarning.DebtDays(start);
                row.AgingBucket = DebtAgingBucket.Of(row.DebtDays.Value);
            }
            rows.Add(row);
        }

        rows = rows.OrderByDescending(r => r.Closing).ThenBy(r => r.Code).ToList();
        dto.TotalCount = rows.Count;
        dto.Items = rows.Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).ToList();
        dto.Totals = new DebtReportRowDto
        {
            Code = "Tổng cộng",
            Opening = rows.Sum(r => r.Opening),
            Increase = rows.Sum(r => r.Increase),
            Decrease = rows.Sum(r => r.Decrease),
            Closing = rows.Sum(r => r.Closing),
        };
        if (receivable)
        {
            dto.Aging = DebtAgingBucket.All.Select(b => new DebtAgingSummaryDto
            {
                Bucket = b,
                Count = rows.Count(r => r.AgingBucket == b),
                Amount = rows.Where(r => r.AgingBucket == b).Sum(r => r.Closing),
            }).ToList();
        }
        return Result.Success(dto);
    }

    private static List<DebtAgingSummaryDto> EmptyAging() =>
        DebtAgingBucket.All.Select(b => new DebtAgingSummaryDto { Bucket = b }).ToList();
}
