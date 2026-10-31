using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;

namespace StockFlow.Application.Features.Customers.Commands;

public record ToggleCustomerStatusCommand(int PartnerId) : IRequest<Result<bool>>;
public record BatchCustomerStatusCommand(BatchCustomerStatusRequest Request) : IRequest<Result<bool>>;
public record DeleteCustomerCommand(int PartnerId) : IRequest<Result<bool>>;

public class CustomerStatusCommandsHandler :
    IRequestHandler<ToggleCustomerStatusCommand, Result<bool>>,
    IRequestHandler<BatchCustomerStatusCommand, Result<bool>>,
    IRequestHandler<DeleteCustomerCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public CustomerStatusCommandsHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(ToggleCustomerStatusCommand command, CancellationToken cancellationToken)
    {
        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId &&
                                      p.PartnerType != null &&
                                      (p.PartnerType.ToUpper() == "CUSTOMER" || p.PartnerType.ToUpper() == "BOTH"),
                                 cancellationToken);

        if (partner == null)
        {
            return Result<bool>.Failure($"Không tìm thấy khách hàng #{command.PartnerId}");
        }

        partner.IsActive = partner.IsActive == false;
        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(partner.IsActive ?? true);
    }

    public async Task<Result<bool>> Handle(BatchCustomerStatusCommand command, CancellationToken cancellationToken)
    {
        if (command.Request.PartnerIds == null || command.Request.PartnerIds.Count == 0)
        {
            return Result<bool>.Failure("Danh sách mã khách hàng rỗng.");
        }

        var isActive = !string.Equals(command.Request.Status, "INACTIVE", StringComparison.OrdinalIgnoreCase);

        var partners = await _context.MstBusinessPartners
            .Where(p => command.Request.PartnerIds.Contains(p.PartnerId) &&
                        p.PartnerType != null &&
                        (p.PartnerType.ToUpper() == "CUSTOMER" || p.PartnerType.ToUpper() == "BOTH"))
            .ToListAsync(cancellationToken);

        foreach (var p in partners)
        {
            p.IsActive = isActive;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> Handle(DeleteCustomerCommand command, CancellationToken cancellationToken)
    {
        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId &&
                                      p.PartnerType != null &&
                                      (p.PartnerType.ToUpper() == "CUSTOMER" || p.PartnerType.ToUpper() == "BOTH"),
                                 cancellationToken);

        if (partner == null)
        {
            return Result<bool>.Failure($"Không tìm thấy khách hàng #{command.PartnerId}");
        }

        // Kiểm tra xem khách hàng có đơn hàng liên quan không
        var hasOrders = await _context.TrxOrders
            .AnyAsync(o => o.PartnerId == partner.PartnerId, cancellationToken);

        if (hasOrders || (partner.CurrentDebt ?? 0) > 0)
        {
            // Soft delete nếu có dữ liệu liên quan
            partner.IsActive = false;
        }
        else
        {
            _context.MstBusinessPartners.Remove(partner);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }
}

