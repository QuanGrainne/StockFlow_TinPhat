using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// UC-44 bước 5, UC-45, UC-60, UC-61: chi tiết lệnh sản xuất — nhu cầu / đã xuất / còn thiếu từng NVL,
/// tồn khả dụng tại kho NVL đang chọn (A45.1), các phiếu xuất NVL và phiếu nhập thành phẩm.
/// </summary>
public record GetProductionOrderByIdQuery(int ProductionOrderId, int? WarehouseId) : IRequest<Result<ProductionOrderDetailDto>>;

public class GetProductionOrderByIdQueryHandler : IRequestHandler<GetProductionOrderByIdQuery, Result<ProductionOrderDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetProductionOrderByIdQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<ProductionOrderDetailDto>> Handle(GetProductionOrderByIdQuery query, CancellationToken ct)
    {
        var detail = await ProductionReader.OrderDetailAsync(_context, _currentUser, query.ProductionOrderId, query.WarehouseId, ct);
        return detail == null
            ? Result.Failure<ProductionOrderDetailDto>(ProductionMessages.OrderNotFound)
            : Result.Success(detail);
    }
}
