using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Purchases.DTOs;

namespace StockFlow.Application.Features.Purchases.Commands;

public record CancelPurchaseCommand(int Id, CancelPurchaseRequest? Request = null) : IRequest<Result<bool>>;

public class CancelPurchaseCommandHandler : IRequestHandler<CancelPurchaseCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public CancelPurchaseCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(CancelPurchaseCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var receipt = await _context.TrxGoodsReceipts
                .FirstOrDefaultAsync(r => r.GrId == command.Id, cancellationToken);

            if (receipt == null)
            {
                return Result.Failure<bool>($"Không tìm thấy phiếu nhập hàng #{command.Id}.");
            }

            if (string.Equals(receipt.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
            {
                return Result.Failure<bool>("Không thể hủy phiếu nhập đã hoàn thành nhập kho để tránh sai lệch số liệu tồn kho & kế toán. Vui lòng lập phiếu trả hàng nhập nếu cần hoàn trả.");
            }

            if (string.Equals(receipt.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
            {
                return Result.Failure<bool>("Phiếu nhập hàng này đã ở trạng thái Đã hủy trước đó.");
            }

            receipt.Status = "CANCELLED";

            if (!string.IsNullOrWhiteSpace(command.Request?.Reason))
            {
                var reason = command.Request.Reason.Trim();
                receipt.Notes = string.IsNullOrEmpty(receipt.Notes)
                    ? $"[Lý do hủy]: {reason}"
                    : $"{receipt.Notes} | [Lý do hủy]: {reason}";
            }

            await _context.SaveChangesAsync(cancellationToken);

            return Result.Success(true);
        }
        catch (Exception ex)
        {
            return Result.Failure<bool>($"Lỗi khi hủy phiếu nhập: {ex.Message}");
        }
    }
}
