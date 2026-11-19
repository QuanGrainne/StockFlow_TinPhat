using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Payments.DTOs;
using StockFlow.Application.Features.Payments.Helpers;

namespace StockFlow.Application.Features.Payments.Queries;

/// <summary>
/// Trạng thái QR thanh toán (màn Bán hàng hỏi định kỳ). Link còn chờ thì backend tự hỏi payOS
/// — trạng thái chỉ đổi theo payOS / webhook đã kiểm chữ ký, không theo dữ liệu client gửi lên.
/// </summary>
public record GetPayosPaymentQuery(long OrderCode) : IRequest<Result<PayosPaymentDto>>;

public class GetPayosPaymentQueryHandler : IRequestHandler<GetPayosPaymentQuery, Result<PayosPaymentDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IPayosGateway _payos;

    public GetPayosPaymentQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser, IPayosGateway payos)
    {
        _context = context;
        _currentUser = currentUser;
        _payos = payos;
    }

    public async Task<Result<PayosPaymentDto>> Handle(GetPayosPaymentQuery request, CancellationToken ct)
    {
        var payment = await _context.TrxPayosPayments.FirstOrDefaultAsync(p => p.OrderCode == request.OrderCode, ct);
        if (payment == null) return Result.Failure<PayosPaymentDto>("Không tìm thấy giao dịch thanh toán.");
        if (payment.CreatedBy != _currentUser.UserId
            && !(payment.WarehouseId is int wid && await _currentUser.HasWarehouseAccessAsync(wid, ct)))
            return Result.Failure<PayosPaymentDto>("Bạn không có quyền với giao dịch thanh toán này.");

        if (await PayosPaymentSync.SyncAsync(_payos, payment, ct))
            await _context.SaveChangesAsync(ct);

        return Result.Success(PayosPaymentSync.ToDto(payment, _payos));
    }
}
