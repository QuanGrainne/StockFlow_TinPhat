using MediatR;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Common;
using StockFlow.Application.Features.PurchaseOrders.Commands;
using StockFlow.Application.Features.PurchaseOrders.DTOs;
using StockFlow.Application.Features.PurchaseOrders.Queries;

namespace StockFlow.API.Controllers;

/// <summary>Phiếu đặt hàng nhập: đặt trước với NCC, đối chiếu số lượng đặt ↔ thực nhập.</summary>
[ApiController]
[Route("api/purchase-orders")]
public class PurchaseOrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public PurchaseOrdersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [RequirePermission("PURCHASE_READ")]
    [RequireFeature("feat-purchase-orders")]
    public async Task<IActionResult> GetPurchaseOrders(
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

        var result = await _mediator.Send(new GetPurchaseOrdersQuery(ids, statuses, fromDate, toDate, partnerId, search));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpGet("{id:int}")]
    [RequirePermission("PURCHASE_READ")]
    [RequireFeature("feat-purchase-orders", "feat-purchase")]
    public async Task<IActionResult> GetPurchaseOrder(int id)
    {
        var result = await _mediator.Send(new GetPurchaseOrderByIdQuery(id));
        return result.IsSuccess ? Ok(result.Value) : NotFound(new { message = result.Error });
    }

    [HttpGet("by-code/{code}")]
    [RequirePermission("PURCHASE_READ")]
    [RequireFeature("feat-purchase-orders", "feat-purchase")]
    public async Task<IActionResult> GetPurchaseOrderByCode(string code)
    {
        var result = await _mediator.Send(new GetPurchaseOrderByIdQuery(0, code.Trim()));
        return result.IsSuccess ? Ok(result.Value) : NotFound(new { message = result.Error });
    }

    [HttpPost]
    [RequirePermission("PURCHASE_CREATE")]
    [RequireFeature("feat-purchase-orders")]
    public async Task<IActionResult> CreatePurchaseOrder([FromBody] CreatePurchaseOrderRequest request) =>
        ToResponse(await _mediator.Send(new CreatePurchaseOrderCommand(request)));

    [HttpPut("{id:int}")]
    [RequirePermission("PURCHASE_UPDATE")]
    [RequireFeature("feat-purchase-orders")]
    public async Task<IActionResult> UpdatePurchaseOrder(int id, [FromBody] UpdatePurchaseOrderRequest request) =>
        ToResponse(await _mediator.Send(new UpdatePurchaseOrderCommand(id, request)));

    [HttpPost("{id:int}/cancel")]
    [RequirePermission("PURCHASE_UPDATE")]
    [RequireFeature("feat-purchase-orders")]
    public async Task<IActionResult> CancelPurchaseOrder(int id)
    {
        var result = await _mediator.Send(new CancelPurchaseOrderCommand(id));
        return result.IsSuccess ? Ok(new { message = "Đã hủy phiếu đặt hàng nhập." }) : BadRequest(new { message = result.Error });
    }

    [HttpPost("{id:int}/finish")]
    [RequirePermission("PURCHASE_UPDATE")]
    [RequireFeature("feat-purchase-orders")]
    public async Task<IActionResult> FinishPurchaseOrder(int id)
    {
        var result = await _mediator.Send(new FinishPurchaseOrderCommand(id));
        return result.IsSuccess ? Ok(new { message = "Đã kết thúc phiếu đặt hàng nhập." }) : BadRequest(new { message = result.Error });
    }

    /// <summary>
    /// Nhập hàng ngay trong phiếu đặt: tự sinh phiếu nhập Hoàn thành (SL đạt vào kho, SL lỗi chỉ ghi nhận),
    /// cộng tồn + giá vốn BQ gia quyền, công nợ NCC và cập nhật trạng thái phiếu đặt.
    /// </summary>
    [HttpPost("{id:int}/receive")]
    [RequirePermission("PURCHASE_CREATE")]
    [RequireFeature("feat-purchase-orders", "feat-purchase")]
    public async Task<IActionResult> ReceivePurchaseOrder(int id, [FromBody] ReceivePurchaseOrderRequest request)
    {
        var result = await _mediator.Send(new ReceivePurchaseOrderCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpPatch("{id:int}/notes")]
    [RequirePermission("PURCHASE_UPDATE")]
    [RequireFeature("feat-purchase-orders")]
    public async Task<IActionResult> UpdateNotes(int id, [FromBody] UpdatePurchaseOrderNotesRequest request)
    {
        var result = await _mediator.Send(new UpdatePurchaseOrderNotesCommand(id, request.Notes));
        return result.IsSuccess ? Ok(new { message = "Đã lưu phiếu đặt hàng nhập." }) : BadRequest(new { message = result.Error });
    }

    /// <summary>Gộp các phiếu cùng NCC, cùng kho thành 1 phiếu mới; phiếu gốc chuyển Đã hủy.</summary>
    [HttpPost("merge")]
    [RequirePermission("PURCHASE_UPDATE")]
    [RequireFeature("feat-purchase-orders")]
    public async Task<IActionResult> MergePurchaseOrders([FromBody] MergePurchaseOrdersRequest request) =>
        ToResponse(await _mediator.Send(new MergePurchaseOrdersCommand(request.PoIds)));

    private IActionResult ToResponse(Result<int> result) =>
        result.IsSuccess ? Ok(new { poId = result.Value }) : BadRequest(new { message = result.Error });
}
