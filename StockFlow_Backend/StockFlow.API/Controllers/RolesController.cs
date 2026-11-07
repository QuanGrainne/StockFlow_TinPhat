using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockFlow.Application.Features.Roles.Commands;
using StockFlow.Application.Features.Roles.DTOs;
using StockFlow.Application.Features.Roles.Queries;
using StockFlow.API.Authorization;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RolesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentUserService _currentUser;

    public RolesController(IMediator mediator, ICurrentUserService currentUser)
    {
        _mediator = mediator;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Ma trận Phân quyền chức năng (chức năng navbar được tick) của tất cả vai trò.
    /// </summary>
    [HttpGet("feature-matrix")]
    [ProducesResponseType(typeof(List<RoleFeaturesDto>), StatusCodes.Status200OK)]
    // Chỉ cần đăng nhập (giống GET {roleCode}/permissions): dữ liệu chỉ đọc; sửa ma trận yêu cầu [RequireAdmin].
    public async Task<IActionResult> GetFeatureMatrix()
    {
        var result = await _mediator.Send(new GetFeatureMatrixQuery());
        return Ok(result.Value);
    }

    /// <summary>
    /// Lưu ma trận Phân quyền chức năng: { "ROLE_SALES": ["feat-pos", ...], ... }.
    /// Quyền phân hệ của vai trò được suy ra lại từ các chức năng được tick.
    /// </summary>
    [HttpPut("feature-matrix")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequireAdmin]
    public async Task<IActionResult> SaveFeatureMatrix([FromBody] Dictionary<string, List<string>> matrix)
    {
        var result = await _mediator.Send(new SaveRoleFeaturesCommand(matrix));
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { success = true });
    }

    /// <summary>
    /// Chức năng navbar mà người dùng đang đăng nhập được dùng (theo vai trò thật trong DB).
    /// </summary>
    [HttpGet("my-features")]
    [ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyFeatures()
    {
        if (_currentUser.UserId is not int userId) return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ." });
        var result = await _mediator.Send(new GetMyFeaturesQuery(userId));
        return Ok(result.Value);
    }

    /// <summary>
    /// Lấy danh mục tất cả vai trò phân quyền (RBAC) cùng số lượng nhân viên trực thuộc.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<RoleDto>), StatusCodes.Status200OK)]
    [RequirePermission("AUTH_READ")]
    [RequireFeature("feat-roles", "feat-role-matrix", "feat-staff", "feat-dashboard")]
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
    [RequireAdmin]
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
    // Chỉ cần đăng nhập: frontend của mọi nhân viên đọc ma trận quyền của chính vai trò mình để ẩn/hiện menu.
    // Đây là dữ liệu chỉ đọc, không nhạy cảm; thay đổi ma trận vẫn yêu cầu [RequireAdmin].
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
    [RequireAdmin]
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
    [RequireAdmin]
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
    [RequireAdmin]
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
