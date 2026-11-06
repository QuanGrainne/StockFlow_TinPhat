using System.Globalization;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Customers.Commands;

/// <summary>
/// Tạo phiếu thu tiền nợ của khách hàng — đối xứng với phiếu chi trả nợ nhà cung cấp.
/// Phần phân bổ vào hóa đơn: mỗi hóa đơn 1 phiếu mã TT + mã hóa đơn (TTHD000085; lần thu sau TTHD000085-1, -2...),
/// đồng thời cập nhật Đã trả / Còn nợ / trạng thái thanh toán của hóa đơn.
/// Phần chưa phân bổ: phiếu thu chung mã PT000001..., vẫn trừ vào tổng nợ của khách.
/// </summary>
public record CreateCustomerPaymentCommand(int PartnerId, CreateCustomerPaymentRequest Request)
    : IRequest<Result<CustomerPaymentResultDto>>;

public class CreateCustomerPaymentCommandValidator : AbstractValidator<CreateCustomerPaymentCommand>
{
    public CreateCustomerPaymentCommandValidator()
    {
        RuleFor(x => x.Request.Amount)
            .GreaterThan(0).WithMessage("Số tiền thu phải lớn hơn 0.");

        RuleForEach(x => x.Request.Allocations)
            .Must(a => a.Amount >= 0).WithMessage("Số tiền phân bổ không được âm.");
    }
}

