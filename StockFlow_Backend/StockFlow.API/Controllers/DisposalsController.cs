using MediatR;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.Disposals.Commands;
using StockFlow.Application.Features.Disposals.DTOs;
using StockFlow.Application.Features.Disposals.Queries;

namespace StockFlow.API.Controllers;

/// <summary>Xuất hủy hàng hóa (hàng lỗi, hỏng...): phiếu tạm và hoàn thành (trừ tồn kho).</summary>
[ApiController]
[Route("api/[controller]")]
public class DisposalsController : ControllerBase
{
    private readonly IMediator _mediator;

    public DisposalsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private static List<T> ParseCsv<T>(string? csv, Func<string, (bool ok, T value)> parse)
    {
        if (string.IsNullOrWhiteSpace(csv)) return new List<T>();
        return csv.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => parse(s.Trim()))
            .Where(x => x.ok)
            .Select(x => x.value)
            .ToList();
    }

    /// <summary>Danh sách phiếu xuất hủy (lọc theo kho, trạng thái DRAFT/COMPLETED, ngày hủy).</summary>
    [HttpGet]
    [RequirePermission("STOCK_READ")]
    [RequireFeature("feat-disposal")]
    public async Task<IActionResult> GetList(
        [FromQuery] string? warehouseIds,
        [FromQuery] string? statuses,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _mediator.Send(new GetDisposalsQuery(
            ParseCsv(warehouseIds, s => (int.TryParse(s, out var v), v)),
            ParseCsv(statuses, s => (s.Length > 0, s)),
            fromDate, toDate));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Chi tiết phiếu xuất hủy (mở từ danh sách hoặc từ Thẻ kho ở màn Hàng hóa).</summary>
    [HttpGet("{id:int}")]
    [RequirePermission("STOCK_READ")]
    [RequireFeature("feat-disposal", "feat-goods")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetDisposalByIdQuery(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Tạo phiếu xuất hủy: Status DRAFT = Lưu tạm, COMPLETED = Hoàn thành (trừ tồn kho).</summary>
    [HttpPost]
    [RequirePermission("STOCK_CREATE")]
    [RequireFeature("feat-disposal")]
    public async Task<IActionResult> Create([FromBody] SaveDisposalRequest request)
    {
        var result = await _mediator.Send(new CreateDisposalCommand(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Nhân viên chọn làm "Người xuất hủy": đang hoạt động, được phân quyền kho của phiếu.</summary>
    [HttpGet("staff-options")]
    [RequirePermission("STOCK_READ")]
    [RequireFeature("feat-disposal")]
    public async Task<IActionResult> GetStaffOptions([FromQuery] int warehouseId)
    {
        var result = await _mediator.Send(new GetDisposalStaffOptionsQuery(warehouseId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Nút "Lưu" ở chi tiết phiếu: người xuất hủy, ngày xuất hủy (phiếu tạm), ghi chú.</summary>
    [HttpPut("{id:int}/info")]
    [RequirePermission("STOCK_UPDATE")]
    [RequireFeature("feat-disposal")]
    public async Task<IActionResult> UpdateInfo(int id, [FromBody] UpdateDisposalInfoRequest request)
    {
        var result = await _mediator.Send(new UpdateDisposalInfoCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Hủy/xóa phiếu xuất hủy (hỗ trợ POST/PATCH/DELETE /cancel hoặc DELETE /{id}): phiếu tạm đổi trạng thái, phiếu hoàn thành được hoàn tồn kho.</summary>
    [HttpPost("{id:int}/cancel")]
    [HttpPatch("{id:int}/cancel")]
    [HttpDelete("{id:int}/cancel")]
    [HttpDelete("{id:int}")]
    [RequirePermission("STOCK_UPDATE")]
    [RequireFeature("feat-disposal")]
    public async Task<IActionResult> Cancel(int id)
    {
        var result = await _mediator.Send(new CancelDisposalCommand(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Sửa phiếu tạm; Status COMPLETED thì hoàn thành phiếu (trừ tồn kho).</summary>
    [HttpPut("{id:int}")]
    [RequirePermission("STOCK_UPDATE")]
    [RequireFeature("feat-disposal")]
    public async Task<IActionResult> Update(int id, [FromBody] SaveDisposalRequest request)
    {
        var result = await _mediator.Send(new UpdateDisposalCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }
}
