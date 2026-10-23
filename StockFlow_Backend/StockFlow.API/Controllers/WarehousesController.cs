using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.WarehousePermissions.Commands;
using StockFlow.Application.Features.WarehousePermissions.DTOs;
using StockFlow.Application.Features.WarehousePermissions.Queries;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class WarehousesController : ControllerBase
{
    private readonly IMediator _mediator;

    public WarehousesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Lấy danh sách toàn bộ các kho vật lý trong hệ thống.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<WarehouseFacilityDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllWarehouses()
    {
        var result = await _mediator.Send(new GetWarehouseFacilitiesQuery());
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy danh sách các kho vật lý mà tài khoản hiện tại được phân quyền (Data Isolation).
    /// </summary>
    [HttpGet("my-warehouses")]
    [ProducesResponseType(typeof(List<WarehouseFacilityDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyWarehouses()
    {
        var result = await _mediator.Send(new GetMyWarehousesQuery());
        if (!result.IsSuccess)
        {
            return Unauthorized(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy chi tiết thông tin một kho vật lý (kèm danh sách nhân sự được phân quyền và số lượng tồn).
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(WarehouseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetWarehouseById(int id)
    {
        var result = await _mediator.Send(new GetWarehouseByIdQuery(id));
        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Tạo mới một kho vật lý trong hệ thống (Mã kho, Tên kho, Địa chỉ, Mô tả diện tích...).
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(WarehouseFacilityDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateWarehouse([FromBody] CreateWarehouseRequest request)
    {
        var result = await _mediator.Send(new CreateWarehouseCommand(request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Cập nhật thông tin kho vật lý (Tên kho, Địa chỉ, Mô tả, Trạng thái).
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(WarehouseFacilityDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateWarehouse(int id, [FromBody] UpdateWarehouseRequest request)
    {
        var result = await _mediator.Send(new UpdateWarehouseCommand(id, request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Bật / Tắt trạng thái hoạt động của kho vật lý.
    /// </summary>
    [HttpPatch("{id}/toggle-status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ToggleWarehouseStatus(int id)
    {
        var result = await _mediator.Send(new ToggleWarehouseStatusCommand(id));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { isActive = result.Value });
    }

    /// <summary>
    /// Xóa kho hoặc chuyển sang ngưng hoạt động nếu đã có tồn kho/chứng từ liên kết.
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteWarehouse(int id)
    {
        var result = await _mediator.Send(new DeleteWarehouseCommand(id));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { success = true });
    }
}
