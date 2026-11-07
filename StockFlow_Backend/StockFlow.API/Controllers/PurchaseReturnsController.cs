using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.PurchaseReturns.Commands;
using StockFlow.Application.Features.PurchaseReturns.DTOs;
using StockFlow.Application.Features.PurchaseReturns.Queries;

namespace StockFlow.API.Controllers;

/// <summary>Trả hàng nhập (trả hàng cho nhà cung cấp) — thuộc phân hệ Mua hàng.</summary>
[ApiController]
[Route("api/[controller]")]
public class PurchaseReturnsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PurchaseReturnsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private static List<T>? SplitList<T>(string? raw, Func<string, T?> parse) where T : struct =>
        string.IsNullOrWhiteSpace(raw)
            ? null
            : raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(parse).Where(v => v.HasValue).Select(v => v!.Value).ToList();

    /// <summary>Danh sách phiếu trả hàng nhập (lọc kho, trạng thái, thời gian, từ khóa, phiếu nhập gốc).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PurchaseReturnListDto>), StatusCodes.Status200OK)]
    [RequirePermission("PURCHASE_READ")]
    [RequireFeature("feat-purchase-returns")]
    public async Task<IActionResult> GetList(
        [FromQuery] string? warehouseIds,
        [FromQuery] string? statuses,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? search,
        [FromQuery] int? grId)
    {
        var whIds = SplitList<int>(warehouseIds, s => int.TryParse(s, out var v) && v > 0 ? v : null);
        var statusList = string.IsNullOrWhiteSpace(statuses)
            ? null
            : statuses.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

        var result = await _mediator.Send(new GetPurchaseReturnsQuery(whIds, statusList, fromDate, toDate, search, grId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PurchaseReturnDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PURCHASE_READ")]
    [RequireFeature("feat-purchase-returns", "feat-purchase", "feat-suppliers", "feat-goods")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetPurchaseReturnByIdQuery(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Dữ liệu phiếu nhập để lập phiếu trả (SL đã nhập / đã trả / còn được trả từng dòng).</summary>
    [HttpGet("source/{grId:int}")]
    [ProducesResponseType(typeof(ReturnSourceDto), StatusCodes.Status200OK)]
    [RequirePermission("PURCHASE_READ")]
    [RequireFeature("feat-purchase-returns")]
    public async Task<IActionResult> GetSource(int grId, [FromQuery] int? excludeReturnId)
    {
        var result = await _mediator.Send(new GetPurchaseReturnSourceQuery(grId, excludeReturnId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpPost]
    [ProducesResponseType(typeof(PurchaseReturnDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PURCHASE_CREATE")]
    [RequireFeature("feat-purchase-returns")]
    public async Task<IActionResult> Create([FromBody] SavePurchaseReturnRequest request)
    {
        var result = await _mediator.Send(new CreatePurchaseReturnCommand(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Sửa phiếu tạm (Status = COMPLETED để hoàn thành luôn).</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(PurchaseReturnDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PURCHASE_UPDATE")]
    [RequireFeature("feat-purchase-returns")]
    public async Task<IActionResult> Update(int id, [FromBody] SavePurchaseReturnRequest request)
    {
        var result = await _mediator.Send(new UpdatePurchaseReturnCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Nhà cung cấp trả tiền cho phiếu trả hàng nhập (phiếu thu PT...).</summary>
    [HttpPost("{id:int}/refunds")]
    [ProducesResponseType(typeof(PurchaseReturnDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("FIN_CREATE")]
    [RequireFeature("feat-purchase-returns")]
    public async Task<IActionResult> CreateRefund(int id, [FromBody] CreateSupplierRefundRequest request)
    {
        var result = await _mediator.Send(new CreateSupplierRefundCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpPatch("{id:int}/cancel")]
    [RequirePermission("PURCHASE_UPDATE")]
    [RequireFeature("feat-purchase-returns")]
    public async Task<IActionResult> Cancel(int id)
    {
        var result = await _mediator.Send(new CancelPurchaseReturnCommand(id));
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(new { message = result.Error });
    }
}
