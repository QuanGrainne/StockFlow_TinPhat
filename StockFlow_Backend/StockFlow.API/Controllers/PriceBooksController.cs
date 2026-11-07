using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.PriceBooks.Commands;
using StockFlow.Application.Features.PriceBooks.DTOs;
using StockFlow.Application.Features.PriceBooks.Queries;
using StockFlow.API.Authorization;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/price-books")]
public class PriceBooksController : ControllerBase
{
    private readonly IMediator _mediator;

    public PriceBooksController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Lấy danh sách các bảng giá (hỗ trợ tìm kiếm, lọc trạng thái, lọc theo kho).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PriceBookDto>), StatusCodes.Status200OK)]
    [RequirePermission("GOODS_READ")]
    [RequireFeature("feat-price-books", "feat-pos", "feat-invoices", "feat-goods")]
    public async Task<IActionResult> GetPriceBooks(
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] int? warehouseId)
    {
        var result = await _mediator.Send(new GetPriceBooksQuery(search, isActive, warehouseId));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy chi tiết thông tin một bảng giá.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PriceBookDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [RequirePermission("GOODS_READ")]
    [RequireFeature("feat-price-books")]
    public async Task<IActionResult> GetPriceBookById(int id)
    {
        var result = await _mediator.Send(new GetPriceBookByIdQuery(id));
        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Tạo mới bảng giá kèm công thức tự động và phạm vi áp dụng.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PriceBookDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("GOODS_CREATE")]
    [RequireFeature("feat-price-books")]
    public async Task<IActionResult> CreatePriceBook([FromBody] CreatePriceBookCommand command)
    {
        var result = await _mediator.Send(command);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return CreatedAtAction(nameof(GetPriceBookById), new { id = result.Value!.PriceBookId }, result.Value);
    }

    /// <summary>
    /// Cập nhật thông tin bảng giá, hiệu lực, công thức hoặc phạm vi.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(PriceBookDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("GOODS_UPDATE")]
    [RequireFeature("feat-price-books")]
    public async Task<IActionResult> UpdatePriceBook(int id, [FromBody] UpdatePriceBookCommand command)
    {
        if (id != command.PriceBookId)
        {
            return BadRequest(new { message = "ID trong route không khớp với body." });
        }

        var result = await _mediator.Send(command);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Xóa một bảng giá (không được xóa bảng giá chung mặc định).
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("GOODS_DELETE")]
    [RequireFeature("feat-price-books")]
    public async Task<IActionResult> DeletePriceBook(int id)
    {
        var result = await _mediator.Send(new DeletePriceBookCommand(id));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return NoContent();
    }

    /// <summary>
    /// Lấy dữ liệu ma trận giá: danh sách hàng hóa kèm Giá vốn, Giá nhập cuối (theo kho) và giá các bảng giá.
    /// </summary>
    [HttpGet("matrix")]
    [ProducesResponseType(typeof(PriceBookMatrixResultDto), StatusCodes.Status200OK)]
    [RequirePermission("GOODS_READ")]
    [RequireFeature("feat-price-books", "feat-pos", "feat-invoices", "feat-goods")]
    public async Task<IActionResult> GetPriceMatrix(
        [FromQuery] int? warehouseId,
        [FromQuery] string? search,
        [FromQuery] int? categoryId,
        [FromQuery] string? stockCondition,
        [FromQuery] string? priceBookIds,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        List<int>? ids = null;
        if (!string.IsNullOrWhiteSpace(priceBookIds))
        {
            ids = priceBookIds
                .Split(',', System.StringSplitOptions.RemoveEmptyEntries)
                .Select(s => int.TryParse(s.Trim(), out var val) ? val : 0)
                .Where(v => v > 0)
                .ToList();
        }

        var result = await _mediator.Send(new GetPriceBookMatrixQuery(
            warehouseId,
            search,
            categoryId,
            stockCondition,
            ids,
            page,
            pageSize
        ));

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Cập nhật giá bán sản phẩm trong bảng giá (dùng cho inline edit trên bảng).
    /// </summary>
    [HttpPut("{id:int}/prices")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("GOODS_UPDATE")]
    [RequireFeature("feat-price-books")]
    public async Task<IActionResult> UpdatePrices(int id, [FromBody] List<UpdateProductPriceItemDto> items)
    {
        var result = await _mediator.Send(new UpdatePriceBookPricesCommand(id, items));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { success = true, message = "Đã lưu thay đổi giá thành công." });
    }

    public record ApplyFormulaRequestDto(List<int>? CategoryIds = null, bool AllProducts = false);

    /// <summary>
    /// Tính toán và áp dụng lại công thức giá cho tất cả sản phẩm hoặc theo nhóm hàng trong bảng giá.
    /// </summary>
    [HttpPost("{id:int}/apply-formula")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("GOODS_UPDATE")]
    [RequireFeature("feat-price-books")]
    public async Task<IActionResult> ApplyFormula(int id, [FromBody] ApplyFormulaRequestDto? body = null)
    {
        var result = await _mediator.Send(new ApplyPriceBookFormulaCommand(id, body?.CategoryIds, body?.AllProducts ?? false));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { success = true, message = "Đã tính lại toàn bộ giá theo công thức thành công." });
    }
}
