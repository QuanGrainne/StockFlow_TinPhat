using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.Products.Commands;
using StockFlow.Application.Features.Products.DTOs;
using StockFlow.Application.Features.Products.Queries;
using StockFlow.API.Authorization;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
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
    [RequirePermission("GOODS_READ")]
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
    [RequirePermission("GOODS_READ")]
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
    /// Thẻ kho của hàng hóa tại 1 chi nhánh: lịch sử biến động SL & giá vốn (mới nhất trước), chỉ xem.
    /// </summary>
    [HttpGet("{id}/stock-card")]
    [ProducesResponseType(typeof(List<StockCardEntryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("GOODS_READ")]
    public async Task<IActionResult> GetStockCard(int id, [FromQuery] int warehouseId)
    {
        var result = await _mediator.Send(new GetProductStockCardQuery(id, warehouseId));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
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
    [RequirePermission("GOODS_CREATE")]
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
    /// Nhập danh sách hàng hóa hàng loạt từ file dữ liệu Excel vào cơ sở dữ liệu.
    /// </summary>
    [HttpPost("import")]
    [ProducesResponseType(typeof(ImportProductsResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("GOODS_CREATE")]
    public async Task<IActionResult> ImportProducts([FromBody] ImportProductsRequest request)
    {
        var result = await _mediator.Send(new ImportProductsCommand(request));
        if (!result.IsSuccess)
        {
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
    [RequirePermission("GOODS_UPDATE")]
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
    /// Nhập thêm (ADD) hoặc cân chỉnh (SET) tồn kho của hàng hóa tại 1 kho; ghi thẻ kho, giữ nguyên giá vốn.
    /// </summary>
    [HttpPost("{id}/stock-adjustments")]
    [ProducesResponseType(typeof(ProductStockAdjustmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("STOCK_UPDATE")]
    public async Task<IActionResult> AdjustStock(int id, [FromBody] AdjustProductStockRequest request)
    {
        var result = await _mediator.Send(new AdjustProductStockCommand(id, request));
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
    [RequirePermission("GOODS_UPDATE")]
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
    [RequirePermission("GOODS_DELETE")]
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
    [RequirePermission("GOODS_READ")]
    public async Task<IActionResult> GetProductCategories()
    {
        var result = await _mediator.Send(new GetProductCategoriesQuery());
        return Ok(result.Value);
    }

    /// <summary>
    /// Tạo nhanh nhóm danh mục hàng hóa (Category).
    /// </summary>
    [HttpPost("categories")]
    [ProducesResponseType(typeof(ProductCategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("GOODS_CREATE")]
    public async Task<IActionResult> CreateProductCategory([FromBody] CreateCategoryRequest request)
    {
        var result = await _mediator.Send(new CreateProductCategoryCommand(request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy danh sách đơn vị tính đo lường (Units of Measure).
    /// </summary>
    [HttpGet("units")]
    [ProducesResponseType(typeof(List<ProductUnitDto>), StatusCodes.Status200OK)]
    [RequirePermission("GOODS_READ")]
    public async Task<IActionResult> GetProductUnits()
    {
        var result = await _mediator.Send(new GetProductUnitsQuery());
        return Ok(result.Value);
    }
}
