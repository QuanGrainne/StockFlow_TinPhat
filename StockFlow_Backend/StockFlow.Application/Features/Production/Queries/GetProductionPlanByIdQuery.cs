using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// UC-PP-01 bước 3–5: chi tiết kế hoạch kèm số đã lập lệnh, còn lại, đã nhập kho từng dòng (BR-PP-10, BR-PP-11),
/// danh sách lệnh thuộc kế hoạch và các thao tác người dùng hiện tại được làm.
/// </summary>
public record GetProductionPlanByIdQuery(int ProductionPlanId) : IRequest<Result<ProductionPlanDetailDto>>;

public class GetProductionPlanByIdQueryHandler : IRequestHandler<GetProductionPlanByIdQuery, Result<ProductionPlanDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IUserPermissionService _permissions;

    public GetProductionPlanByIdQueryHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser, IUserPermissionService permissions)
    {
        _context = context;
        _currentUser = currentUser;
        _permissions = permissions;
    }

    public async Task<Result<ProductionPlanDetailDto>> Handle(GetProductionPlanByIdQuery query, CancellationToken ct)
    {
        if (_currentUser.UserId is not int userId)
            return Result.Failure<ProductionPlanDetailDto>("Không xác định được người dùng đăng nhập.");

        var detail = await ProductionPlanReader.DetailAsync(_context, _permissions, userId, query.ProductionPlanId, ct);
        return detail == null
            ? Result.Failure<ProductionPlanDetailDto>(ProductionPlanMessages.PlanNotFound)
            : Result.Success(detail);
    }
}
