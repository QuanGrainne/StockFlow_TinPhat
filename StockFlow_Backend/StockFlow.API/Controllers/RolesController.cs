using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.Roles.Commands;
using StockFlow.Application.Features.Roles.DTOs;
using StockFlow.Application.Features.Roles.Queries;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly IMediator _mediator;

    public RolesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Lấy danh mục tất cả vai trò phân quyền (RBAC) cùng số lượng nhân viên trực thuộc.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<RoleDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRoles()
    {
        var result = await _mediator.Send(new GetRolesQuery());
        return Ok(result.Value);
    }

    /// <summary>
    /// Tạo vai trò người dùng tùy biến mới.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(RoleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
    {
        var result = await _mediator.Send(new CreateRoleCommand(request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy ma trận phân quyền 9 phân hệ của một vai trò cụ thể.
    /// </summary>
    [HttpGet("{roleCode}/permissions")]
    [ProducesResponseType(typeof(List<PermissionModuleDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRolePermissions(string roleCode)
    {
        var result = await _mediator.Send(new GetRolePermissionsQuery(roleCode));
        return Ok(result.Value);
    }

    /// <summary>
    /// Cập nhật thông tin vai trò.
    /// </summary>
    [HttpPut("{roleIdOrCode}")]
    [ProducesResponseType(typeof(RoleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateRole(string roleIdOrCode, [FromBody] UpdateRoleRequest request)
    {
        var result = await _mediator.Send(new UpdateRoleCommand(roleIdOrCode, request));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// Xóa vai trò tùy biến người dùng.
    /// </summary>
    [HttpDelete("{roleIdOrCode}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteRole(string roleIdOrCode)
    {
        var result = await _mediator.Send(new DeleteRoleCommand(roleIdOrCode));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { success = true });
    }

    /// <summary>
    /// Lưu / Cập nhật ma trận phân quyền cho một vai trò.
    /// </summary>
    [HttpPut("{roleCode}/permissions")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SaveRolePermissions(string roleCode, [FromBody] List<PermissionModuleDto> modules)
    {
        var result = await _mediator.Send(new SaveRolePermissionsCommand(roleCode, modules));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { success = true });
    }
}
