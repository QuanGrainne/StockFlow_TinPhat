using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Customers.Commands;

/// <summary>Sửa phiếu thu: thời gian, phương thức thanh toán, ghi chú. Phiếu đã hủy không sửa được.</summary>
public record UpdateCustomerReceiptCommand(int PartnerId, string Code, UpdateCustomerReceiptRequest Request)
    : IRequest<Result<bool>>;

public class UpdateCustomerReceiptCommandHandler : IRequestHandler<UpdateCustomerReceiptCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateCustomerReceiptCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<bool>> Handle(UpdateCustomerReceiptCommand command, CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue)
            return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");

        var lines = await CustomerReceiptLookup.LoadAsync(_context, command.PartnerId, command.Code, cancellationToken);
        if (lines.Count == 0)
            return Result.Failure<bool>($"Không tìm thấy phiếu thu {command.Code}.");
        if (lines.All(t => t.Status == "CANCELLED"))
            return Result.Failure<bool>($"Phiếu thu {command.Code} đã hủy, không thể sửa.");

        var req = command.Request;
        if (req.TransactionDate.HasValue)
        {
            var date = VietnamTime.From(req.TransactionDate);
            if (date > VietnamTime.Now.AddMinutes(1))
                return Result.Failure<bool>("Thời gian phiếu thu không được ở tương lai.");
            foreach (var t in lines) t.TransactionDate = date;
        }

        var method = string.IsNullOrWhiteSpace(req.PaymentMethod) ? null : req.PaymentMethod.Trim().ToUpperInvariant();
        var notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
        foreach (var t in lines)
        {
            if (method != null) t.PaymentMethod = method;
            t.Description = notes;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}