public class CreateCustomerPaymentCommandHandler
    : IRequestHandler<CreateCustomerPaymentCommand, Result<CustomerPaymentResultDto>>
{
    private const string VoucherSequence = "stockflow.seq_customer_receipt";
    private const string VoucherPrefix = "PT";
    private const string ReceiptTxType = "RECEIPT";
    private const string SalesOrderRef = "SALES_ORDER";
    private static readonly CultureInfo Vi = CultureInfo.GetCultureInfo("vi-VN");
    private static string Money(decimal v) => v.ToString("N0", Vi);

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateCustomerPaymentCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<CustomerPaymentResultDto>> Handle(
        CreateCustomerPaymentCommand command,
        CancellationToken cancellationToken)
    {
        var req = command.Request;

        if (!_currentUserService.UserId.HasValue)
        {
            return Result.Failure<CustomerPaymentResultDto>("Không xác định được người dùng đăng nhập.");
        }

        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId, cancellationToken);
        if (partner == null ||
            partner.PartnerType == null ||
            !(partner.PartnerType.Equals("CUSTOMER", StringComparison.OrdinalIgnoreCase) ||
              partner.PartnerType.Equals("BOTH", StringComparison.OrdinalIgnoreCase)))
        {
            return Result.Failure<CustomerPaymentResultDto>("Không tìm thấy khách hàng.");
        }

        var amount = Math.Round(req.Amount, 0, MidpointRounding.AwayFromZero);
        var currentDebt = partner.CurrentDebt ?? 0m;
        if (amount > currentDebt)
        {
            return Result.Failure<CustomerPaymentResultDto>(
                $"Số tiền thu ({Money(amount)}) vượt quá nợ hiện tại của khách ({Money(currentDebt)}).");
        }

        // ── Kiểm tra phân bổ: chỉ vào hóa đơn hoàn thành của chính khách, không vượt số còn nợ của hóa đơn ──
        var allocations = (req.Allocations ?? new List<CustomerPaymentAllocationRequest>())
            .Where(a => a.Amount > 0)
            .GroupBy(a => a.OrderId)
            .Select(g => new { OrderId = g.Key, Amount = Math.Round(g.Sum(x => x.Amount), 0, MidpointRounding.AwayFromZero) })
            .ToList();

        var allocatedTotal = allocations.Sum(a => a.Amount);
        if (allocatedTotal > amount)
        {
            return Result.Failure<CustomerPaymentResultDto>("Tổng tiền phân bổ vượt quá số tiền thu.");
        }

        var orderIds = allocations.Select(a => a.OrderId).ToList();
        var orders = orderIds.Count == 0
            ? new List<TrxOrder>()
            : await _context.TrxOrders.Where(o => orderIds.Contains(o.OrderId)).ToListAsync(cancellationToken);

        foreach (var alloc in allocations)
        {
            var order = orders.FirstOrDefault(o => o.OrderId == alloc.OrderId);
            if (order == null || order.PartnerId != partner.PartnerId ||
                !string.Equals(order.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
            {
                return Result.Failure<CustomerPaymentResultDto>(
                    $"Hóa đơn #{alloc.OrderId} không thuộc khách hàng này hoặc chưa hoàn thành.");
            }

            var remaining = Math.Max(0, order.OutstandingAmount ?? 0);
            if (alloc.Amount > remaining)
            {
                return Result.Failure<CustomerPaymentResultDto>(
                    $"Tiền thu cho hóa đơn {order.OrderCode} ({Money(alloc.Amount)}) vượt quá số còn cần thu ({Money(remaining)}).");
            }
        }

        // ── Tiền chưa phân bổ: tự trừ tiếp vào các hóa đơn còn nợ (cũ nhất trước) để nợ khách luôn khớp nợ hóa đơn.
        //    Chỉ phần vượt quá tổng nợ các hóa đơn mới thành phiếu thu chung PT... ──
        var leftover = amount - allocatedTotal;
        if (leftover > 0)
        {
            var openOrders = await _context.TrxOrders
                .Where(o => o.PartnerId == partner.PartnerId && o.Status != null && o.Status.ToUpper() == "COMPLETED" &&
                            (o.OutstandingAmount ?? 0) > 0)
                .OrderBy(o => o.OrderDate).ThenBy(o => o.OrderId)
                .ToListAsync(cancellationToken);

            foreach (var open in openOrders)
            {
                if (leftover <= 0) break;
                var already = allocations.Where(a => a.OrderId == open.OrderId).Sum(a => a.Amount);
                var room = Math.Max(0, (open.OutstandingAmount ?? 0) - already);
                if (room <= 0) continue;
                var take = Math.Min(room, leftover);
                var idx = allocations.FindIndex(a => a.OrderId == open.OrderId);
                if (idx >= 0) allocations[idx] = new { OrderId = open.OrderId, Amount = allocations[idx].Amount + take };
                else allocations.Add(new { OrderId = open.OrderId, Amount = take });
                if (!orders.Any(o => o.OrderId == open.OrderId)) orders.Add(open);
                leftover -= take;
            }
            allocatedTotal = allocations.Sum(a => a.Amount);
            orderIds = allocations.Select(a => a.OrderId).ToList();
        }

        var dbContext = _context as DbContext;
        using var transaction = dbContext != null ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
        try
        {
            var paymentDate = VietnamTime.From(req.PaymentDate);
            var method = string.IsNullOrWhiteSpace(req.PaymentMethod) ? "CASH" : req.PaymentMethod.Trim().ToUpperInvariant();
            var userNotes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
            var userId = _currentUserService.UserId.Value;

            TrxFinancialTransaction NewTx(string code, decimal txAmount, string? refType, int? refId) => new()
            {
                PartnerId = partner.PartnerId,
                TxType = ReceiptTxType,
                TxCode = code,
                Amount = txAmount,
                PaymentMethod = method,
                ReferenceType = refType,
                ReferenceId = refId,
                TransactionDate = paymentDate,
                CreatedBy = userId,
                Status = "COMPLETED",
                // Không tự sinh ghi chú: chỉ lưu ghi chú người dùng nhập
                Description = userNotes,
            };

            // Mã phiếu thu theo hóa đơn: lần thu đầu TTHD000085, các lần sau TTHD000085-1, TTHD000085-2...
            var existingCodes = orderIds.Count == 0
                ? new List<(int OrderId, string? Code)>()
                : (await _context.TrxFinancialTransactions.AsNoTracking()
                    .Where(t => t.TxType == ReceiptTxType && t.ReferenceType == SalesOrderRef &&
                                t.ReferenceId != null && orderIds.Contains(t.ReferenceId.Value))
                    .Select(t => new { OrderId = t.ReferenceId!.Value, t.TxCode })
                    .ToListAsync(cancellationToken))
                    .Select(t => (OrderId: t.OrderId, Code: (string?)t.TxCode))
                    .ToList();

            var createdCodes = new List<string>();
            foreach (var alloc in allocations)
            {
                var order = orders.First(o => o.OrderId == alloc.OrderId);
                var baseCode = $"TT{order.OrderCode}";
                var usedForOrder = existingCodes.Where(e => e.OrderId == order.OrderId).ToList();
                // Phiếu thu cũ không có mã được hiểu là mã gốc (TTHD...)
                var used = new HashSet<string>(usedForOrder.Select(e => e.Code ?? baseCode), StringComparer.OrdinalIgnoreCase);
                var n = usedForOrder.Count;
                var code = n == 0 ? baseCode : $"{baseCode}-{n}";
                while (used.Contains(code)) code = $"{baseCode}-{++n}";

                _context.TrxFinancialTransactions.Add(NewTx(code, alloc.Amount, SalesOrderRef, order.OrderId));
                createdCodes.Add(code);

                order.PaidAmount = (order.PaidAmount ?? 0) + alloc.Amount;
                order.OutstandingAmount = Math.Max(0, (order.OutstandingAmount ?? 0) - alloc.Amount);
                order.PaymentStatus = order.OutstandingAmount > 0 ? "PARTIAL" : "PAID";
                order.UpdatedAt = VietnamTime.Now;
                order.UpdatedBy = userId;
            }

            var unallocated = amount - allocatedTotal;
            if (unallocated > 0)
            {
                // Phần không gắn hóa đơn: phiếu thu chung PT000001...
                var seq = await _context.GetNextSequenceValueAsync(VoucherSequence, cancellationToken);
                var ptCode = $"{VoucherPrefix}{seq:D6}";
                _context.TrxFinancialTransactions.Add(NewTx(ptCode, unallocated, null, null));
                createdCodes.Add(ptCode);
            }

            partner.CurrentDebt = currentDebt - amount;

            await _context.SaveChangesAsync(cancellationToken);
            if (transaction != null) await transaction.CommitAsync(cancellationToken);

            return Result.Success(new CustomerPaymentResultDto(
                VoucherCode: string.Join(", ", createdCodes),
                Amount: amount,
                AllocatedAmount: allocatedTotal,
                RemainingDebt: partner.CurrentDebt ?? 0m));
        }
        catch (Exception ex)
        {
            if (transaction != null) await transaction.RollbackAsync(cancellationToken);
            return Result.Failure<CustomerPaymentResultDto>($"Lỗi khi tạo phiếu thu: {ex.Message}");
        }
    }
}
