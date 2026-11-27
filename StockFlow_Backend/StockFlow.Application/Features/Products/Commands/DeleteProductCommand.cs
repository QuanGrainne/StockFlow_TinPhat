using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Products.Commands;

public record DeleteProductCommand(int ProductId) : IRequest<Result<bool>>;

public class DeleteProductCommandHandler : IRequestHandler<DeleteProductCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public DeleteProductCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(DeleteProductCommand command, CancellationToken cancellationToken)
    {
        var product = await _context.MstProducts
            .Include(p => p.TrxInventoryBalances)
            .FirstOrDefaultAsync(p => p.ProductId == command.ProductId, cancellationToken);

        if (product == null)
        {
            return Result.Failure<bool>("Không tìm thấy thông tin hàng hóa.");
        }

        // 1. Kiểm tra nếu sản phẩm ĐÃ CÓ ĐƠN ĐẶT HÀNG
        var hasOrders = await _context.DtlOrderItems.AnyAsync(o => o.ProductId == command.ProductId, cancellationToken);
        if (hasOrders)
        {
            return Result.Failure<bool>("Sản phẩm này đã phát sinh đơn đặt hàng trong hệ thống. Để bảo toàn lịch sử dữ liệu và chứng từ, không thể xóa vĩnh viễn! Bạn có thể chuyển trạng thái sang 'Ngừng kinh doanh' để ẩn sản phẩm.");
        }

        // 2. Kiểm tra nếu sản phẩm ĐÃ PHÁT SINH GIAO DỊCH THẺ KHO / CHỨNG TỪ NHẬP XUẤT
        var hasTransactions = await _context.TrxInventoryTransactions.AnyAsync(t => t.ProductId == command.ProductId, cancellationToken);
        var hasReceipts = await _context.DtlGoodsReceiptItems.AnyAsync(r => r.ProductId == command.ProductId, cancellationToken);
        if (hasTransactions || hasReceipts)
        {
            return Result.Failure<bool>("Sản phẩm này đã phát sinh giao dịch xuất/nhập kho (thẻ kho). Không thể xóa vĩnh viễn để bảo đảm tính toàn vẹn của sổ sách kho!");
        }

        // 3. Chưa có đơn, chưa có thẻ kho, chưa có phiếu nhập → xóa được kể cả còn tồn (26/11/2026, nhóm chốt).
        //    Tồn lúc này chỉ là tồn ban đầu (tạo hàng / import), không nằm trong sổ sách nào; frontend đã hỏi xác nhận.
        //    Trước đây chặn "còn tồn", nhưng muốn về 0 phải cân chỉnh tồn → sinh thẻ kho → không bao giờ xóa được nữa.
        var balances = await _context.TrxInventoryBalances
            .Where(b => b.ProductId == command.ProductId)
            .ToListAsync(cancellationToken);
        if (balances.Count > 0)
        {
            _context.TrxInventoryBalances.RemoveRange(balances);
        }

        var priceBookItems = await _context.DtlPriceBookItems
            .Where(pb => pb.ProductId == command.ProductId)
            .ToListAsync(cancellationToken);
        if (priceBookItems.Count > 0)
        {
            _context.DtlPriceBookItems.RemoveRange(priceBookItems);
        }

        try
        {
            _context.MstProducts.Remove(product);
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success(true);
        }
        catch (Exception ex)
        {
            return Result.Failure<bool>($"Lỗi ràng buộc dữ liệu khi xóa sản phẩm: {ex.Message}");
        }
    }
}
