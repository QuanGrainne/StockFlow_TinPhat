using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.Settings.Commands;
using StockFlow.Application.Features.Settings.DTOs;
using StockFlow.Application.Features.Settings.Queries;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/settings/orders")]
[Route("api/order-settings")]
[AllowAnonymous]
public class OrderSettingsController : ControllerBase
{
    private readonly IMediator _mediator;

    public OrderSettingsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Lấy cấu hình thiết lập đơn hàng và quy tắc giao dịch hiện tại.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(OrderSettingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetSettings()
    {
        var result = await _mediator.Send(new GetOrderSettingsQuery());
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Cập nhật cấu hình thiết lập đơn hàng và quy tắc giao dịch (Dành cho Quản trị viên).
    /// </summary>
    [HttpPut]
    [ProducesResponseType(typeof(OrderSettingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateOrderSettingDto request)
    {
        var result = await _mediator.Send(new UpdateOrderSettingsCommand(request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }
}

