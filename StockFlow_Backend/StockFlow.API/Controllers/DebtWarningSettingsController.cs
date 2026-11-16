using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.Settings.Commands;
using StockFlow.Application.Features.Settings.DTOs;
using StockFlow.Application.Features.Settings.Queries;
using StockFlow.API.Authorization;

namespace StockFlow.API.Controllers;

/// <summary>Thiết lập cảnh báo công nợ khách hàng (Manager / Kế toán trưởng / Admin chỉnh sửa).</summary>
[ApiController]
[Route("api/settings/debt-warning")]
public class DebtWarningSettingsController : ControllerBase
{
    private readonly IMediator _mediator;

    public DebtWarningSettingsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(DebtWarningSettingDto), StatusCodes.Status200OK)]
    [RequirePermission("PARTNER_READ")]
    [RequireFeature("feat-customers", "feat-pos", "feat-invoices", "feat-credit-approvals")]
    public async Task<IActionResult> Get()
    {
        var result = await _mediator.Send(new GetDebtWarningSettingsQuery());
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    [HttpPut]
    [ProducesResponseType(typeof(DebtWarningSettingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequirePermission("SALES_APPROVE")]
    [RequireFeature("feat-credit-approvals")]
    public async Task<IActionResult> Update([FromBody] UpdateDebtWarningSettingDto request)
    {
        var result = await _mediator.Send(new UpdateDebtWarningSettingsCommand(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }
}
