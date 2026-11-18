using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.Production.Commands;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Queries;
using StockFlow.Application.Features.Roles.Common;

namespace StockFlow.API.Controllers;

/// <summary>
/// Hoạch định nhu cầu nguyên vật liệu (MRP - Material Requirements Planning).
/// Route: api/production/mrp
/// </summary>
[ApiController]
[Route("api/production/mrp")]
public class MrpController : ControllerBase
{
    private const string MrpFeature = FeatureConstants.ProductionMrp;
    private readonly IMediator _mediator;

    public MrpController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Chạy tính toán MRP và lưu lần chạy mới.</summary>
    [HttpPost("runs")]
    [ProducesResponseType(typeof(MrpRunSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("PROD_UPDATE")]
    [RequireFeature(MrpFeature, FeatureConstants.ProductionPlans, FeatureConstants.ProductionPlanApproval)]
    public async Task<IActionResult> RunMrp([FromBody] RunMrpRequest request)
    {
        var result = await _mediator.Send(new RunMrpCommand(request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>Lịch sử các lần chạy MRP.</summary>
    [HttpGet("runs")]
    [ProducesResponseType(typeof(List<MrpRunListItemDto>), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature(MrpFeature, FeatureConstants.ProductionPlans, FeatureConstants.ProductionPlanApproval)]
    public async Task<IActionResult> GetRuns(
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        [FromQuery] int? warehouseId)
    {
        var result = await _mediator.Send(new GetMrpRunsQuery(fromDate, toDate, warehouseId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Tổng quan chi tiết một lần chạy MRP.</summary>
    [HttpGet("runs/{id:int}")]
    [ProducesResponseType(typeof(MrpRunSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("PROD_READ")]
    [RequireFeature(MrpFeature, FeatureConstants.ProductionPlans, FeatureConstants.ProductionPlanApproval)]
    public async Task<IActionResult> GetRunSummary(int id)
    {
        var result = await _mediator.Send(new GetMrpRunSummaryQuery(id));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>Nhu cầu nguyên vật liệu chi tiết theo ngày.</summary>
    [HttpGet("runs/{id:int}/daily-requirements")]
    [ProducesResponseType(typeof(List<MrpDailyRequirementDto>), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature(MrpFeature, FeatureConstants.ProductionPlans, FeatureConstants.ProductionPlanApproval)]
    public async Task<IActionResult> GetDailyRequirements(
        int id,
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        [FromQuery] int? materialId)
    {
        var result = await _mediator.Send(new GetMrpDailyRequirementsQuery(id, fromDate, toDate, materialId));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>Nhu cầu nguyên vật liệu tổng hợp theo Tháng hoặc Tuần.</summary>
    [HttpGet("runs/{id:int}/monthly-demand")]
    [ProducesResponseType(typeof(MrpMonthlyDemandDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature(MrpFeature, FeatureConstants.ProductionPlans, FeatureConstants.ProductionPlanApproval)]
    public async Task<IActionResult> GetMonthlyDemand(
        int id,
        [FromQuery] string bucket = "month")
    {
        var result = await _mediator.Send(new GetMrpMonthlyDemandQuery(id, bucket));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>Danh sách các nguyên vật liệu bị thiếu hụt.</summary>
    [HttpGet("runs/{id:int}/shortages")]
    [ProducesResponseType(typeof(List<MrpShortageDto>), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature(MrpFeature, FeatureConstants.ProductionPlans, FeatureConstants.ProductionPlanApproval)]
    public async Task<IActionResult> GetShortages(
        int id,
        [FromQuery] bool lateOnly = false)
    {
        var result = await _mediator.Send(new GetMrpShortagesQuery(id, lateOnly));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>Bảng tiến trình tồn dự phóng của một nguyên vật liệu cụ thể.</summary>
    [HttpGet("runs/{id:int}/materials/{materialId:int}/projection")]
    [ProducesResponseType(typeof(MrpProjectionDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature(MrpFeature, FeatureConstants.ProductionPlans, FeatureConstants.ProductionPlanApproval)]
    public async Task<IActionResult> GetProjection(int id, int materialId)
    {
        var result = await _mediator.Send(new GetMrpProjectionQuery(id, materialId));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>Danh sách đề xuất đặt mua hàng nguyên vật liệu.</summary>
    [HttpGet("runs/{id:int}/purchase-suggestions")]
    [ProducesResponseType(typeof(List<MrpPurchaseSuggestionDto>), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature(MrpFeature, FeatureConstants.ProductionPlans, FeatureConstants.ProductionPlanApproval)]
    public async Task<IActionResult> GetPurchaseSuggestions(
        int id,
        [FromQuery] string? status)
    {
        var result = await _mediator.Send(new GetMrpPurchaseSuggestionsQuery(id, status));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }
}
