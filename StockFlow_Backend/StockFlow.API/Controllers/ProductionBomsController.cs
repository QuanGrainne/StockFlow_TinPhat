using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.Production.Commands;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Queries;

namespace StockFlow.API.Controllers;

/// <summary>
/// Định mức BOM (UC-57, BR-30, BR-06) — chức năng "Định mức BOM" (feat-bom), dành cho Manager.
/// Xem BOM còn mở cho chức năng "Lập lệnh sản xuất" (chọn BOM khi lập lệnh).
/// </summary>
[ApiController]
[Route("api/production/boms")]
public class ProductionBomsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductionBomsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Danh sách BOM (isActive: true = đang áp dụng, false = ngừng áp dụng).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<BomSummaryDto>), StatusCodes.Status200OK)]
    [RequirePermission("BOM_READ")]
    [RequireFeature("feat-bom", "feat-prod-plan")]
    public async Task<IActionResult> GetBoms([FromQuery] bool? isActive, [FromQuery] string? search, [FromQuery] int? productId)
    {
        var result = await _mediator.Send(new GetBomsQuery(isActive, search, productId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Chi tiết BOM kèm các dòng nguyên vật liệu.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(BomDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("BOM_READ")]
    [RequireFeature("feat-bom", "feat-prod-plan")]
    public async Task<IActionResult> GetBomById(int id)
    {
        var result = await _mediator.Send(new GetBomByIdQuery(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Tạo phiên bản BOM mới cho thành phẩm.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(BomDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("BOM_CREATE")]
    [RequireFeature("feat-bom")]
    public async Task<IActionResult> CreateBom([FromBody] SaveBomRequest request)
    {
        var result = await _mediator.Send(new CreateBomCommand(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Sửa BOM chưa được lệnh sản xuất nào dùng.</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(BomDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("BOM_UPDATE")]
    [RequireFeature("feat-bom")]
    public async Task<IActionResult> UpdateBom(int id, [FromBody] SaveBomRequest request)
    {
        var result = await _mediator.Send(new UpdateBomCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Kích hoạt phiên bản BOM (bản đang áp dụng cũ chuyển ngừng áp dụng).</summary>
    [HttpPost("{id:int}/activate")]
    [ProducesResponseType(typeof(BomDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("BOM_APPROVE")]
    [RequireFeature("feat-bom")]
    public async Task<IActionResult> ActivateBom(int id)
    {
        var result = await _mediator.Send(new ActivateBomCommand(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Ngừng áp dụng BOM.</summary>
    [HttpPost("{id:int}/deactivate")]
    [ProducesResponseType(typeof(BomDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("BOM_APPROVE")]
    [RequireFeature("feat-bom")]
    public async Task<IActionResult> DeactivateBom(int id)
    {
        var result = await _mediator.Send(new DeactivateBomCommand(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Xoá BOM chưa dùng (BR-06).</summary>
    [HttpDelete("{id:int}")]
    [RequirePermission("BOM_DELETE")]
    [RequireFeature("feat-bom")]
    public async Task<IActionResult> DeleteBom(int id)
    {
        var result = await _mediator.Send(new DeleteBomCommand(id));
        return result.IsSuccess ? Ok(new { message = "Đã xoá BOM." }) : BadRequest(new { message = result.Error });
    }
}
