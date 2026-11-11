using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Suppliers.Commands;

/// <summary>
/// Xóa Nhà cung cấp hoặc chuyển sang Ngừng hoạt động nếu đã phát sinh chứng từ / công nợ.
/// </summary>
public record DeleteSupplierCommand(int PartnerId) : IRequest<Result<bool>>;

public class DeleteSupplierCommandHandler : IRequestHandler<DeleteSupplierCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public DeleteSupplierCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(DeleteSupplierCommand command, CancellationToken cancellationToken)
    {
        var partner = await _context.MstBusinessPartners
            .Include(p => p.TrxGoodsReceipts)
            .FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId, cancellationToken);

        if (partner == null)
        {
            return Result.Failure<bool>("Không tìm thấy thông tin nhà cung cấp.");
        }

        // Nếu NCC đã có phiếu nhập kho hoặc còn dư nợ, chuyển sang vô hiệu hóa để bảo vệ dữ liệu kế toán
        var hasReceipts = partner.TrxGoodsReceipts.Any();
        var hasPayableDebt = (partner.CurrentPayable ?? 0) > 0;

        if (hasReceipts || hasPayableDebt)
        {
            partner.IsActive = false;
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success(true);
        }

        try
        {
            _context.MstBusinessPartners.Remove(partner);
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success(true);
        }
        catch
        {
            // Fallback: Chuyển sang ngừng giao dịch nếu vướng ràng buộc khóa ngoại khác
            partner.IsActive = false;
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success(true);
        }
    }
}
