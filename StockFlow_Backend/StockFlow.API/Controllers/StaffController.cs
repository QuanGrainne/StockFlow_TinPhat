using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.Admin.Commands;
using StockFlow.Application.Features.Admin.DTOs;
using StockFlow.Application.Features.Admin.Queries;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class StaffController : ControllerBase
{
    private readonly IMediator _mediator;

    public StaffController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Lấy danh sách tài khoản nhân viên (hỗ trợ tìm kiếm, lọc theo trạng thái, phòng ban).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<StaffDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStaffList([FromQuery] string? search, [FromQuery] string? status, [FromQuery] string? department)
    {
        var result = await _mediator.Send(new GetStaffListQuery(search, status, department));
        return Ok(result.Value);
    }

    /// <summary>
    /// Thêm nhân viên mới vào hệ thống (tự sinh mã, hash mật khẩu mặc định StockFlow@123, gán vai trò & kho).
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(StaffDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateStaff([FromBody] CreateStaffRequest request)
    {
        var result = await _mediator.Send(new CreateStaffCommand(request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Cập nhật thông tin tài khoản nhân viên (họ tên, email, sđt, phòng ban, vai trò, kho phân quyền).
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(StaffDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateStaff(int id, [FromBody] UpdateStaffRequest request)
    {
        var result = await _mediator.Send(new UpdateStaffCommand(id, request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Khóa / Mở khóa trạng thái tài khoản nhân viên.
    /// </summary>
    [HttpPatch("{id}/toggle-status")]
    [HttpPut("{id}/toggle-status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ToggleStaffStatus(int id)
    {
        var result = await _mediator.Send(new ToggleStaffStatusCommand(id));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { isActive = result.Value });
    }

    /// <summary>
    /// Đặt lại mật khẩu tài khoản về mặc định (StockFlow@123).
    /// </summary>
    [HttpPost("{id}/reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetStaffPassword(int id)
    {
        var result = await _mediator.Send(new ResetStaffPasswordCommand(id));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { defaultPassword = result.Value });
    }
}
