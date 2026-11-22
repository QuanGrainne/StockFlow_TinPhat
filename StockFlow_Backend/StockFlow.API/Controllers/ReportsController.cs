using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.Reports.DTOs;
using StockFlow.Application.Features.Reports.Queries;
using StockFlow.Application.Features.Roles.Common;

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
    [RequireFeature(FeatureConstants.Reports)]
    public async Task<IActionResult> GetDashboard([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] int? warehouseId)
    {
        var result = await _mediator.Send(new GetDashboardSummaryQuery(from, to, warehouseId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>UC-88 – Báo cáo doanh thu và lợi nhuận; groupBy = DAY | PRODUCT | CUSTOMER, phân trang phía server.</summary>
    [HttpGet("revenue-profit")]
    [ProducesResponseType(typeof(RevenueProfitReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("FIN_READ")]
    [RequireFeature(FeatureConstants.Reports)]
    public async Task<IActionResult> GetRevenueProfit(
        [FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] int? warehouseId, [FromQuery] int? categoryId,
        [FromQuery] string groupBy = RevenueProfitGroupBy.Day, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var result = await _mediator.Send(new GetRevenueProfitReportQuery(from, to, warehouseId, categoryId, groupBy, page, pageSize));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>UC-87 – Báo cáo nhập – xuất – tồn theo kho và kỳ (từ thẻ kho); onlyMismatch = chỉ dòng lệch.</summary>
    [HttpGet("stock-movement")]
    [ProducesResponseType(typeof(StockMovementReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("FIN_READ")]
    [RequireFeature(FeatureConstants.Reports)]
    public async Task<IActionResult> GetStockMovement(
        [FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] int? warehouseId, [FromQuery] int? categoryId,
        [FromQuery] bool onlyMismatch = false, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var result = await _mediator.Send(new GetStockMovementReportQuery(from, to, warehouseId, categoryId, onlyMismatch, page, pageSize));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>UC-86 – Báo cáo công nợ; type = RECEIVABLE (phải thu khách) | PAYABLE (phải trả NCC). Không lọc theo kho.</summary>
    [HttpGet("debts")]
    [ProducesResponseType(typeof(DebtReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("FIN_READ")]
    [RequireFeature(FeatureConstants.Reports)]
    public async Task<IActionResult> GetDebts(
        [FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] string type = DebtReportType.Receivable,
        [FromQuery] string? search = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var result = await _mediator.Send(new GetDebtReportQuery(from, to, type, search, page, pageSize));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }
}
