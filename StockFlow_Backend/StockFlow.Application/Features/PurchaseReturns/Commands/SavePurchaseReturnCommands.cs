using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseReturns.DTOs;
using StockFlow.Application.Features.PurchaseReturns.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PurchaseReturns.Commands;

/// <summary>Tạo phiếu trả hàng nhập (lưu tạm hoặc hoàn thành ngay).</summary>
public record CreatePurchaseReturnCommand(SavePurchaseReturnRequest Request) : IRequest<Result<PurchaseReturnDetailDto>>;

/// <summary>Sửa phiếu trả hàng nhập đang ở trạng thái Phiếu tạm (có thể hoàn thành luôn).</summary>
public record UpdatePurchaseReturnCommand(int Id, SavePurchaseReturnRequest Request) : IRequest<Result<PurchaseReturnDetailDto>>;

public class SavePurchaseReturnHandler :
    IRequestHandler<CreatePurchaseReturnCommand, Result<PurchaseReturnDetailDto>>,
    IRequestHandler<UpdatePurchaseReturnCommand, Result<PurchaseReturnDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public SavePurchaseReturnHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public Task<Result<PurchaseReturnDetailDto>> Handle(CreatePurchaseReturnCommand command, CancellationToken ct) =>
        SaveAsync(null, command.Request, ct);

    public Task<Result<PurchaseReturnDetailDto>> Handle(UpdatePurchaseReturnCommand command, CancellationToken ct) =>
        SaveAsync(command.Id, command.Request, ct);

    private async Task<Result<PurchaseReturnDetailDto>> SaveAsync(int? id, SavePurchaseReturnRequest req, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<PurchaseReturnDetailDto>("Không xác định được người dùng đăng nhập.");
        var userId = _currentUser.UserId.Value;

        TrxPurchaseReturn? ret = null;
        if (id.HasValue)
        {
            ret = await _context.TrxPurchaseReturns
                .Include(r => r.DtlPurchaseReturnItems)
                .FirstOrDefaultAsync(r => r.PurchaseReturnId == id.Value, ct);
            if (ret == null)
                return Result.Failure<PurchaseReturnDetailDto>($"Không tìm thấy phiếu trả hàng nhập #{id}.");
            if (!await _currentUser.HasWarehouseAccessAsync(ret.WarehouseId, ct))
                return Result.Failure<PurchaseReturnDetailDto>("Bạn không có quyền truy cập phiếu trả hàng của kho này.");
            if (!PurchaseReturnLogic.Is(ret.Status, PurchaseReturnLogic.Draft))
                return Result.Failure<PurchaseReturnDetailDto>("Chỉ sửa được phiếu trả hàng nhập ở trạng thái Phiếu tạm.");
            // Giữ nguyên phiếu nhập gốc của phiếu tạm
            req = req with { GrId = ret.GrId, WarehouseId = ret.WarehouseId };
        }

        var prepared = await PurchaseReturnLogic.PrepareAsync(_context, _currentUser, req, id, ct);
        if (!prepared.IsSuccess)
            return Result.Failure<PurchaseReturnDetailDto>(prepared.Error!);
        var p = prepared.Value!;

        var code = await PurchaseReturnLogic.ResolveCodeAsync(_context, req.ReturnCode ?? ret?.ReturnCode, id, ct);
        if (!code.IsSuccess)
            return Result.Failure<PurchaseReturnDetailDto>(code.Error!);

        await using var transaction = await _context.BeginTransactionAsync(ct);
        try
        {
            if (ret == null)
            {
                ret = new TrxPurchaseReturn { CreatedBy = userId, CreatedAt = VietnamTime.Now };
                _context.TrxPurchaseReturns.Add(ret);
            }
            else
            {
                _context.DtlPurchaseReturnItems.RemoveRange(ret.DtlPurchaseReturnItems);
                ret.DtlPurchaseReturnItems.Clear();
            }

            ret.ReturnCode = code.Value;
            ret.GrId = p.Receipt?.GrId;
            ret.WarehouseId = p.WarehouseId;
            ret.PartnerId = p.Partner.PartnerId;
            // Client gửi ISO UTC (toISOString) → đổi về giờ Việt Nam trước khi lưu
            ret.ReturnDate = VietnamTime.From(req.ReturnDate);
            ret.Status = p.Status;
            ret.DiscountAmount = p.Discount;
            ret.TotalAmount = p.Total;
            ret.RefundAmount = p.Refund;
            ret.PaymentMethod = p.PaymentMethod;
            ret.Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
            foreach (var item in p.Items) ret.DtlPurchaseReturnItems.Add(item);

            // Lưu trước để có PurchaseReturnId cho thẻ kho / giao dịch tài chính
            await _context.SaveChangesAsync(ct);

            if (p.Status == PurchaseReturnLogic.Completed)
            {
                await PurchaseReturnLogic.ApplyCompletionAsync(_context, ret, p.Items, p.Products, p.Partner, userId, ct);
                await _context.SaveChangesAsync(ct);
            }

            if (transaction != null) await transaction.CommitAsync(ct);
        }
        catch (Exception ex)
        {
            if (transaction != null) await transaction.RollbackAsync(ct);
            return Result.Failure<PurchaseReturnDetailDto>($"Lỗi khi lưu phiếu trả hàng nhập: {ex.InnerException?.Message ?? ex.Message}");
        }

        var saved = await PurchaseReturnLogic.LoadAsync(_context, ret.PurchaseReturnId, ct);
        return Result.Success(await PurchaseReturnLogic.WithOffsetAsync(_context, PurchaseReturnLogic.ToDetail(saved!), ct));
    }
}

/// <summary>Hủy phiếu trả hàng nhập (phiếu đã hoàn thành sẽ nhập lại kho và cộng lại công nợ).</summary>
public record CancelPurchaseReturnCommand(int Id) : IRequest<Result<bool>>;

public class CancelPurchaseReturnHandler : IRequestHandler<CancelPurchaseReturnCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CancelPurchaseReturnHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(CancelPurchaseReturnCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");

        var ret = await _context.TrxPurchaseReturns
            .Include(r => r.DtlPurchaseReturnItems)
            .FirstOrDefaultAsync(r => r.PurchaseReturnId == command.Id, ct);
        if (ret == null)
            return Result.Failure<bool>($"Không tìm thấy phiếu trả hàng nhập #{command.Id}.");
        if (!await _currentUser.HasWarehouseAccessAsync(ret.WarehouseId, ct))
            return Result.Failure<bool>("Bạn không có quyền truy cập phiếu trả hàng của kho này.");
        if (PurchaseReturnLogic.Is(ret.Status, PurchaseReturnLogic.Cancelled))
            return Result.Failure<bool>("Phiếu trả hàng nhập này đã bị hủy trước đó.");

        await using var transaction = await _context.BeginTransactionAsync(ct);
        try
        {
            if (PurchaseReturnLogic.Is(ret.Status, PurchaseReturnLogic.Completed))
            {
                await PurchaseReturnLogic.ReverseCompletionAsync(_context, ret, _currentUser.UserId.Value, ct);
            }
            ret.Status = PurchaseReturnLogic.Cancelled;
            await _context.SaveChangesAsync(ct);
            if (transaction != null) await transaction.CommitAsync(ct);
            return Result.Success(true);
        }
        catch (Exception ex)
        {
            if (transaction != null) await transaction.RollbackAsync(ct);
            return Result.Failure<bool>($"Lỗi khi hủy phiếu trả hàng nhập: {ex.Message}");
        }
    }
}
