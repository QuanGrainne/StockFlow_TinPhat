using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.Payments.Commands;
using StockFlow.Application.Features.Payments.DTOs;
using StockFlow.Application.Features.Payments.Queries;

namespace StockFlow.API.Controllers;

/// <summary>
/// Thanh toán chuyển khoản bằng QR qua payOS cho màn Bán hàng (hóa đơn / đặt hàng).
/// Khóa payOS chỉ nằm ở backend; trạng thái "Đã thanh toán" chỉ đổi theo webhook có chữ ký hợp lệ
/// hoặc khi backend tự tra cứu payOS.
/// </summary>
[ApiController]
[Route("api/payments/payos")]
public class PaymentsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PaymentsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Tạo QR thanh toán payOS (hiệu lực 10 phút).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(PayosPaymentDto), StatusCodes.Status200OK)]
    [RequirePermission("SALES_CREATE")]
    [RequireFeature("feat-pos")]
    public async Task<IActionResult> Create([FromBody] CreatePayosPaymentRequest request)
    {
        var result = await _mediator.Send(new CreatePayosPaymentCommand(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Trạng thái QR (màn Bán hàng hỏi định kỳ; backend tự hỏi lại payOS khi còn chờ).</summary>
    [HttpGet("{orderCode:long}")]
    [ProducesResponseType(typeof(PayosPaymentDto), StatusCodes.Status200OK)]
    [RequirePermission("SALES_CREATE")]
    [RequireFeature("feat-pos")]
    public async Task<IActionResult> Get(long orderCode)
    {
        var result = await _mediator.Send(new GetPayosPaymentQuery(orderCode));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Hủy QR đang chờ (tạo QR mới / đóng hộp thoại). QR đã thanh toán thì giữ nguyên.</summary>
    [HttpPost("{orderCode:long}/cancel")]
    [ProducesResponseType(typeof(PayosPaymentDto), StatusCodes.Status200OK)]
    [RequirePermission("SALES_CREATE")]
    [RequireFeature("feat-pos")]
    public async Task<IActionResult> Cancel(long orderCode)
    {
        var result = await _mediator.Send(new CancelPayosPaymentCommand(orderCode));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>
    /// Webhook payOS gọi về khi có giao dịch. Không đăng nhập được nên [AllowAnonymous] — thay vào đó
    /// bắt buộc chữ ký HMAC-SHA256 hợp lệ (Checksum Key). Trả 200 cho mọi webhook hợp lệ (kể cả gửi lặp)
    /// để payOS không gửi lại.
    /// </summary>
    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook([FromBody] JsonElement body)
    {
        var result = await _mediator.Send(new HandlePayosWebhookCommand(body));
        return result.IsSuccess
            ? Ok(new { error = 0, message = "ok" })
            : BadRequest(new { error = -1, message = result.Error });
    }
}
