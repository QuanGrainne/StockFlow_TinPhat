using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.Reports.DTOs;
using StockFlow.Application.Features.Reports.Queries;

namespace StockFlow.API.Controllers;

/// <summary>
/// Báo cáo cho Manager (UC-86, 87, 88, 90). Chỉ đọc dữ liệu.
/// Cần quyền FIN_READ và chức năng "Báo cáo" (feat-reports); số liệu theo kho lọc theo kho được phân quyền (BR-04).
/// </summary>
[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ReportsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>UC-90 – Báo cáo tổng quan theo kỳ (from, to dạng yyyy-MM-dd) và kho (tùy chọn).</summary>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(DashboardSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("FIN_READ")]
    [RequireFeature("feat-reports")]
    public async Task<IActionResult> GetDashboard([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] int? warehouseId)
    {
        var result = await _mediator.Send(new GetDashboardSummaryQuery(from, to, warehouseId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }
}
