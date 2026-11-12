using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Application.Features.Roles.DTOs;

namespace StockFlow.Application.Features.Roles.Queries;

/// <summary>Chức năng navbar người dùng đang đăng nhập được dùng (frontend ẩn menu / chặn trang theo danh sách này).</summary>
public record GetMyFeaturesQuery(int UserId) : IRequest<Result<List<string>>>;

public class GetMyFeaturesQueryHandler : IRequestHandler<GetMyFeaturesQuery, Result<List<string>>>
{
    private readonly IUserPermissionService _permissionService;

    public GetMyFeaturesQueryHandler(IUserPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    public async Task<Result<List<string>>> Handle(GetMyFeaturesQuery request, CancellationToken cancellationToken)
    {
        var codes = await _permissionService.GetFeatureCodesAsync(request.UserId, cancellationToken);
        var ids = FeatureConstants.Features.Where(f => codes.Contains(f.Code)).Select(f => f.Id).ToList();
        return Result.Success(ids);
    }
}
