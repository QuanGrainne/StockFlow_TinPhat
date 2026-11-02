using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Common;
using StockFlow.Application.Features.Orders.Commands;
using StockFlow.Application.Features.Orders.DTOs;
using StockFlow.Application.Features.Orders.Queries;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class OrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public OrdersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Lấy danh sách các đơn hàng POS (hỗ trợ tìm kiếm, lọc theo chi nhánh, thời gian, trạng thái, trả hàng, phương thức thanh toán, bảng giá và phân trang).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PaginatedResult<PosOrderSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrders(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int? warehouseId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? returnStatus,
        [FromQuery] string? paymentMethod,
        [FromQuery] string? priceBookName,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetPosOrdersQuery(
            search,
            status,
            warehouseId,
            fromDate,
            toDate,
            returnStatus,
            paymentMethod,
            priceBookName,
            page,
            pageSize
        ));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Tạo mới đơn hàng bán lẻ / bán buôn POS (hỗ trợ thanh toán tiền mặt, chuyển khoản VietQR, quẹt thẻ POS hoặc ghi nợ).
    /// </summary>
    [HttpPost("pos")]
    [ProducesResponseType(typeof(PosOrderResultDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreatePosOrder([FromBody] CreatePosOrderRequest request)
    {
        var result = await _mediator.Send(new CreatePosOrderCommand(request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return StatusCode(StatusCodes.Status201Created, result.Value);
    }
}
