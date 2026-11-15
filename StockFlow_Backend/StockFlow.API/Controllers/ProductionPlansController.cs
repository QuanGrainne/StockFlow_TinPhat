using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.Production.Commands;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Queries;

namespace StockFlow.API.Controllers;

/// <summary>
/// Kế hoạch sản xuất (UC-PP-01..06, mã tạm, chưa có trong Report 3).
/// Phân quyền chức năng:
/// - feat-production-plans: xem, lập, sửa (Nháp / Bị từ chối), gửi duyệt, hủy kế hoạch chưa duyệt của mình
/// - feat-production-plan-approval: duyệt / từ chối, sửa kế hoạch đã duyệt, hủy, đóng
/// - feat-prod-plan (Lập lệnh sản xuất): lập lệnh từ kế hoạch đã duyệt
/// Mã quyền: Production Accountant mặc định chỉ có PROD_READ + PROD_UPDATE (PermissionConstants), nên lập / sửa /
/// gửi duyệt / hủy kế hoạch dùng PROD_UPDATE; duyệt / từ chối / đóng dùng PROD_APPROVE; lập lệnh dùng PROD_CREATE.
/// Vai trò đã cấu hình ma trận chức năng có đủ PROD_* nên việc tách người lập và người duyệt nằm ở [RequireFeature] và handler.
/// </summary>
[ApiController]
[Route("api/production/plans")]
public class ProductionPlansController : ControllerBase
{
    private const string Plans = "feat-production-plans";
    private const string Approval = "feat-production-plan-approval";
    private const string CreateOrders = "feat-prod-plan";

    private readonly IMediator _mediator;

    public ProductionPlansController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private static List<string>? SplitStrings(string? csv) =>
        string.IsNullOrWhiteSpace(csv)
            ? null
            : csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    private static DateOnly? ToDate(DateTime? value) => value.HasValue ? DateOnly.FromDateTime(value.Value) : null;

    /// <summary>Danh sách kế hoạch (statuses: DRAFT,PENDING_APPROVAL,APPROVED,REJECTED,CLOSED,CANCELLED; lọc kỳ giao với fromDate–toDate).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ProductionPlanSummaryDto>), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature(Plans, Approval, CreateOrders)]
    public async Task<IActionResult> GetPlans(
        [FromQuery] string? statuses, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] string? search)
    {
        var result = await _mediator.Send(new GetProductionPlansQuery(SplitStrings(statuses), ToDate(fromDate), ToDate(toDate), search));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Chi tiết kế hoạch kèm tiến độ lập lệnh và thao tác được phép.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ProductionPlanDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature(Plans, Approval, CreateOrders)]
    public async Task<IActionResult> GetPlanById(int id)
    {
        var result = await _mediator.Send(new GetProductionPlanByIdQuery(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Lập kế hoạch (trạng thái Nháp). Dùng PROD_UPDATE như các thao tác ghi khác của Production Accountant.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ProductionPlanDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_UPDATE")]
    [RequireFeature(Plans, Approval)]
    public async Task<IActionResult> CreatePlan([FromBody] SaveProductionPlanRequest request)
    {
        var result = await _mediator.Send(new CreateProductionPlanCommand(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Sửa kế hoạch (Nháp / Bị từ chối: toàn bộ; Đã duyệt: hạn chế, chỉ người có quyền duyệt).</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ProductionPlanDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_UPDATE")]
    [RequireFeature(Plans, Approval)]
    public async Task<IActionResult> UpdatePlan(int id, [FromBody] SaveProductionPlanRequest request)
    {
        var result = await _mediator.Send(new UpdateProductionPlanCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Gửi duyệt (mọi thành phẩm phải có BOM đang áp dụng).</summary>
    [HttpPost("{id:int}/submit")]
    [ProducesResponseType(typeof(ProductionPlanDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_UPDATE")]
    [RequireFeature(Plans, Approval)]
    public async Task<IActionResult> SubmitPlan(int id)
    {
        var result = await _mediator.Send(new SubmitProductionPlanCommand(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Duyệt kế hoạch Chờ duyệt.</summary>
    [HttpPost("{id:int}/approve")]
    [ProducesResponseType(typeof(ProductionPlanDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_APPROVE")]
    [RequireFeature(Approval)]
    public async Task<IActionResult> ApprovePlan(int id)
    {
        var result = await _mediator.Send(new ApproveProductionPlanCommand(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Từ chối kế hoạch Chờ duyệt (bắt buộc lý do).</summary>
    [HttpPost("{id:int}/reject")]
    [ProducesResponseType(typeof(ProductionPlanDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_APPROVE")]
    [RequireFeature(Approval)]
    public async Task<IActionResult> RejectPlan(int id, [FromBody] ProductionPlanReasonRequest request)
    {
        var result = await _mediator.Send(new RejectProductionPlanCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Hủy kế hoạch (bắt buộc lý do; kế hoạch Đã duyệt phải không còn lệnh chưa hủy).</summary>
    [HttpPost("{id:int}/cancel")]
    [ProducesResponseType(typeof(ProductionPlanDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_UPDATE")]
    [RequireFeature(Plans, Approval)]
    public async Task<IActionResult> CancelPlan(int id, [FromBody] ProductionPlanReasonRequest request)
    {
        var result = await _mediator.Send(new CancelProductionPlanCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Đóng kế hoạch Đã duyệt (bỏ phần chưa lập lệnh; lệnh đang mở vẫn chạy).</summary>
    [HttpPost("{id:int}/close")]
    [ProducesResponseType(typeof(ProductionPlanDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_APPROVE")]
    [RequireFeature(Approval)]
    public async Task<IActionResult> ClosePlan(int id)
    {
        var result = await _mediator.Send(new CloseProductionPlanCommand(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Nhu cầu NVL dự kiến của kế hoạch đã lưu (warehouseId = kho NVL để so tồn).</summary>
    [HttpGet("{id:int}/material-requirements")]
    [ProducesResponseType(typeof(PlanMaterialRequirementsDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature(Plans, Approval, CreateOrders)]
    public async Task<IActionResult> GetMaterialRequirements(int id, [FromQuery] int? warehouseId)
    {
        var result = await _mediator.Send(new GetPlanMaterialRequirementsQuery(id, warehouseId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Nhu cầu NVL dự kiến cho kế hoạch đang soạn (chưa lưu).</summary>
    [HttpPost("material-requirements/preview")]
    [ProducesResponseType(typeof(PlanMaterialRequirementsDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature(Plans, Approval)]
    public async Task<IActionResult> PreviewMaterialRequirements([FromBody] PreviewPlanMaterialRequirementsRequest request)
    {
        var result = await _mediator.Send(new PreviewPlanMaterialRequirementsQuery(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Lập lệnh sản xuất từ kế hoạch Đã duyệt (một phần hoặc toàn bộ số còn lại).</summary>
    [HttpPost("{id:int}/orders")]
    [ProducesResponseType(typeof(ProductionOrderDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_CREATE")]
    [RequireFeature(CreateOrders)]
    public async Task<IActionResult> CreateOrderFromPlan(int id, [FromBody] SaveProductionOrderRequest request)
    {
        var result = await _mediator.Send(new CreateProductionOrderFromPlanCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }
}
