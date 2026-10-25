using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.PriceBooks.Commands;

public record DeletePriceBookCommand(int Id) : IRequest<Result>;

public class DeletePriceBookCommandHandler : IRequestHandler<DeletePriceBookCommand, Result>
{
    private readonly IStockFlowDbContext _context;

    public DeletePriceBookCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(DeletePriceBookCommand request, CancellationToken cancellationToken)
    {
        var pb = await _context.MstPriceBooks
            .FirstOrDefaultAsync(p => p.PriceBookId == request.Id, cancellationToken);

        if (pb == null)
        {
            return Result.Failure("Không tìm thấy bảng giá cần xóa.");
        }

        if (pb.IsDefault)
        {
            return Result.Failure("Không thể xóa 'Bảng giá chung' mặc định của hệ thống.");
        }

        _context.MstPriceBooks.Remove(pb);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
