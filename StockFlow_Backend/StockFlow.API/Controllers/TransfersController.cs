using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.Transfers.Commands;
using StockFlow.Application.Features.Transfers.DTOs;
using StockFlow.Application.Features.Transfers.Queries;
using StockFlow.API.Authorization;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransfersController : ControllerBase
{
    private readonly IMediator _mediator;

    public TransfersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(claim, out var id))
        {
            return id;
        }
        // Mọi endpoint đều yêu cầu đăng nhập (FallbackPolicy) nên luôn có claim; không mặc định về admin.
        throw new InvalidOperationException("Không xác định được người dùng đăng nhập.");
    }

    /// <summary>
    /// Lấy danh sách phiếu chuyển hàng (hỗ trợ lọc theo kho xuất, kho nhận, trạng thái, thời gian, tìm kiếm).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<TransferListDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("STOCK_READ")]
    public async Task<IActionResult> GetTransfers(
        [FromQuery] int? sourceWarehouseId,
        [FromQuery] int? destWarehouseId,
        [FromQuery] string? warehouseIds,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? dateType,
        [FromQuery] string? search)
    {
        List<int>? parsedWarehouseIds = null;
        if (!string.IsNullOrWhiteSpace(warehouseIds))
        {
            parsedWarehouseIds = warehouseIds
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out int id) ? id : 0)
                .Where(id => id > 0)
                .ToList();
        }

        var query = new GetTransfersQuery(
            SourceWarehouseId: sourceWarehouseId,
            DestWarehouseId: destWarehouseId,
            WarehouseIds: parsedWarehouseIds,
            Status: status,
            FromDate: fromDate,
            ToDate: toDate,
            DateType: dateType,
            Search: search
        );

        var result = await _mediator.Send(query);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Tìm kiếm hàng hóa phục vụ lập phiếu chuyển (hiển thị đồng thời tồn kho xuất và tồn kho nhận).
    /// </summary>
    [HttpGet("products-for-transfer")]
    [ProducesResponseType(typeof(List<ProductWithStockDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("STOCK_READ")]
    public async Task<IActionResult> GetProductsForTransfer(
        [FromQuery] int sourceWarehouseId,
        [FromQuery] int? destWarehouseId,
        [FromQuery] string? search)
    {
        if (sourceWarehouseId <= 0)
        {
            return BadRequest(new { message = "Vui lòng cung cấp sourceWarehouseId hợp lệ." });
        }

        var query = new GetProductsForTransferQuery(sourceWarehouseId, destWarehouseId, search);
        var result = await _mediator.Send(query);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy chi tiết phiếu chuyển hàng theo ID.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(TransferDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [RequirePermission("STOCK_READ")]
    public async Task<IActionResult> GetTransferById(int id)
    {
        var result = await _mediator.Send(new GetTransferByIdQuery(id));
        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Tạo mới phiếu chuyển hàng (Lưu tạm hoặc Hoàn thành xuất kho).
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(TransferDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("STOCK_CREATE")]
    public async Task<IActionResult> CreateTransfer([FromBody] CreateTransferRequest request)
    {
        var userId = GetCurrentUserId();
        var command = new CreateTransferCommand(request, userId);
        var result = await _mediator.Send(command);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Cập nhật phiếu chuyển hàng (áp dụng cho phiếu tạm DRAFT).
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(TransferDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("STOCK_UPDATE")]
    public async Task<IActionResult> UpdateTransfer(int id, [FromBody] UpdateTransferRequest request)
    {
        var userId = GetCurrentUserId();
        var command = new UpdateTransferCommand(id, request, userId);
        var result = await _mediator.Send(command);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Sửa ghi chú chuyển / ghi chú nhận (mọi trạng thái, không đổi tồn kho).
    /// </summary>
    [HttpPut("{id}/notes")]
    [ProducesResponseType(typeof(TransferDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("STOCK_UPDATE")]
    public async Task<IActionResult> UpdateTransferNotes(int id, [FromBody] UpdateTransferNotesRequest request)
    {
        var result = await _mediator.Send(new UpdateTransferNotesCommand(id, request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Chuyển phiếu từ DRAFT sang IN_TRANSIT (Xuất kho chuyển đi).
    /// </summary>
    [HttpPost("{id}/complete")]
    [ProducesResponseType(typeof(TransferDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("STOCK_UPDATE")]
    public async Task<IActionResult> CompleteTransfer(int id)
    {
        var userId = GetCurrentUserId();
        var command = new CompleteTransferCommand(id, userId);
        var result = await _mediator.Send(command);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Nhận hàng tại chi nhánh đích (chuyển sang RECEIVED và cộng tồn kho đích).
    /// </summary>
    [HttpPost("{id}/receive")]
    [ProducesResponseType(typeof(TransferDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("STOCK_UPDATE")]
    public async Task<IActionResult> ReceiveTransfer(int id, [FromBody] ReceiveTransferRequest request)
    {
        var userId = GetCurrentUserId();
        var command = new ReceiveTransferCommand(id, request, userId);
        var result = await _mediator.Send(command);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Hủy phiếu chuyển hàng (tự động hoàn lại tồn kho nếu đang ở trạng thái IN_TRANSIT).
    /// </summary>
    [HttpPost("{id}/cancel")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("STOCK_UPDATE")]
    public async Task<IActionResult> CancelTransfer(int id, [FromBody] CancelTransferRequest? request)
    {
        var userId = GetCurrentUserId();
        var command = new CancelTransferCommand(id, request?.Reason, userId);
        var result = await _mediator.Send(command);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { success = true });
    }
}

public class CancelTransferRequest
{
    public string? Reason { get; set; }
}
