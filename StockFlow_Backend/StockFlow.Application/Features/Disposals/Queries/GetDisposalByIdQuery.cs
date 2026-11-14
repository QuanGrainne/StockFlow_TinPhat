using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Disposals.DTOs;
using StockFlow.Application.Features.Disposals.Helpers;

namespace StockFlow.Application.Features.Disposals.Queries;

/// <summary>Chi tiết 1 phiếu xuất hủy (hàng hủy, SL, giá vốn, giá trị) — phải có quyền trên kho của phiếu.</summary>
public record GetDisposalByIdQuery(int DisposalId) : IRequest<Result<DisposalDetailDto>>;

public class GetDisposalByIdQueryHandler : IRequestHandler<GetDisposalByIdQuery, Result<DisposalDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetDisposalByIdQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<DisposalDetailDto>> Handle(GetDisposalByIdQuery query, CancellationToken ct)
    {
        var disposal = await DisposalLogic.LoadAsync(_context, query.DisposalId, ct);
        if (disposal == null) return Result.Failure<DisposalDetailDto>("Không tìm thấy phiếu xuất hủy.");
        if (!await _currentUser.HasWarehouseAccessAsync(disposal.WarehouseId, ct))
            return Result.Failure<DisposalDetailDto>("Bạn không có quyền xem phiếu xuất hủy của kho này.");
        return Result.Success(await DisposalLogic.ToDetailAsync(_context, disposal, ct));
    }
}
