using MediatR;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.SalesReturns.Commands;
using StockFlow.Application.Features.SalesReturns.DTOs;
using StockFlow.Application.Features.SalesReturns.Queries;

namespace StockFlow.API.Controllers;

/// <summary>Trả hàng (khách trả lại hàng đã mua theo hóa đơn — UC-23, BR-18/19/20).</summary>
[ApiController]
[Route("api/sales-returns")]
public class SalesReturnsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SalesReturnsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [RequirePermission("SALES_READ")]
    [RequireFeature("feat-sales-returns")]
    public async Task<IActionResult> GetReturns(
        [FromQuery] string? warehouseIds,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? search)
    {
        var ids = (warehouseIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => int.TryParse(s, out var n) ? n : 0).Where(n => n > 0).ToList();
        var statuses = (status ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => s.ToUpperInvariant()).ToList();
        var result = await _mediator.Send(new GetSalesReturnsQuery(ids, statuses, fromDate, toDate, search));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpGet("{id:int}")]
    [RequirePermission("SALES_READ")]
    [RequireFeature("feat-sales-returns", "feat-invoices", "feat-customers", "feat-goods")]
    public async Task<IActionResult> GetReturn(int id)
    {
        var result = await _mediator.Send(new GetSalesReturnByIdQuery(id));
        return result.IsSuccess ? Ok(result.Value) : NotFound(new { message = result.Error });
    }

    /// <summary>Hàng của hóa đơn gốc kèm SL còn được trả (mở tab Trả hàng ở màn Bán hàng)</summary>
    [HttpGet("source/{invoiceId:int}")]
    [RequirePermission("SALES_READ")]
    [RequireFeature("feat-sales-returns")]
    public async Task<IActionResult> GetSource(int invoiceId)
    {
        var result = await _mediator.Send(new GetSalesReturnSourceQuery(invoiceId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpPost]
    [RequirePermission("SALES_CREATE")]
    [RequireFeature("feat-sales-returns")]
    public async Task<IActionResult> CreateReturn([FromBody] CreateSalesReturnRequest request)
    {
        var result = await _mediator.Send(new CreateSalesReturnCommand(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpPost("{id:int}/cancel")]
    [RequirePermission("SALES_DELETE")]
    [RequireFeature("feat-sales-returns")]
    public async Task<IActionResult> CancelReturn(int id)
    {
        var result = await _mediator.Send(new CancelSalesReturnCommand(id));
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(new { message = result.Error });
    }

    /// <summary>Trả thêm tiền cho khách (phần chưa trả lúc trả hàng)</summary>
    [HttpPost("{id:int}/refunds")]
    [RequirePermission("SALES_UPDATE")]
    [RequireFeature("feat-sales-returns")]
    public async Task<IActionResult> AddRefund(int id, [FromBody] AddSalesReturnRefundRequest request)
    {
        var result = await _mediator.Send(new AddSalesReturnRefundCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpPatch("{id:int}/notes")]
    [RequirePermission("SALES_UPDATE")]
    [RequireFeature("feat-sales-returns")]
    public async Task<IActionResult> UpdateNotes(int id, [FromBody] UpdateSalesReturnNotesRequest request)
    {
        var result = await _mediator.Send(new UpdateSalesReturnNotesCommand(id, request.Notes));
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(new { message = result.Error });
    }
}

public record UpdateSalesReturnNotesRequest(string? Notes);
