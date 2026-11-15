using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Authorization;
using StockFlow.Application.Features.Production.Commands;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Queries;

namespace StockFlow.API.Controllers;

/// <summary>
/// Luồng sản xuất: lệnh sản xuất → xuất NVL → nhập thành phẩm.
/// Phân quyền chức năng (ma trận Phân quyền chức năng):
/// - feat-prod: xem lệnh sản xuất (UC-44, UC-45, UC-60, UC-61)
/// - feat-prod-plan: lập / sửa / huỷ / đóng lệnh, điều chỉnh định mức (Manager, UC-59, BR-51)
/// - feat-prod-issue: xuất NVL sản xuất (Production Accountant, UC-46/47/48)
/// - feat-prod-receipt: nhập thành phẩm (Production Accountant, UC-49/50)
/// Mã quyền: Manager dùng PROD_CREATE/DELETE/APPROVE; ghi nhận xuất NVL / nhập thành phẩm dùng PROD_UPDATE.
/// </summary>
[ApiController]
[Route("api/production")]
public class ProductionController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductionController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private static List<string>? SplitStrings(string? csv) =>
        string.IsNullOrWhiteSpace(csv)
            ? null
            : csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    private static List<int>? SplitInts(string? csv) =>
        SplitStrings(csv)?.Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();

    // ─── Lệnh sản xuất ─────────────────────────────────────────────────────

    /// <summary>Danh sách lệnh sản xuất (statuses: NOT_STARTED,IN_PROGRESS,COMPLETED,CANCELLED).</summary>
    [HttpGet("orders")]
    [ProducesResponseType(typeof(List<ProductionOrderSummaryDto>), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature("feat-prod", "feat-prod-plan", "feat-prod-issue", "feat-prod-receipt")]
    public async Task<IActionResult> GetOrders(
        [FromQuery] string? statuses, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] string? search, [FromQuery] bool needsReviewOnly = false)
    {
        var result = await _mediator.Send(new GetProductionOrdersQuery(SplitStrings(statuses), fromDate, toDate, search, needsReviewOnly));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Chi tiết lệnh; warehouseId = kho NVL để xem tồn khả dụng (UC-45 A45.1).</summary>
    [HttpGet("orders/{id:int}")]
    [ProducesResponseType(typeof(ProductionOrderDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature("feat-prod", "feat-prod-plan", "feat-prod-issue", "feat-prod-receipt")]
    public async Task<IActionResult> GetOrderById(int id, [FromQuery] int? warehouseId)
    {
        var result = await _mediator.Send(new GetProductionOrderByIdQuery(id, warehouseId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Nhu cầu NVL dự kiến theo BOM đang áp dụng (form lập lệnh).</summary>
    [HttpGet("orders/requirement-preview")]
    [ProducesResponseType(typeof(RequirementPreviewDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature("feat-prod-plan")]
    public async Task<IActionResult> GetRequirementPreview(
        [FromQuery] int productId, [FromQuery] decimal plannedQuantity, [FromQuery] int? warehouseId)
    {
        var result = await _mediator.Send(new GetRequirementPreviewQuery(productId, plannedQuantity, warehouseId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Lập lệnh sản xuất (trạng thái Chưa bắt đầu).</summary>
    [HttpPost("orders")]
    [ProducesResponseType(typeof(ProductionOrderDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_CREATE")]
    [RequireFeature("feat-prod-plan")]
    public async Task<IActionResult> CreateOrder([FromBody] SaveProductionOrderRequest request)
    {
        var result = await _mediator.Send(new CreateProductionOrderCommand(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Sửa lệnh còn Chưa bắt đầu.</summary>
    [HttpPut("orders/{id:int}")]
    [ProducesResponseType(typeof(ProductionOrderDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_CREATE")]
    [RequireFeature("feat-prod-plan")]
    public async Task<IActionResult> UpdateOrder(int id, [FromBody] SaveProductionOrderRequest request)
    {
        var result = await _mediator.Send(new UpdateProductionOrderCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Huỷ lệnh chưa xuất NVL.</summary>
    [HttpPost("orders/{id:int}/cancel")]
    [ProducesResponseType(typeof(ProductionOrderDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_DELETE")]
    [RequireFeature("feat-prod-plan")]
    public async Task<IActionResult> CancelOrder(int id)
    {
        var result = await _mediator.Send(new CancelProductionOrderCommand(id));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Đóng sớm lệnh đang sản xuất (bắt buộc lý do).</summary>
    [HttpPost("orders/{id:int}/close")]
    [ProducesResponseType(typeof(ProductionOrderDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_APPROVE")]
    [RequireFeature("feat-prod-plan")]
    public async Task<IActionResult> CloseOrder(int id, [FromBody] CloseProductionOrderRequest request)
    {
        var result = await _mediator.Send(new CloseProductionOrderCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>
    /// Duyệt hoàn thành lệnh đang sản xuất: nhập SL thực tế từng thành phẩm, hệ thống tự sinh phiếu nhập
    /// thành phẩm vào kho rồi đóng lệnh.
    /// </summary>
    [HttpPost("orders/{id:int}/approve")]
    [ProducesResponseType(typeof(ProductionOrderDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_APPROVE")]
    [RequireFeature("feat-prod-plan")]
    public async Task<IActionResult> ApproveOrder(int id, [FromBody] ApproveProductionOrderRequest request)
    {
        var result = await _mediator.Send(new ApproveProductionOrderCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Điều chỉnh định mức NVL trên lệnh (BR-51/BR-52).</summary>
    [HttpPost("orders/{id:int}/adjust-norms")]
    [ProducesResponseType(typeof(ProductionOrderDetailDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_APPROVE")]
    [RequireFeature("feat-prod-plan")]
    public async Task<IActionResult> AdjustNorms(int id, [FromBody] AdjustMaterialNormRequest request)
    {
        var result = await _mediator.Send(new AdjustMaterialNormCommand(id, request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    // ─── Xuất NVL sản xuất ─────────────────────────────────────────────────

    /// <summary>Danh sách phiếu xuất NVL sản xuất (kho được phân quyền).</summary>
    [HttpGet("material-issues")]
    [ProducesResponseType(typeof(List<MaterialIssueDto>), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature("feat-prod-issue", "feat-prod")]
    public async Task<IActionResult> GetMaterialIssues(
        [FromQuery] string? warehouseIds, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] string? search, [FromQuery] bool? isSupplementary)
    {
        var result = await _mediator.Send(new GetMaterialIssuesQuery(SplitInts(warehouseIds), fromDate, toDate, search, isSupplementary));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Ghi nhận NVL thực xuất cho lệnh sản xuất (trừ tồn kho).</summary>
    [HttpPost("material-issues")]
    [ProducesResponseType(typeof(MaterialIssueDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_UPDATE")]
    [RequireFeature("feat-prod-issue")]
    public async Task<IActionResult> CreateMaterialIssue([FromBody] CreateMaterialIssueRequest request)
    {
        var result = await _mediator.Send(new CreateMaterialIssueCommand(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    // ─── Nhập thành phẩm ───────────────────────────────────────────────────

    /// <summary>Danh sách phiếu nhập thành phẩm (kho được phân quyền).</summary>
    [HttpGet("finished-goods-receipts")]
    [ProducesResponseType(typeof(List<FinishedGoodsReceiptDto>), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature("feat-prod-receipt", "feat-prod")]
    public async Task<IActionResult> GetFinishedGoodsReceipts(
        [FromQuery] string? warehouseIds, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] string? search, [FromQuery] bool needsReviewOnly = false)
    {
        var result = await _mediator.Send(new GetFinishedGoodsReceiptsQuery(SplitInts(warehouseIds), fromDate, toDate, search, needsReviewOnly));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Kiểm tra trước khi nhập thành phẩm: số còn lại theo kế hoạch và cảnh báo dùng NVL (BR-37).</summary>
    [HttpGet("finished-goods-receipts/check")]
    [ProducesResponseType(typeof(FinishedGoodsCheckDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature("feat-prod-receipt")]
    public async Task<IActionResult> CheckFinishedGoodsReceipt(
        [FromQuery] int productionOrderId, [FromQuery] decimal acceptedQuantity, [FromQuery] decimal defectQuantity,
        [FromQuery] int? productionOrderItemId = null)
    {
        var result = await _mediator.Send(new CheckFinishedGoodsReceiptQuery(productionOrderId, acceptedQuantity, defectQuantity, productionOrderItemId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Ghi nhận thành phẩm nhập kho (cộng tồn kho thành phẩm).</summary>
    [HttpPost("finished-goods-receipts")]
    [ProducesResponseType(typeof(FinishedGoodsReceiptDto), StatusCodes.Status200OK)]
    [RequirePermission("PROD_UPDATE")]
    [RequireFeature("feat-prod-receipt")]
    public async Task<IActionResult> CreateFinishedGoodsReceipt([FromBody] CreateFinishedGoodsReceiptRequest request)
    {
        var result = await _mediator.Send(new CreateFinishedGoodsReceiptCommand(request));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    // ─── Tra cứu ───────────────────────────────────────────────────────────

    /// <summary>Tìm mặt hàng cho form BOM / lập lệnh (activeBomOnly: chỉ thành phẩm có BOM đang áp dụng).</summary>
    [HttpGet("lookups/products")]
    [ProducesResponseType(typeof(List<ProductionProductLookupDto>), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    [RequireFeature("feat-bom", "feat-prod-plan", "feat-production-plans", "feat-production-plan-approval")]
    public async Task<IActionResult> SearchProducts(
        [FromQuery] string? search, [FromQuery] int? warehouseId, [FromQuery] bool activeBomOnly = false, [FromQuery] int limit = 30,
        [FromQuery] string? productType = null, [FromQuery] string? productTypes = null)
    {
        var result = await _mediator.Send(new SearchProductionProductsQuery(
            search, warehouseId, activeBomOnly, limit, productType, SplitStrings(productTypes)));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }

    /// <summary>Vị trí lưu kho của kho thành phẩm.</summary>
    [HttpGet("lookups/locations")]
    [ProducesResponseType(typeof(List<WarehouseLocationDto>), StatusCodes.Status200OK)]
    [RequirePermission("PROD_READ")]
    // Dùng chung: nhập thành phẩm thủ công và form Duyệt hoàn thành của Manager
    [RequireFeature("feat-prod-receipt", "feat-prod-plan")]
    public async Task<IActionResult> GetLocations([FromQuery] int warehouseId)
    {
        var result = await _mediator.Send(new GetWarehouseLocationsQuery(warehouseId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { message = result.Error });
    }
}
