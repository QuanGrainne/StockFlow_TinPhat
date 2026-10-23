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
public class WarehousePermissionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public WarehousePermissionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Lấy danh sách phân quyền kho của nhân sự (hỗ trợ tìm kiếm, lọc theo kho).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<WarehouseStaffAccessDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWarehousePermissions([FromQuery] string? search, [FromQuery] string? warehouseFilter)
    {
        var result = await _mediator.Send(new GetWarehousePermissionsQuery(search, warehouseFilter));
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy danh sách các kho vật lý trong hệ thống (kèm số lượng nhân sự được phân quyền).
    /// </summary>
    [HttpGet("facilities")]
    [ProducesResponseType(typeof(List<WarehouseFacilityDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWarehouseFacilities()
    {
        var result = await _mediator.Send(new GetWarehouseFacilitiesQuery());
        return Ok(result.Value);
    }

    /// <summary>
    /// Cập nhật danh sách kho được phân quyền cho một nhân sự cụ thể.
    /// </summary>
    [HttpPut("{userId}")]
    [ProducesResponseType(typeof(WarehouseStaffAccessDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateWarehouseAccess(int userId, [FromBody] UpdateWarehouseAccessRequest request)
    {
        var result = await _mediator.Send(new UpdateWarehouseAccessCommand(userId, request));
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("Quản trị viên") == true || result.Error?.Contains("không có quyền") == true)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = result.Error });
            }
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Thêm mới một kho vật lý vào hệ thống (Dành cho Quản trị viên).
    /// </summary>
    [HttpPost("facilities")]
    [ProducesResponseType(typeof(WarehouseFacilityDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateWarehouseFacility([FromBody] CreateWarehouseRequest request)
    {
        var result = await _mediator.Send(new CreateWarehouseCommand(request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Cập nhật thông tin kho vật lý.
    /// </summary>
    [HttpPut("facilities/{warehouseId}")]
    [ProducesResponseType(typeof(WarehouseFacilityDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateWarehouseFacility(int warehouseId, [FromBody] UpdateWarehouseRequest request)
    {
        var result = await _mediator.Send(new UpdateWarehouseCommand(warehouseId, request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }
}
