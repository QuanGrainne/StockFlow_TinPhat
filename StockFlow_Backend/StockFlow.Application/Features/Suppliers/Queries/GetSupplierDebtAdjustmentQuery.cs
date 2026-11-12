using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Suppliers.Commands;

namespace StockFlow.Application.Features.Suppliers.Queries;

/// <summary>
/// Phiếu điều chỉnh công nợ NCC (popup khi bấm mã DC... ở sổ "Nợ cần trả nhà cung cấp").
/// Amount: chênh lệch ghi vào sổ (nợ sau − nợ trước); DebtAfter: "Giá trị nợ điều chỉnh" = nợ cần trả ngay sau phiếu này.
/// </summary>
public record SupplierDebtAdjustmentDto(
    string Code,
    DateTime? AdjustDate,
    decimal Amount,
    decimal DebtAfter,
    string? Description,
    string? CreatedByName);

public record GetSupplierDebtAdjustmentQuery(int PartnerId, string Code) : IRequest<Result<SupplierDebtAdjustmentDto>>;

public class GetSupplierDebtAdjustmentQueryHandler : IRequestHandler<GetSupplierDebtAdjustmentQuery, Result<SupplierDebtAdjustmentDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ISender _sender;

    public GetSupplierDebtAdjustmentQueryHandler(IStockFlowDbContext context, ISender sender)
    {
        _context = context;
        _sender = sender;
    }

    public async Task<Result<SupplierDebtAdjustmentDto>> Handle(GetSupplierDebtAdjustmentQuery request, CancellationToken ct)
    {
        var code = (request.Code ?? "").Trim().ToUpper();
        var tx = await _context.TrxFinancialTransactions.AsNoTracking()
            .Include(t => t.CreatedByNavigation)
            .FirstOrDefaultAsync(t => t.PartnerId == request.PartnerId && t.TxType == AdjustSupplierDebtCommandHandler.TxType
                                      && t.TxCode != null && t.TxCode.ToUpper() == code && t.Status != "CANCELLED", ct);
        if (tx == null) return Result.Failure<SupplierDebtAdjustmentDto>("Không tìm thấy phiếu điều chỉnh.");

        var debtAfter = await SupplierDebtAdjustmentLedger.DebtAfterAsync(_sender, request.PartnerId, tx.TxCode!, ct);
        return Result.Success(new SupplierDebtAdjustmentDto(
            tx.TxCode!, tx.TransactionDate, tx.Amount ?? 0, debtAfter ?? (tx.Amount ?? 0), tx.Description,
            tx.CreatedByNavigation?.FullName ?? tx.CreatedByNavigation?.Username));
    }
}

/// <summary>Đọc nợ cần trả ngay sau 1 phiếu điều chỉnh từ sổ công nợ NCC (cùng cách tính với màn Nhà cung cấp)</summary>
public static class SupplierDebtAdjustmentLedger
{
    public static async Task<decimal?> DebtAfterAsync(ISender sender, int partnerId, string code, CancellationToken ct)
    {
        var detail = await sender.Send(new GetSupplierByIdQuery(partnerId), ct);
        if (!detail.IsSuccess || detail.Value?.DebtLedger == null) return null;
        var row = detail.Value.DebtLedger.FirstOrDefault(l => l.Type == "ADJUST" && string.Equals(l.Code, code, StringComparison.OrdinalIgnoreCase));
        return row?.BalanceAfter;
    }
}
