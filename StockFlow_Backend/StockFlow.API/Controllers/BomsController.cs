using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.Boms.Commands;
using StockFlow.Application.Features.Boms.DTOs;
using StockFlow.Application.Features.Boms.Queries;

namespace StockFlow.API.Controllers;

/// <summary>
/// UC-57: Quản lý BOM / định mức NVL. Quyền kiểm ở server theo ma trận phân quyền (module BOM);
/// mặc định chỉ Manager (và Admin) có quyền ghi.
/// </summary>
[ApiController]
[Route("api/boms")]
public class BomsController : ControllerBase
{
    private readonly IMediator _mediator;

    public BomsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Danh sách BOM; truyền productId để xem lịch sử phiên bản của một thành phẩm.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<BomListItemDto>), StatusCodes.Status200OK)]
    [RequirePermission("BOM_READ")]
    [RequireFeature("feat-bom")]
    public async Task<IActionResult> GetBoms(
        [FromQuery] int? productId, [FromQuery] string? status, [FromQuery] string? search)
    {
        var result = await _mediator.Send(new GetBomsQuery(productId, status, search));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Chi tiết một phiên bản BOM kèm các dòng NVL.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(BomDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [RequirePermission("BOM_READ")]
    [RequireFeature("feat-bom")]
    public async Task<IActionResult> GetBomById(int id)
    {
        var result = await _mediator.Send(new GetBomByIdQuery(id));
        return result.IsSuccess ? Ok(result.Value) : NotFound(new { message = result.Error });
    }

    /// <summary>Tạo BOM nháp (phiên bản mới) cho một thành phẩm.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(BomDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("BOM_CREATE")]
    [RequireFeature("feat-bom")]
    public async Task<IActionResult> CreateBom([FromBody] CreateBomRequest request)
    {
        var result = await _mediator.Send(new CreateBomCommand(request));
        if (!result.IsSuccess) return BadRequest(new { message = result.Error });
        return CreatedAtAction(nameof(GetBomById), new { id = result.Value!.BomId }, result.Value);
    }

    /// <summary>Lưu BOM nháp: danh sách dòng NVL gửi lên thay thế danh sách cũ. Chỉ áp dụng cho BOM Draft.</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(BomDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("BOM_UPDATE")]
    [RequireFeature("feat-bom")]
    public async Task<IActionResult> UpdateBom(int id, [FromBody] UpdateBomRequest request)
    {
        var result = await _mediator.Send(new UpdateBomCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Kích hoạt phiên bản BOM: bản Active cũ của thành phẩm chuyển Inactive (một transaction).</summary>
    [HttpPost("{id:int}/activate")]
    [ProducesResponseType(typeof(BomActivationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("BOM_APPROVE")]
    [RequireFeature("feat-bom")]
    public async Task<IActionResult> ActivateBom(int id)
    {
        var result = await _mediator.Send(new ActivateBomCommand(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Chuyển BOM Active sang Inactive (cách gỡ BOM đã được lệnh sản xuất tham chiếu).</summary>
    [HttpPost("{id:int}/deactivate")]
    [ProducesResponseType(typeof(BomDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("BOM_APPROVE")]
    [RequireFeature("feat-bom")]
    public async Task<IActionResult> DeactivateBom(int id)
    {
        var result = await _mediator.Send(new DeactivateBomCommand(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Xóa BOM chưa từng được lệnh sản xuất tham chiếu và không đang Active.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("BOM_DELETE")]
    [RequireFeature("feat-bom")]
    public async Task<IActionResult> DeleteBom(int id)
    {
        var result = await _mediator.Send(new DeleteBomCommand(id));
        return result.IsSuccess ? NoContent() : BadRequest(new { message = result.Error });
    }
}
