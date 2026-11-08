using MediatR;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.SalesBookings.Commands;
using StockFlow.Application.Features.SalesBookings.DTOs;
using StockFlow.Application.Features.SalesBookings.Queries;

namespace StockFlow.API.Controllers;

/// <summary>
/// Đặt hàng (đơn đặt của khách, UC-14 / UC-19): tạo, sửa, xác nhận, hủy, kết thúc, gộp đơn.
/// Đơn đặt không trừ tồn kho; giao hàng bằng cách tạo hóa đơn từ đơn ở màn Bán hàng (POST /api/orders/pos với bookingOrderId).
/// </summary>
[ApiController]
[Route("api/sales-bookings")]
public class SalesBookingsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SalesBookingsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [RequirePermission("SALES_READ")]
    [RequireFeature("feat-sales-booking")]
    public async Task<IActionResult> GetBookings(
        [FromQuery] string? warehouseIds,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int? partnerId,
        [FromQuery] string? search)
    {
        var ids = (warehouseIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => int.TryParse(s, out var n) ? n : 0).Where(n => n > 0).ToList();
        var statuses = (status ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => s.ToUpperInvariant()).ToList();
        var result = await _mediator.Send(new GetSalesBookingsQuery(ids, statuses, fromDate, toDate, partnerId, search));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Hàng khách đặt tại chi nhánh (SL đặt chưa giao) — POS hiển thị cột "Khách đặt"</summary>
    [HttpGet("reserved")]
    [RequirePermission("SALES_READ")]
    [RequireFeature("feat-sales-booking", "feat-pos")]
    public async Task<IActionResult> GetReserved([FromQuery] int warehouseId)
    {
        var result = await _mediator.Send(new GetReservedQuantitiesQuery(warehouseId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpGet("{id:int}")]
    [RequirePermission("SALES_READ")]
    [RequireFeature("feat-sales-booking", "feat-pos", "feat-invoices", "feat-customers")]
    public async Task<IActionResult> GetBooking(int id)
    {
        var result = await _mediator.Send(new GetSalesBookingByIdQuery(id));
        return result.IsSuccess ? Ok(result.Value) : NotFound(new { message = result.Error });
    }

    [HttpPost]
    [RequirePermission("SALES_CREATE")]
    [RequireFeature("feat-sales-booking")]
    public async Task<IActionResult> CreateBooking([FromBody] SaveSalesBookingRequest request)
    {
        var result = await _mediator.Send(new SaveSalesBookingCommand(null, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpPut("{id:int}")]
    [RequirePermission("SALES_UPDATE")]
    [RequireFeature("feat-sales-booking")]
    public async Task<IActionResult> UpdateBooking(int id, [FromBody] SaveSalesBookingRequest request)
    {
        var result = await _mediator.Send(new SaveSalesBookingCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpPost("{id:int}/confirm")]
    [RequirePermission("SALES_UPDATE")]
    [RequireFeature("feat-sales-booking")]
    public Task<IActionResult> Confirm(int id) => RunAction(id, "CONFIRM");

    /// <summary>
    /// Hủy đơn chưa giao. keepDeposit=false: hoàn tiền trả trước (phiếu thu hủy, công nợ tăng lại);
    /// keepDeposit=true: giữ tiền làm khoản khách trả trước.
    /// </summary>
    [HttpPost("{id:int}/cancel")]
    [RequirePermission("SALES_DELETE")]
    [RequireFeature("feat-sales-booking")]
    public Task<IActionResult> Cancel(int id, [FromQuery] bool keepDeposit = false) => RunAction(id, "CANCEL", keepDeposit);

    /// <summary>Kết thúc đơn đang giao 1 phần: không giao phần còn lại</summary>
    [HttpPost("{id:int}/finish")]
    [RequirePermission("SALES_UPDATE")]
    [RequireFeature("feat-sales-booking")]
    public Task<IActionResult> Finish(int id) => RunAction(id, "FINISH");

    /// <summary>Gộp các đơn cùng khách, cùng chi nhánh, chưa giao thành 1 đơn mới; đơn gốc chuyển Đã hủy (BR-09)</summary>
    [HttpPost("merge")]
    [RequirePermission("SALES_UPDATE")]
    [RequireFeature("feat-sales-booking")]
    public async Task<IActionResult> Merge([FromBody] MergeSalesBookingsRequest request)
    {
        var result = await _mediator.Send(new MergeSalesBookingsCommand(request.OrderIds));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    private async Task<IActionResult> RunAction(int id, string action, bool keepDeposit = false)
    {
        var result = await _mediator.Send(new SalesBookingActionCommand(id, action, keepDeposit));
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(new { message = result.Error });
    }
}

public record MergeSalesBookingsRequest(List<int> OrderIds);
