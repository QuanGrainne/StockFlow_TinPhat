using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.Suppliers.Commands;
using StockFlow.Application.Features.Suppliers.DTOs;
using StockFlow.Application.Features.Suppliers.Queries;

using StockFlow.Application.Features.WarehousePermissions.DTOs;
using StockFlow.Application.Features.WarehousePermissions.Queries;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class SuppliersController : ControllerBase
{
    private readonly IMediator _mediator;

    public SuppliersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Lấy danh sách Nhà cung cấp (hỗ trợ tìm kiếm từ khóa, lọc theo tình trạng nợ, trạng thái hoạt động và theo Chi nhánh/Kho nhập hàng).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<SupplierDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSuppliers(
        [FromQuery] string? search,
        [FromQuery] string? debtStatus,
        [FromQuery] string? status,
        [FromQuery] int? warehouseId)
    {
        var result = await _mediator.Send(new GetSuppliersQuery(search, debtStatus, status, warehouseId));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy danh sách các Chi nhánh / Kho nhập hàng khả dụng trong hệ thống.
    /// </summary>
    [HttpGet("warehouses")]
    public async Task<IActionResult> GetWarehouses()
    {
        var result = await _mediator.Send(new GetWarehouseFacilitiesQuery());
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok((result.Value ?? Enumerable.Empty<WarehouseFacilityDto>()).Where(w => w.Status == "ACTIVE"));
    }

    /// <summary>
    /// Lấy thông tin chi tiết một Nhà cung cấp kèm danh sách các chứng từ nhập kho gần đây.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(SupplierDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSupplierById(int id)
    {
        var result = await _mediator.Send(new GetSupplierByIdQuery(id));
        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Thêm mới một Nhà cung cấp (hỗ trợ tự động sinh mã NCCxxxxxx hoặc kiểm tra trùng lặp mã thủ công).
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(SupplierDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierRequest request)
    {
        var result = await _mediator.Send(new CreateSupplierCommand(request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Cập nhật thông tin Nhà cung cấp (tên, số điện thoại, email, địa chỉ, hạn mức nợ, nợ hiện tại).
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(SupplierDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSupplier(int id, [FromBody] UpdateSupplierRequest request)
    {
        var result = await _mediator.Send(new UpdateSupplierCommand(id, request));
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("Không tìm thấy") == true)
            {
                return NotFound(new { message = result.Error });
            }
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Bật / Tắt trạng thái hoạt động của Nhà cung cấp (Đang giao dịch ACTIVE / Ngừng giao dịch INACTIVE).
    /// </summary>
    [HttpPatch("{id}/toggle-status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ToggleSupplierStatus(int id)
    {
        var result = await _mediator.Send(new ToggleSupplierStatusCommand(id));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { isActive = result.Value });
    }

    /// <summary>
    /// Xóa Nhà cung cấp hoặc tự động chuyển sang ngừng hoạt động nếu đã phát sinh chứng từ nhập kho / công nợ.
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteSupplier(int id)
    {
        var result = await _mediator.Send(new DeleteSupplierCommand(id));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { success = true });
    }
}
