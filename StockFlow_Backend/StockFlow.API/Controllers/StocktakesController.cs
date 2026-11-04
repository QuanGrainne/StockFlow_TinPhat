using MediatR;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.Stocktakes.Commands;
using StockFlow.Application.Features.Stocktakes.DTOs;
using StockFlow.Application.Features.Stocktakes.Queries;

namespace StockFlow.API.Controllers;

/// <summary>Kiểm kho: phiếu kiểm, cân bằng kho, hủy và gộp phiếu.</summary>
[ApiController]
[Route("api/[controller]")]
public class StocktakesController : ControllerBase
{
    private readonly IMediator _mediator;

    public StocktakesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private static List<T>? ParseCsv<T>(string? csv, Func<string, (bool ok, T value)> parse)
    {
        if (string.IsNullOrWhiteSpace(csv)) return null;
        return csv.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => parse(s.Trim()))
            .Where(x => x.ok)
            .Select(x => x.value)
            .ToList();
    }

    /// <summary>Danh sách phiếu kiểm kho (lọc theo kho, trạng thái, ngày tạo, mã phiếu).</summary>
    [HttpGet]
    [RequirePermission("STOCK_READ")]
    public async Task<IActionResult> GetList(
        [FromQuery] string? warehouseIds,
        [FromQuery] string? statuses,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? search)
    {
        var result = await _mediator.Send(new GetStocktakesQuery(
            ParseCsv(warehouseIds, s => (int.TryParse(s, out var v), v)),
            ParseCsv(statuses, s => (s.Length > 0, s)),
            fromDate, toDate, search));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpGet("{id:int}")]
    [RequirePermission("STOCK_READ")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetStocktakeByIdQuery(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Tạo phiếu kiểm: Status DRAFT = Lưu tạm, BALANCED = Hoàn thành (cân bằng kho).</summary>
    [HttpPost]
    [RequirePermission("STOCK_CREATE")]
    public async Task<IActionResult> Create([FromBody] SaveStocktakeRequest request)
    {
        var result = await _mediator.Send(new CreateStocktakeCommand(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Sửa phiếu tạm (có thể Hoàn thành luôn).</summary>
    [HttpPut("{id:int}")]
    [RequirePermission("STOCK_UPDATE")]
    public async Task<IActionResult> Update(int id, [FromBody] SaveStocktakeRequest request)
    {
        var result = await _mediator.Send(new UpdateStocktakeCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Hủy phiếu (phiếu đã cân bằng sẽ được đảo lại tồn kho).</summary>
    [HttpPost("{id:int}/cancel")]
    [RequirePermission("STOCK_UPDATE")]
    public async Task<IActionResult> Cancel(int id)
    {
        var result = await _mediator.Send(new CancelStocktakeCommand(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Gộp các phiếu tạm cùng kho thành 1 phiếu tạm mới; phiếu cũ chuyển sang Đã hủy.</summary>
    [HttpPost("merge")]
    [RequirePermission("STOCK_CREATE")]
    public async Task<IActionResult> Merge([FromBody] MergeStocktakesRequest request)
    {
        var result = await _mediator.Send(new MergeStocktakesCommand(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }
}
