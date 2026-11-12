using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.Purchases.Commands;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.Application.Features.Purchases.Queries;
using StockFlow.API.Authorization;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PurchasesController : ControllerBase
{
    private readonly IMediator _mediator;

    public PurchasesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Lấy danh sách phiếu nhập hàng (hỗ trợ lọc theo Kho active, nhiều kho, trạng thái, thời gian, NCC, tìm kiếm).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PurchaseListDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("PURCHASE_READ")]
    public async Task<IActionResult> GetPurchases(
        [FromQuery] int? warehouseId,
        [FromQuery] string? warehouseIds,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int? partnerId,
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

        var query = new GetPurchasesQuery(
            warehouseId,
            parsedWarehouseIds,
            status,
            fromDate,
            toDate,
            partnerId,
            search
        );

        var result = await _mediator.Send(query);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy thông tin chi tiết một phiếu nhập hàng và danh sách sản phẩm.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(PurchaseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [RequirePermission("PURCHASE_READ")]
    public async Task<IActionResult> GetPurchaseById(int id)
    {
        var result = await _mediator.Send(new GetPurchaseByIdQuery(id));
        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Tạo phiếu nhập hàng mới (Hỗ trợ Lưu tạm DRAFT hoặc Hoàn thành COMPLETED).
    /// Nếu Hoàn thành: Tự động cộng tồn kho, tính giá vốn bình quân gia quyền tại kho nhận và ghi công nợ NCC.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PurchaseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("PURCHASE_CREATE")]
    public async Task<IActionResult> CreatePurchase([FromBody] CreatePurchaseRequest request)
    {
        var result = await _mediator.Send(new CreatePurchaseCommand(request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Chỉnh sửa nội dung phiếu nhập hàng đang ở trạng thái Phiếu tạm (DRAFT).
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(PurchaseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("PURCHASE_UPDATE")]
    public async Task<IActionResult> UpdatePurchase(int id, [FromBody] UpdatePurchaseRequest request)
    {
        var result = await _mediator.Send(new UpdatePurchaseCommand(id, request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Xác nhận hoàn thành nhập kho cho phiếu tạm (DRAFT -> COMPLETED).
    /// Kích hoạt cập nhật tồn kho, tính giá vốn bình quân gia quyền và ghi nợ NCC.
    /// </summary>
    [HttpPatch("{id}/complete")]
    [ProducesResponseType(typeof(PurchaseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("PURCHASE_CREATE")]
    public async Task<IActionResult> CompletePurchase(int id, [FromBody] CompletePurchaseRequest? request)
    {
        var result = await _mediator.Send(new CompletePurchaseCommand(id, request ?? new CompletePurchaseRequest()));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Hủy phiếu nhập hàng đang ở trạng thái Phiếu tạm (DRAFT -> CANCELLED).
    /// </summary>
    [HttpPatch("{id}/cancel")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("PURCHASE_UPDATE")]
    public async Task<IActionResult> CancelPurchase(int id, [FromBody] CancelPurchaseRequest? request)
    {
        var result = await _mediator.Send(new CancelPurchaseCommand(id, request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { success = true, message = "Đã hủy phiếu nhập hàng thành công." });
    }
}
