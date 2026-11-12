using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Suppliers.Commands;

/// <summary>
/// Bật / Tắt trạng thái hoạt động của Nhà cung cấp (ACTIVE <-> INACTIVE).
/// </summary>
public record ToggleSupplierStatusCommand(int PartnerId) : IRequest<Result<bool>>;

public class ToggleSupplierStatusCommandHandler : IRequestHandler<ToggleSupplierStatusCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public ToggleSupplierStatusCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(ToggleSupplierStatusCommand command, CancellationToken cancellationToken)
    {
        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId, cancellationToken);

        if (partner == null)
        {
            return Result.Failure<bool>("Không tìm thấy thông tin nhà cung cấp.");
        }

        partner.IsActive = partner.IsActive != true;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(partner.IsActive.Value);
    }
}
