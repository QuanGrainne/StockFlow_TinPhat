using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.Suppliers.Commands;
using StockFlow.Application.Features.Suppliers.DTOs;
using StockFlow.Application.Features.Suppliers.Queries;
using StockFlow.API.Authorization;

using StockFlow.Application.Features.WarehousePermissions.DTOs;
using StockFlow.Application.Features.WarehousePermissions.Queries;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
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
    [RequirePermission("PARTNER_READ")]
    [RequireFeature("feat-suppliers", "feat-purchase", "feat-purchase-orders", "feat-purchase-returns")]
    public async Task<IActionResult> GetSuppliers(
        [FromQuery] string? search,
        [FromQuery] string? debtStatus,
        [FromQuery] string? status,
        [FromQuery] int? warehouseId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _mediator.Send(new GetSuppliersQuery(search, debtStatus, status, warehouseId, fromDate, toDate));
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
    [RequirePermission("PARTNER_READ")]
    [RequireFeature("feat-suppliers")]
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
    [RequirePermission("PARTNER_CREATE")]
    [RequireFeature("feat-suppliers", "feat-purchase", "feat-purchase-orders")]
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
    [RequirePermission("PARTNER_UPDATE")]
    [RequireFeature("feat-suppliers")]
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
    [RequirePermission("PARTNER_UPDATE")]
    [RequireFeature("feat-suppliers")]
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
    /// <summary>
    /// Tạo phiếu chi thanh toán nợ nhà cung cấp (PC000001...), có thể phân bổ vào các phiếu nhập còn nợ.
    /// </summary>
    [HttpPost("{id}/payments")]
    [ProducesResponseType(typeof(SupplierPaymentResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("FIN_CREATE")]
    [RequireFeature("feat-suppliers")]
    public async Task<IActionResult> CreateSupplierPayment(int id, [FromBody] CreateSupplierPaymentRequest request)
    {
        var result = await _mediator.Send(new CreateSupplierPaymentCommand(id, request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Điều chỉnh công nợ nhà cung cấp: đặt Nợ cần trả NCC bằng giá trị nhập (âm = NCC nợ cửa hàng, 0 = hết nợ), ghi phiếu DC000001...
    /// </summary>
    [HttpPost("{id}/debt-adjustments")]
    [ProducesResponseType(typeof(AdjustSupplierDebtResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("FIN_CREATE")]
    [RequireFeature("feat-suppliers")]
    public async Task<IActionResult> AdjustSupplierDebt(int id, [FromBody] AdjustSupplierDebtRequest request)
    {
        var result = await _mediator.Send(new AdjustSupplierDebtCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Xem phiếu điều chỉnh công nợ NCC DC... (giá trị nợ sau điều chỉnh, ngày, người tạo, mô tả)</summary>
    [HttpGet("{id}/debt-adjustments/{code}")]
    [ProducesResponseType(typeof(SupplierDebtAdjustmentDto), StatusCodes.Status200OK)]
    [RequirePermission("PARTNER_READ")]
    [RequireFeature("feat-suppliers")]
    public async Task<IActionResult> GetSupplierDebtAdjustment(int id, string code)
    {
        var result = await _mediator.Send(new GetSupplierDebtAdjustmentQuery(id, code));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Sửa phiếu điều chỉnh công nợ NCC: giá trị nợ sau điều chỉnh, ngày, mô tả</summary>
    [HttpPut("{id}/debt-adjustments/{code}")]
    [RequirePermission("FIN_UPDATE")]
    [RequireFeature("feat-suppliers")]
    public async Task<IActionResult> UpdateSupplierDebtAdjustment(int id, string code, [FromBody] AdjustSupplierDebtRequest request)
    {
        var result = await _mediator.Send(new UpdateSupplierDebtAdjustmentCommand(id, code, request));
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(new { message = result.Error });
    }

    /// <summary>Xóa (hủy) phiếu điều chỉnh công nợ NCC: nợ cần trả trừ lại chênh lệch của phiếu</summary>
    [HttpPost("{id}/debt-adjustments/{code}/cancel")]
    [RequirePermission("FIN_UPDATE")]
    [RequireFeature("feat-suppliers")]
    public async Task<IActionResult> CancelSupplierDebtAdjustment(int id, string code)
    {
        var result = await _mediator.Send(new CancelSupplierDebtAdjustmentCommand(id, code));
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(new { message = result.Error });
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("PARTNER_DELETE")]
    [RequireFeature("feat-suppliers")]
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
