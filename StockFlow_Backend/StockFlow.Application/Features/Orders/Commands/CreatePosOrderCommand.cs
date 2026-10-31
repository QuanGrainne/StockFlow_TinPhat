using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Orders.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Orders.Commands;

public record CreatePosOrderCommand(CreatePosOrderRequest Request) : IRequest<Result<PosOrderResultDto>>;

public class CreatePosOrderCommandValidator : AbstractValidator<CreatePosOrderCommand>
{
    public CreatePosOrderCommandValidator()
    {
        RuleFor(x => x.Request.PartnerId)
            .GreaterThan(0).WithMessage("Vui lòng chọn khách hàng hợp lệ.");

        RuleFor(x => x.Request.Items)
            .NotEmpty().WithMessage("Đơn hàng phải có ít nhất 1 sản phẩm.");

        RuleForEach(x => x.Request.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage("Mã sản phẩm không hợp lệ.");
            item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Số lượng phải lớn hơn 0.");
            item.RuleFor(i => i.UnitPrice).GreaterThanOrEqualTo(0).WithMessage("Đơn giá không được âm.");
        });

        RuleFor(x => x.Request.TotalAmount)
            .GreaterThanOrEqualTo(0).WithMessage("Tổng tiền hàng không được âm.");

        RuleFor(x => x.Request.PaidAmount)
            .GreaterThanOrEqualTo(0).WithMessage("Số tiền thanh toán không được âm.");
    }
}

public class CreatePosOrderCommandHandler : IRequestHandler<CreatePosOrderCommand, Result<PosOrderResultDto>>
{
    private readonly IStockFlowDbContext _context;

    public CreatePosOrderCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<PosOrderResultDto>> Handle(CreatePosOrderCommand request, CancellationToken cancellationToken)
    {
        var req = request.Request;

        // 1. Kiểm tra khách hàng
        var customer = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == req.PartnerId, cancellationToken);

        if (customer == null)
        {
            return Result<PosOrderResultDto>.Failure("Không tìm thấy thông tin khách hàng trong hệ thống.");
        }

        decimal outstanding = Math.Max(0, req.TotalAmount - req.PaidAmount);

        // 2. Kiểm tra hạn mức tín dụng nếu có công nợ
        if (outstanding > 0)
        {
            decimal currentDebt = customer.CurrentDebt ?? 0;
            decimal creditLimit = customer.CreditLimit ?? 0;

            if (creditLimit > 0 && (currentDebt + outstanding) > creditLimit)
            {
                decimal excess = (currentDebt + outstanding) - creditLimit;
                return Result<PosOrderResultDto>.Failure(
                    $"Khách hàng {customer.PartnerName} vượt hạn mức tín dụng cho phép {excess:N0} đ. Hạn mức: {creditLimit:N0} đ, Dư nợ hiện tại: {currentDebt:N0} đ, Công nợ phát sinh: {outstanding:N0} đ.");
            }
        }

        // 3. Kiểm tra và sinh mã hóa đơn nguyên tử
        long seqVal = await _context.GetNextSequenceValueAsync("stockflow.seq_pos_order_code", cancellationToken);
        string orderCode = $"HD{seqVal:D5}";

        // 4. Tạo đối tượng TrxOrder
        string paymentStatus = req.PaidAmount >= req.TotalAmount 
            ? "PAID" 
            : (req.PaidAmount > 0 ? "PARTIAL" : "DEBT");

        var order = new TrxOrder
        {
            OrderCode = orderCode,
            PartnerId = req.PartnerId,
            Status = req.Status.ToUpper() == "DRAFT" ? "DRAFT" : "COMPLETED",
            TotalAmount = req.TotalAmount,
            PaidAmount = req.PaidAmount,
            OutstandingAmount = outstanding,
            PaymentStatus = paymentStatus,
            CreatedBy = 1, // Default Admin/Cashier
            OrderDate = DateTime.UtcNow,
            Notes = req.Notes
        };

        _context.TrxOrders.Add(order);
        await _context.SaveChangesAsync(cancellationToken);

        // 5. Thêm chi tiết đơn hàng DtlOrderItems
        foreach (var item in req.Items)
        {
            var orderItem = new DtlOrderItem
            {
                OrderId = order.OrderId,
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                UnitId = item.UnitId > 0 ? item.UnitId : 8,
                UnitPrice = item.UnitPrice
            };
            _context.DtlOrderItems.Add(orderItem);

            // 6. Trừ tồn kho nếu xuất kho ngay
            if (req.IssueStockNow && order.Status == "COMPLETED")
            {
                var balance = await _context.TrxInventoryBalances
                    .FirstOrDefaultAsync(b => b.ProductId == item.ProductId && b.WarehouseId == req.WarehouseId, cancellationToken);

                if (balance != null)
                {
                    balance.Quantity = (balance.Quantity ?? 0) - item.Quantity;
                    balance.LastUpdated = DateTime.UtcNow;
                }
                else
                {
                    // Tạo bản ghi tồn kho với số lượng âm nếu chính sách cho phép xuất trước
                    _context.TrxInventoryBalances.Add(new TrxInventoryBalance
                    {
                        WarehouseId = req.WarehouseId,
                        ProductId = item.ProductId,
                        Quantity = -item.Quantity,
                        UnitCost = item.UnitPrice * 0.8m,
                        LastUpdated = DateTime.UtcNow
                    });
                }

                // Ghi nhận lịch sử xuất kho
                _context.TrxInventoryTransactions.Add(new TrxInventoryTransaction
                {
                    WarehouseId = req.WarehouseId,
                    ProductId = item.ProductId,
                    TransactionType = "ISSUE_SALE",
                    Quantity = -item.Quantity,
                    ReferenceType = "SALES_ORDER",
                    ReferenceId = order.OrderId,
                    TransactionDate = DateTime.UtcNow,
                    CreatedBy = 1
                });
            }
        }

        // 7. Cập nhật công nợ khách hàng nếu có số tiền chưa thanh toán
        if (outstanding > 0 && order.Status == "COMPLETED")
        {
            customer.CurrentDebt = (customer.CurrentDebt ?? 0) + outstanding;
        }

        // 8. Ghi nhận giao dịch tài chính nếu khách có thanh toán tiền
        if (req.PaidAmount > 0)
        {
            _context.TrxFinancialTransactions.Add(new TrxFinancialTransaction
            {
                PartnerId = customer.PartnerId,
                TxType = "RECEIPT",
                Amount = req.PaidAmount,
                PaymentMethod = req.PaymentMethod,
                ReferenceType = "SALES_ORDER",
                ReferenceId = order.OrderId,
                TransactionDate = DateTime.UtcNow,
                CreatedBy = 1,
                Status = "COMPLETED",
                Description = $"Thu tiền bán hàng hóa đơn POS {order.OrderCode}"
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<PosOrderResultDto>.Success(new PosOrderResultDto
        {
            OrderId = order.OrderId,
            OrderCode = order.OrderCode,
            PartnerId = customer.PartnerId,
            PartnerName = customer.PartnerName,
            TotalAmount = req.TotalAmount,
            PaidAmount = req.PaidAmount,
            OutstandingAmount = outstanding,
            PaymentStatus = paymentStatus,
            Status = order.Status,
            OrderDate = order.OrderDate ?? DateTime.UtcNow,
            Message = "Tạo đơn hàng POS thành công!"
        });
    }
}

