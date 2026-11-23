using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Transfers.DTOs;
using StockFlow.Application.Features.Transfers.Helpers;
using StockFlow.Application.Features.Transfers.Queries;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Transfers.Commands;

public record CreateTransferCommand(
    CreateTransferRequest Request,
    int UserId
) : IRequest<Result<TransferDetailDto>>;

public class CreateTransferCommandHandler : IRequestHandler<CreateTransferCommand, Result<TransferDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateTransferCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<TransferDetailDto>> Handle(CreateTransferCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;

        // 1. Validation kho chuyển và kho nhận
        if (req.SourceWarehouseId <= 0)
        {
            return Result.Failure<TransferDetailDto>("Vui lòng chọn chi nhánh kho chuyển đi.");
        }

        if (req.DestWarehouseId <= 0)
        {
            return Result.Failure<TransferDetailDto>("Vui lòng chọn chi nhánh kho nhận hàng.");
        }

        if (req.SourceWarehouseId == req.DestWarehouseId)
        {
            return Result.Failure<TransferDetailDto>("Chi nhánh nhận hàng phải khác chi nhánh chuyển đi.");
        }

        // Cô lập dữ liệu kho (UC-33): chỉ kho xuất được lập phiếu chuyển
        if (!await _currentUserService.HasWarehouseAccessAsync(req.SourceWarehouseId, cancellationToken))
        {
            return Result.Failure<TransferDetailDto>("Bạn không có quyền lập phiếu chuyển hàng từ kho này.");
        }

        if (req.Items == null || req.Items.Count == 0)
        {
            return Result.Failure<TransferDetailDto>("Vui lòng chọn ít nhất 1 mặt hàng cần chuyển.");
        }

        foreach (var it in req.Items)
        {
            if (it.Quantity <= 0)
            {
                return Result.Failure<TransferDetailDto>("Số lượng chuyển của các mặt hàng phải lớn hơn 0.");
            }
            if (it.TransferPrice < 0)
            {
                return Result.Failure<TransferDetailDto>("Giá chuyển không được âm.");
            }
        }

        // 2. Sinh mã phiếu chuyển
        string finalCode;
        // Mã trống / placeholder / "Copy_CK..." (phiếu sao chép) → tự sinh mã mới
        if (string.IsNullOrWhiteSpace(req.TransferCode)
            || req.TransferCode.Trim().Equals("Mã phiếu tự động", StringComparison.OrdinalIgnoreCase)
            || req.TransferCode.Trim().StartsWith("Copy_", StringComparison.OrdinalIgnoreCase))
        {
            finalCode = await TransferHelper.GenerateNextTransferCodeAsync(_context, cancellationToken);
        }
        else
        {
            finalCode = req.TransferCode.Trim().ToUpper();
            var exists = await _context.TrxStockTransfers
                .AnyAsync(t => t.TransferCode == finalCode, cancellationToken);
            if (exists)
            {
                return Result.Failure<TransferDetailDto>($"Mã phiếu chuyển '{finalCode}' đã tồn tại trong hệ thống.");
            }
        }

        var isComplete = string.Equals(req.Status, TransferStatus.InTransit, StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(req.Status, "COMPLETE", StringComparison.OrdinalIgnoreCase);

        var transferDate = TransferHelper.GetVietnamTime(req.TransferDate);

        // 3. Luôn lưu phiếu ở trạng thái Phiếu tạm trước; nếu chọn Hoàn thành thì xuất chuyển bằng đúng logic
        //    của bước "Xuất hàng" (kiểm tra đủ tồn, trừ tồn theo giá vốn, ghi thẻ kho) trong cùng 1 giao dịch.
        await using var dbTransaction = await _context.BeginTransactionAsync(cancellationToken);

        var transfer = new TrxStockTransfer
        {
            TransferCode = finalCode,
            SourceWarehouseId = req.SourceWarehouseId,
            DestWarehouseId = req.DestWarehouseId,
            CreatedBy = command.UserId,
            TransferDate = transferDate,
            Status = TransferStatus.Draft,
            Notes = req.Notes?.Trim()
        };

        await _context.TrxStockTransfers.AddAsync(transfer, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        foreach (var it in req.Items)
        {
            await _context.DtlStockTransferItems.AddAsync(new DtlStockTransferItem
            {
                StockTransferId = transfer.StockTransferId,
                ProductId = it.ProductId,
                Quantity = it.Quantity,
                IssuedQuantity = 0,
                ReceivedQuantity = null,
                // Giá chuyển chỉ để theo dõi giá trị luân chuyển, không ảnh hưởng giá vốn
                TransferPrice = it.TransferPrice,
                Notes = string.IsNullOrWhiteSpace(it.Notes) ? null : it.Notes.Trim(),
            }, cancellationToken);
        }
        await _context.SaveChangesAsync(cancellationToken);

        if (isComplete)
        {
            var completed = await new CompleteTransferCommandHandler(_context, _currentUserService)
                .Handle(new CompleteTransferCommand(transfer.StockTransferId, command.UserId), cancellationToken);
            if (!completed.IsSuccess)
            {
                if (dbTransaction != null) await dbTransaction.RollbackAsync(cancellationToken);
                return completed;
            }
        }

        if (dbTransaction != null) await dbTransaction.CommitAsync(cancellationToken);

        // 4. Trả về chi tiết phiếu vừa tạo
        return await new GetTransferByIdQueryHandler(_context).Handle(new GetTransferByIdQuery(transfer.StockTransferId), cancellationToken);
    }
}
