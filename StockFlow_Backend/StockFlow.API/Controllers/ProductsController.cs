using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.Products.Commands;
using StockFlow.Application.Features.Products.DTOs;
using StockFlow.Application.Features.Products.Queries;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class ProductsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Lấy danh sách hàng hóa (hỗ trợ tìm kiếm theo mã/tên, phân loại TP/NVL, theo danh mục, kho, và cảnh báo tồn thấp).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ProductDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetProducts(
        [FromQuery] string? search,
        [FromQuery] string? type,
        [FromQuery] int? categoryId,
        [FromQuery] int? warehouseId,
        [FromQuery] bool? lowStockOnly,
        [FromQuery] string? status)
    {
        var result = await _mediator.Send(new GetProductsQuery(search, type, categoryId, warehouseId, lowStockOnly, status));
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("không có quyền") == true)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = result.Error });
            }
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy chi tiết thông tin hàng hóa kèm tồn kho phân bổ theo từng kho vật lý.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ProductDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProductById(int id)
    {
        var result = await _mediator.Send(new GetProductByIdQuery(id));
        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Thêm mới một mặt hàng vào danh mục hàng hóa (tự động phân giải nhóm danh mục & đơn vị tính nếu cần).
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ProductDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest request)
    {
        var result = await _mediator.Send(new CreateProductCommand(request));
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("không có quyền") == true)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = result.Error });
            }
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Cập nhật thông tin hàng hóa (mã, tên, phân loại, giá vốn, định mức tồn kho, mô tả, trạng thái).
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(ProductDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateProduct(int id, [FromBody] UpdateProductRequest request)
    {
        var result = await _mediator.Send(new UpdateProductCommand(id, request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Đổi trạng thái kích hoạt / tạm ngưng của hàng hóa.
    /// </summary>
    [HttpPatch("{id}/toggle-status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ToggleProductStatus(int id)
    {
        var result = await _mediator.Send(new ToggleProductStatusCommand(id));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { isActive = result.Value });
    }

    /// <summary>
    /// Xóa hàng hóa hoặc vô hiệu hóa nếu đã có số liệu tồn kho/giao dịch.
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var result = await _mediator.Send(new DeleteProductCommand(id));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { success = true });
    }

    /// <summary>
    /// Lấy danh sách nhóm danh mục hàng hóa (Categories).
    /// </summary>
    [HttpGet("categories")]
    [ProducesResponseType(typeof(List<ProductCategoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProductCategories()
    {
        var result = await _mediator.Send(new GetProductCategoriesQuery());
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy danh sách đơn vị tính đo lường (Units of Measure).
    /// </summary>
    [HttpGet("units")]
    [ProducesResponseType(typeof(List<ProductUnitDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProductUnits()
    {
        var result = await _mediator.Send(new GetProductUnitsQuery());
        return Ok(result.Value);
    }
}
