using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.Commands;

namespace StockFlow.Application.Features.Customers.Queries;

/// <summary>
/// Phiếu điều chỉnh công nợ (popup khi bấm mã DC... ở sổ công nợ khách).
/// Amount: chênh lệch ghi vào sổ (nợ sau − nợ trước); DebtAfter: "Giá trị nợ điều chỉnh" = nợ cần thu ngay sau phiếu này.
/// </summary>
public record CustomerDebtAdjustmentDto(
    string Code,
    DateTime? AdjustDate,
    decimal Amount,
    decimal DebtAfter,
    string? Description,
    string? CreatedByName);

public record GetCustomerDebtAdjustmentQuery(int PartnerId, string Code) : IRequest<Result<CustomerDebtAdjustmentDto>>;

public class GetCustomerDebtAdjustmentQueryHandler : IRequestHandler<GetCustomerDebtAdjustmentQuery, Result<CustomerDebtAdjustmentDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ISender _sender;

    public GetCustomerDebtAdjustmentQueryHandler(IStockFlowDbContext context, ISender sender)
    {
        _context = context;
        _sender = sender;
    }

    public async Task<Result<CustomerDebtAdjustmentDto>> Handle(GetCustomerDebtAdjustmentQuery request, CancellationToken ct)
    {
        var code = (request.Code ?? "").Trim().ToUpper();
        var tx = await _context.TrxFinancialTransactions.AsNoTracking()
            .Include(t => t.CreatedByNavigation)
            .FirstOrDefaultAsync(t => t.PartnerId == request.PartnerId && t.TxType == AdjustCustomerDebtCommandHandler.TxType
                                      && t.TxCode != null && t.TxCode.ToUpper() == code && t.Status != "CANCELLED", ct);
        if (tx == null) return Result.Failure<CustomerDebtAdjustmentDto>("Không tìm thấy phiếu điều chỉnh.");

        var debtAfter = await CustomerDebtAdjustmentLedger.DebtAfterAsync(_sender, request.PartnerId, tx.TxCode!, ct);
        return Result.Success(new CustomerDebtAdjustmentDto(
            tx.TxCode!, tx.TransactionDate, tx.Amount ?? 0, debtAfter ?? (tx.Amount ?? 0), tx.Description,
            tx.CreatedByNavigation?.FullName ?? tx.CreatedByNavigation?.Username));
    }
}

/// <summary>Đọc dư nợ ngay sau 1 phiếu điều chỉnh từ sổ công nợ của khách (cùng cách tính với màn Khách hàng)</summary>
public static class CustomerDebtAdjustmentLedger
{
    public static async Task<decimal?> DebtAfterAsync(ISender sender, int partnerId, string code, CancellationToken ct)
    {
        var detail = await sender.Send(new GetCustomerByIdQuery(partnerId), ct);
        if (!detail.IsSuccess || detail.Value?.DebtLedger == null) return null;
        var row = detail.Value.DebtLedger.FirstOrDefault(l => l.Type == "ADJUST" && string.Equals(l.Code, code, StringComparison.OrdinalIgnoreCase));
        return row?.BalanceAfter;
    }
}
