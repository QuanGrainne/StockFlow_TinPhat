using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.Customers.Commands;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Application.Features.Customers.Queries;
using StockFlow.API.Authorization;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private readonly IMediator _mediator;

    public CustomersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Lấy danh sách Khách hàng từ bảng mst_business_partners (chỉ lấy partner_type = 'CUSTOMER' hoặc 'BOTH').
    /// Hỗ trợ tìm kiếm theo từ khóa, lọc theo tình trạng nợ và trạng thái hoạt động.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<CustomerDto>), StatusCodes.Status200OK)]
    [RequirePermission("PARTNER_READ")]
    public async Task<IActionResult> GetCustomers(
        [FromQuery] string? search,
        [FromQuery] string? debtStatus,
        [FromQuery] string? status,
        [FromQuery] int? createdWarehouseId,
        [FromQuery] DateTime? createdFrom,
        [FromQuery] DateTime? createdTo,
        [FromQuery] string? gender,
        [FromQuery] decimal? minSales,
        [FromQuery] decimal? maxSales,
        [FromQuery] DateTime? salesFrom,
        [FromQuery] DateTime? salesTo,
        [FromQuery] decimal? minDebt,
        [FromQuery] decimal? maxDebt)
    {
        var result = await _mediator.Send(new GetCustomersQuery(
            search, debtStatus, status, createdWarehouseId, createdFrom, createdTo, gender,
            minSales, maxSales, salesFrom, salesTo, minDebt, maxDebt));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy các chỉ số KPI thống kê Khách hàng (Tổng khách hàng, Đang hoạt động, Nợ cần thu, Hạn mức cấp).
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(CustomerStatsDto), StatusCodes.Status200OK)]
    [RequirePermission("PARTNER_READ")]
    public async Task<IActionResult> GetCustomerStats()
    {
        var result = await _mediator.Send(new GetCustomerStatsQuery());
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy thông tin chi tiết một Khách hàng kèm danh sách đơn hàng gần đây.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(CustomerDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [RequirePermission("PARTNER_READ")]
    public async Task<IActionResult> GetCustomerById(int id)
    {
        var result = await _mediator.Send(new GetCustomerByIdQuery(id));
        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Chi tiết 1 phiếu thu của khách hàng theo mã (TTHD000085, TTHD000085-1, PT000001...).
    /// </summary>
    [HttpGet("{id}/receipts/{code}")]
    [ProducesResponseType(typeof(CustomerReceiptDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [RequirePermission("PARTNER_READ")]
    public async Task<IActionResult> GetCustomerReceipt(int id, string code)
    {
        var result = await _mediator.Send(new GetCustomerReceiptQuery(id, code));
        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Sửa phiếu thu của khách: thời gian, phương thức thanh toán, ghi chú.
    /// </summary>
    [HttpPut("{id}/receipts/{code}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("FIN_UPDATE")]
    public async Task<IActionResult> UpdateCustomerReceipt(int id, string code, [FromBody] UpdateCustomerReceiptRequest request)
    {
        var result = await _mediator.Send(new UpdateCustomerReceiptCommand(id, code, request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { message = $"Đã lưu phiếu thu {code}" });
    }

    /// <summary>
    /// Hủy phiếu thu của khách: hoàn lại số đã trả của hóa đơn và cộng lại nợ khách.
    /// </summary>
    [HttpPost("{id}/receipts/{code}/cancel")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("FIN_UPDATE")]
    public async Task<IActionResult> CancelCustomerReceipt(int id, string code)
    {
        var result = await _mediator.Send(new CancelCustomerReceiptCommand(id, code));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { message = $"Đã hủy phiếu thu {code}" });
    }

    /// <summary>
    /// Thêm mới một Khách hàng (tự động gán partner_type = 'CUSTOMER').
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(CustomerDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [RequirePermission("PARTNER_CREATE")]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerRequest request)
    {
        var result = await _mediator.Send(new CreateCustomerCommand(request));
        if (!result.IsSuccess)
        {
            if (result.Error != null && result.Error.StartsWith("CUSTOMER_CODE_EXISTS:"))
            {
                var msg = result.Error.Substring("CUSTOMER_CODE_EXISTS:".Length);
                return Conflict(new
                {
                    status = 409,
                    code = "CUSTOMER_CODE_EXISTS",
                    message = msg
                });
            }

            return BadRequest(new
            {
                status = 400,
                code = "VALIDATION_FAILED",
                message = result.Error
            });
        }
        return StatusCode(StatusCodes.Status201Created, result.Value);
    }

    /// <summary>
    /// Tạo phiếu thu nợ khách hàng (PT000001...), có thể phân bổ vào các hóa đơn còn nợ.
    /// </summary>
    [HttpPost("{id}/payments")]
    [ProducesResponseType(typeof(CustomerPaymentResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("FIN_CREATE")]
    public async Task<IActionResult> CreateCustomerPayment(int id, [FromBody] CreateCustomerPaymentRequest request)
    {
        var result = await _mediator.Send(new CreateCustomerPaymentCommand(id, request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Cập nhật thông tin Khách hàng.
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(CustomerDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("PARTNER_UPDATE")]
    public async Task<IActionResult> UpdateCustomer(int id, [FromBody] UpdateCustomerRequest request)
    {
        var result = await _mediator.Send(new UpdateCustomerCommand(id, request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Đổi trạng thái giao dịch (ACTIVE <-> INACTIVE).
    /// </summary>
    [HttpPatch("{id}/toggle-status")]
    [RequirePermission("PARTNER_UPDATE")]
    public async Task<IActionResult> ToggleCustomerStatus(int id)
    {
        var result = await _mediator.Send(new ToggleCustomerStatusCommand(id));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { isActive = result.Value });
    }

    /// <summary>
    /// Cập nhật trạng thái hàng loạt cho nhiều khách hàng.
    /// </summary>
    [HttpPatch("batch-status")]
    [RequirePermission("PARTNER_UPDATE")]
    public async Task<IActionResult> BatchUpdateCustomerStatus([FromBody] BatchCustomerStatusRequest request)
    {
        var result = await _mediator.Send(new BatchCustomerStatusCommand(request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { success = true });
    }

    /// <summary>
    /// Xóa hoặc ngừng hoạt động Khách hàng.
    /// </summary>
    [HttpDelete("{id}")]
    [RequirePermission("PARTNER_DELETE")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        var result = await _mediator.Send(new DeleteCustomerCommand(id));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { success = true });
    }
}

