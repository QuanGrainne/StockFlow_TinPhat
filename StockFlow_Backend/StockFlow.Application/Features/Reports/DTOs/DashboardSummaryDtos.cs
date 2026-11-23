namespace StockFlow.Application.Features.Reports.DTOs;

/// <summary>Báo cáo tổng quan (UC-90) cho một kỳ và phạm vi kho.</summary>
public class DashboardSummaryDto
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    /// <summary>Kho đang lọc; null = mọi kho được phân quyền</summary>
    public int? WarehouseId { get; set; }
    public DashboardKpiDto Kpi { get; set; } = new();
    /// <summary>Doanh thu thuần và lợi nhuận gộp theo từng ngày trong kỳ (đủ mọi ngày, ngày không phát sinh = 0)</summary>
    public List<DailyRevenuePointDto> Daily { get; set; } = new();
    public List<TopProductDto> TopProducts { get; set; } = new();
    public PendingTasksDto Pending { get; set; } = new();
    /// <summary>Hàng dưới định mức (tối đa 20 dòng, thiếu nhiều nhất trước)</summary>
    public List<LowStockItemDto> LowStock { get; set; } = new();
    /// <summary>Tổng số dòng hàng dưới định mức (có thể nhiều hơn số dòng trả về)</summary>
    public int LowStockTotal { get; set; }
}

public class DashboardKpiDto
{
    /// <summary>Tổng tiền các hóa đơn hoàn thành trong kỳ (trước khi trừ hàng trả)</summary>
    public decimal InvoiceRevenue { get; set; }
    /// <summary>Giá trị hàng trả trong kỳ</summary>
    public decimal ReturnValue { get; set; }
    /// <summary>Doanh thu thuần = tiền hóa đơn − hàng trả</summary>
    public decimal NetRevenue { get; set; }
    /// <summary>Giá vốn hàng bán</summary>
    public decimal CostOfGoodsSold { get; set; }
    /// <summary>Lợi nhuận gộp = doanh thu thuần − giá vốn</summary>
    public decimal GrossProfit { get; set; }
    /// <summary>Tỷ suất lợi nhuận gộp (%)</summary>
    public decimal GrossMarginPercent { get; set; }
    public int InvoiceCount { get; set; }
    /// <summary>Giá trị đơn trung bình = tiền hóa đơn / số hóa đơn</summary>
    public decimal AverageOrderValue { get; set; }
    /// <summary>Giá trị tồn hiện tại = Σ quantity × unit_cost</summary>
    public decimal InventoryValue { get; set; }
    /// <summary>Phải thu khách hàng hiện tại (không lọc theo kho)</summary>
    public decimal Receivable { get; set; }
    /// <summary>Phải trả nhà cung cấp hiện tại (không lọc theo kho)</summary>
    public decimal Payable { get; set; }
}

public class DailyRevenuePointDto
{
    public DateOnly Date { get; set; }
    public decimal NetRevenue { get; set; }
    public decimal GrossProfit { get; set; }
}

public class TopProductDto
{
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public decimal Quantity { get; set; }
    /// <summary>Tiền hàng trên các dòng hóa đơn (sau giảm giá dòng)</summary>
    public decimal Revenue { get; set; }
}

public class PendingTasksDto
{
    /// <summary>Yêu cầu hạn mức chờ duyệt</summary>
    public int CreditRequests { get; set; }
    /// <summary>Kế hoạch sản xuất chờ duyệt</summary>
    public int ProductionPlansPendingApproval { get; set; }
    /// <summary>Lệnh sản xuất đang thực hiện</summary>
    public int ProductionOrdersInProgress { get; set; }
    /// <summary>Phiếu chuyển đang trên đường tới kho được phân quyền</summary>
    public int TransfersInTransit { get; set; }
}

public class LowStockItemDto
{
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = "";
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public decimal Quantity { get; set; }
    public decimal? ReorderPoint { get; set; }
    public decimal? MinSafeStock { get; set; }
}
