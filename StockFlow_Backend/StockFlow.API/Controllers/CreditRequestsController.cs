using MediatR;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.CreditRequests.Commands;
using StockFlow.Application.Features.CreditRequests.DTOs;
using StockFlow.Application.Features.CreditRequests.Queries;

namespace StockFlow.API.Controllers;

/// <summary>
/// Yêu cầu duyệt vượt hạn mức công nợ (HM-01): Sales gửi từ POS (UC-27), Manager duyệt ở Approval Inbox (UC-64).
/// Duyệt cần SALES_APPROVE và chức năng "Duyệt hạn mức" (feat-credit-approvals): vai trò Sales tick "Bán hàng"
/// cũng nhận SALES_APPROVE, nên chặn thêm bằng chức năng để Sales không tự duyệt.
/// </summary>
[ApiController]
[Route("api/credit-requests")]
public class CreditRequestsController : ControllerBase
{
    private readonly IMediator _mediator;

    public CreditRequestsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Gửi yêu cầu khi POS báo vượt hạn mức (UC-27).</summary>
    [HttpPost]
    [RequirePermission("SALES_CREATE")]
    [RequireFeature("feat-pos")]
    public async Task<IActionResult> Create([FromBody] CreateCreditRequestRequest request)
    {
        var result = await _mediator.Send(new CreateCreditRequestCommand(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Yêu cầu của chính tôi (lọc theo khách đang chọn ở POS, trạng thái).</summary>
    [HttpGet("mine")]
    [RequirePermission("SALES_READ")]
    [RequireFeature("feat-pos")]
    public async Task<IActionResult> GetMine([FromQuery] int? partnerId, [FromQuery] string? status)
    {
        var result = await _mediator.Send(new GetMyCreditRequestsQuery(partnerId, status));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Approval Inbox – tab Yêu cầu hạn mức (UC-64).</summary>
    [HttpGet]
    [RequirePermission("SALES_APPROVE")]
    [RequireFeature("feat-credit-approvals")]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] string? search)
    {
        var result = await _mediator.Send(new GetCreditRequestsQuery(status, search));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpGet("{id:int}")]
    [RequirePermission("SALES_APPROVE")]
    [RequireFeature("feat-credit-approvals")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetCreditRequestDetailQuery(id));
        return result.IsSuccess ? Ok(result.Value) : NotFound(new { message = result.Error });
    }

    /// <summary>Tổng quan mua hàng và lịch sử thanh toán của khách để xét duyệt (A62.2).</summary>
    [HttpGet("{id:int}/customer-history")]
    [RequirePermission("SALES_APPROVE")]
    [RequireFeature("feat-credit-approvals")]
    public async Task<IActionResult> GetCustomerHistory(int id)
    {
        var result = await _mediator.Send(new GetCreditRequestCustomerHistoryQuery(id));
        return result.IsSuccess ? Ok(result.Value) : NotFound(new { message = result.Error });
    }

    /// <summary>Duyệt ngoại lệ một lần (ONE_TIME) hoặc nâng hạn mức (NEW_LIMIT) – BR-13; Manager sửa được mức duyệt.</summary>
    [HttpPost("{id:int}/approve")]
    [RequirePermission("SALES_APPROVE")]
    [RequireFeature("feat-credit-approvals")]
    public async Task<IActionResult> Approve(int id, [FromBody] ApproveCreditRequestRequest request)
    {
        var result = await _mediator.Send(new ApproveCreditRequestCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Từ chối kèm lý do – BR-13, BR-50.</summary>
    [HttpPost("{id:int}/reject")]
    [RequirePermission("SALES_APPROVE")]
    [RequireFeature("feat-credit-approvals")]
    public async Task<IActionResult> Reject(int id, [FromBody] RejectCreditRequestRequest request)
    {
        var result = await _mediator.Send(new RejectCreditRequestCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }
}
