using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.Auth.Commands;
using StockFlow.Application.Features.Auth.DTOs;
using StockFlow.Application.Features.Auth.Queries;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Đăng nhập hệ thống và nhận JWT access token.
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await mediator.Send(new LoginCommand(request.Username, request.Password));

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy thông tin tài khoản đang đăng nhập kèm quyền và danh sách kho truy cập.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(CurrentUserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Không xác thực được danh tính người dùng." });
        }

        var result = await mediator.Send(new GetCurrentUserQuery(userId));

        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Đổi mật khẩu của chính tài khoản đang đăng nhập (UC-50, BR-35..BR-38).
    /// Mọi tài khoản đã đăng nhập đều dùng được (tự phục vụ, giống /me), nên không gắn mã quyền phân hệ.
    /// Token hiện tại vẫn dùng tiếp sau khi đổi.
    /// </summary>
    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var result = await mediator.Send(new ChangePasswordCommand(
            request.CurrentPassword, request.NewPassword, request.ConfirmNewPassword));

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(new { message = "Đổi mật khẩu thành công." });
    }

    /// <summary>
    /// Lấy danh sách mã quyền phân hệ (Permissions) của tài khoản đang đăng nhập.
    /// </summary>
    [HttpGet("permissions")]
    [Authorize]
    [ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyPermissions()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Không xác thực được danh tính người dùng." });
        }

        var result = await mediator.Send(new GetCurrentUserQuery(userId));
        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }

        return Ok(result.Value?.Permissions ?? new List<string>());
    }
}
