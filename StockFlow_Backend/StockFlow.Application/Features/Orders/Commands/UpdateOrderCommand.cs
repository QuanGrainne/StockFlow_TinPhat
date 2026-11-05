using System;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Orders.DTOs;
using StockFlow.Application.Features.Orders.Queries;

namespace StockFlow.Application.Features.Orders.Commands;

public record UpdateOrderCommand(string IdOrCode, UpdateOrderDto Dto) : IRequest<Result<OrderDetailDto>>;

public class UpdateOrderCommandHandler : IRequestHandler<UpdateOrderCommand, Result<OrderDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IMediator _mediator;

    public UpdateOrderCommandHandler(
        IStockFlowDbContext context,
        ICurrentUserService currentUserService,
        IMediator mediator)
    {
        _context = context;
        _currentUserService = currentUserService;
        _mediator = mediator;
    }

    public async Task<Result<OrderDetailDto>> Handle(UpdateOrderCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.IdOrCode))
        {
            return Result<OrderDetailDto>.Failure("Vui lòng cung cấp ID hoặc Mã đơn hàng để cập nhật.");
        }

        int? orderId = int.TryParse(request.IdOrCode, out var parsedId) ? parsedId : null;
        string cleanCode = request.IdOrCode.Trim().ToUpperInvariant();

        var order = await (orderId.HasValue
            ? _context.TrxOrders.FirstOrDefaultAsync(o => o.OrderId == orderId.Value, cancellationToken)
            : _context.TrxOrders.FirstOrDefaultAsync(o => o.OrderCode != null && o.OrderCode.ToUpper() == cleanCode, cancellationToken));

        if (order == null)
        {
            return Result<OrderDetailDto>.Failure($"Không tìm thấy đơn hàng #{request.IdOrCode}.");
        }

        // Cập nhật loại đơn hàng (INVOICE hoặc BOOKING)
        if (!string.IsNullOrWhiteSpace(request.Dto.OrderType))
        {
            var type = request.Dto.OrderType.Trim().ToUpperInvariant();
            if (type is "INVOICE" or "BOOKING")
            {
                order.OrderType = type;
            }
            else
            {
                return Result<OrderDetailDto>.Failure("Loại đơn hàng không hợp lệ. Chỉ chấp nhận 'INVOICE' (Hóa đơn) hoặc 'BOOKING' (Đặt hàng).");
            }
        }

        // Cập nhật người bán (nếu có truyền vào, lưu vào thẻ [Người bán: ...])
        string currentNotes = order.Notes ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(request.Dto.SalesRepName))
        {
            var sellerName = request.Dto.SalesRepName.Trim();
            if (Regex.IsMatch(currentNotes, @"\[Người bán:\s*[^\]]+\]", RegexOptions.IgnoreCase))
            {
                currentNotes = Regex.Replace(currentNotes, @"\[Người bán:\s*[^\]]+\]", $"[Người bán: {sellerName}]", RegexOptions.IgnoreCase);
            }
            else
            {
                currentNotes = (currentNotes + $" [Người bán: {sellerName}]").Trim();
            }
        }

        // Cập nhật ghi chú thuần túy (nếu có truyền vào)
        if (request.Dto.Notes != null)
        {
            // Trích xuất các tag hệ thống đang có: [Bảng giá: ...], [Người bán: ...]
            var bgMatch = Regex.Match(currentNotes, @"\[Bảng giá:\s*[^\]]+\]", RegexOptions.IgnoreCase);
            var nbMatch = Regex.Match(currentNotes, @"\[Người bán:\s*[^\]]+\]", RegexOptions.IgnoreCase);

            var cleanUserNotes = request.Dto.Notes.Trim();
            // Nếu người dùng không ghi lại các tag, giữ lại các tag cũ vào cuối ghi chú
            if (bgMatch.Success && !cleanUserNotes.Contains("[Bảng giá:", StringComparison.OrdinalIgnoreCase))
            {
                cleanUserNotes += $" {bgMatch.Value}";
            }
            if (nbMatch.Success && !cleanUserNotes.Contains("[Người bán:", StringComparison.OrdinalIgnoreCase))
            {
                cleanUserNotes += $" {nbMatch.Value}";
            }

            order.Notes = cleanUserNotes.Trim();
        }
        else if (!string.IsNullOrWhiteSpace(request.Dto.SalesRepName))
        {
            order.Notes = currentNotes;
        }

        // Cập nhật Audit Log
        order.UpdatedAt = VietnamTime.Now;
        if (_currentUserService.UserId.HasValue)
        {
            order.UpdatedBy = _currentUserService.UserId.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Tải lại chi tiết đơn hàng đầy đủ bằng Query
        return await _mediator.Send(new GetOrderDetailQuery(order.OrderId, null), cancellationToken);
    }
}

