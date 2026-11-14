using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Disposals.DTOs;
using StockFlow.Application.Features.Disposals.Helpers;

namespace StockFlow.Application.Features.Disposals.Queries;

/// <summary>
/// Danh sách nhân viên cho ô "Người xuất hủy": đang hoạt động và được phân quyền kho của phiếu.
/// Người gọi phải có quyền trên kho đó (không lộ nhân sự của kho khác).
/// </summary>
public record GetDisposalStaffOptionsQuery(int WarehouseId) : IRequest<Result<List<DisposalStaffOptionDto>>>;

public class GetDisposalStaffOptionsQueryHandler : IRequestHandler<GetDisposalStaffOptionsQuery, Result<List<DisposalStaffOptionDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetDisposalStaffOptionsQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<DisposalStaffOptionDto>>> Handle(GetDisposalStaffOptionsQuery query, CancellationToken ct)
    {
        if (query.WarehouseId <= 0) return Result.Failure<List<DisposalStaffOptionDto>>("Kho không hợp lệ.");
        if (!await _currentUser.HasWarehouseAccessAsync(query.WarehouseId, ct))
            return Result.Failure<List<DisposalStaffOptionDto>>("Bạn không có quyền trên kho này.");
        return Result.Success(await DisposalLogic.StaffOptionsAsync(_context, query.WarehouseId, ct));
    }
}
