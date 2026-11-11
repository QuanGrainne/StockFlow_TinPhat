using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Application.Features.Roles.DTOs;

namespace StockFlow.Application.Features.Roles.Queries;

/// <summary>Ma trận Phân quyền chức năng của tất cả vai trò (vai trò chưa cấu hình trả chức năng mặc định).</summary>
public record GetFeatureMatrixQuery : IRequest<Result<List<RoleFeaturesDto>>>;

public class GetFeatureMatrixQueryHandler : IRequestHandler<GetFeatureMatrixQuery, Result<List<RoleFeaturesDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetFeatureMatrixQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<RoleFeaturesDto>>> Handle(GetFeatureMatrixQuery request, CancellationToken cancellationToken)
    {
        var roles = await _context.SecRoles
            .AsNoTracking()
            .Select(r => new
            {
                r.RoleName,
                Codes = r.Permissions
                    .Where(p => p.PermissionCode != null && p.PermissionCode.StartsWith(FeatureConstants.Prefix))
                    .Select(p => p.PermissionCode!)
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        var result = roles
            .Where(r => !string.IsNullOrEmpty(r.RoleName))
            .Select(r =>
            {
                var roleCode = PermissionConstants.ToRoleCode(r.RoleName!);
                var configured = r.Codes.Any(c => c.Equals(FeatureConstants.ConfiguredMarker, StringComparison.OrdinalIgnoreCase));
                var features = configured
                    ? FeatureConstants.Features.Where(f => r.Codes.Contains(f.Code, StringComparer.OrdinalIgnoreCase)).Select(f => f.Id).ToList()
                    : FeatureConstants.GetDefaultFeatureIds(roleCode);
                if (roleCode == "ROLE_ADMIN")
                    features = features.Union(FeatureConstants.AdminLockedFeatureIds).ToList();
                return new RoleFeaturesDto(roleCode, r.RoleName!, features, configured);
            })
            .GroupBy(r => r.RoleCode)
            .Select(g => g.First())
            .ToList();

        return Result.Success(result);
    }
}
