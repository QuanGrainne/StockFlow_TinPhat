using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Transfers.DTOs;
using StockFlow.Application.Features.Transfers.Queries;

namespace StockFlow.Application.Features.Transfers.Commands;

/// <summary>
/// Sửa ghi chú phiếu chuyển ở mọi trạng thái (không đổi tồn kho):
/// - Ghi chú chuyển: chi nhánh gửi được sửa.
/// - Ghi chú nhận: chi nhánh nhận được sửa (khi phiếu đang chuyển hoặc đã nhận).
/// </summary>
public record UpdateTransferNotesCommand(int Id, UpdateTransferNotesRequest Request) : IRequest<Result<TransferDetailDto>>;

public class UpdateTransferNotesCommandHandler : IRequestHandler<UpdateTransferNotesCommand, Result<TransferDetailDto>>
{
    private const int MaxLength = 500;
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public UpdateTransferNotesCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<TransferDetailDto>> Handle(UpdateTransferNotesCommand command, CancellationToken ct)
    {
        var req = command.Request;
        var transfer = await _context.TrxStockTransfers.FirstOrDefaultAsync(t => t.StockTransferId == command.Id, ct);
        if (transfer == null)
            return Result.Failure<TransferDetailDto>("Không tìm thấy phiếu chuyển hàng.");

        if (req.Notes != null)
        {
            if (!await _currentUser.HasWarehouseAccessAsync(transfer.SourceWarehouseId, ct))
                return Result.Failure<TransferDetailDto>("Chỉ chi nhánh chuyển được sửa ghi chú chuyển.");
            var notes = req.Notes.Trim();
            if (notes.Length > MaxLength)
                return Result.Failure<TransferDetailDto>($"Ghi chú chuyển tối đa {MaxLength} ký tự.");
            transfer.Notes = notes.Length == 0 ? null : notes;
        }

        if (req.ReceiveNotes != null)
        {
            // Chi nhánh nhận ghi chú được từ lúc hàng đang chuyển tới (chưa bấm Nhận hàng) và sau khi đã nhận
            if (!transfer.CanEditReceiveNotes())
                return Result.Failure<TransferDetailDto>("Chỉ ghi chú nhận được khi phiếu đang chuyển hoặc đã nhận hàng.");
            if (!await _currentUser.HasWarehouseAccessAsync(transfer.DestWarehouseId, ct))
                return Result.Failure<TransferDetailDto>("Chỉ chi nhánh nhận được sửa ghi chú nhận.");
            var notes = req.ReceiveNotes.Trim();
            if (notes.Length > MaxLength)
                return Result.Failure<TransferDetailDto>($"Ghi chú nhận tối đa {MaxLength} ký tự.");
            transfer.ReceiveNotes = notes.Length == 0 ? null : notes;
        }

        await _context.SaveChangesAsync(ct);
        return await new GetTransferByIdQueryHandler(_context).Handle(new GetTransferByIdQuery(transfer.StockTransferId), ct);
    }
}
