namespace StockFlow.Application.Features.Reports.DTOs;

/// <summary>Số lượng nhập (hoặc xuất) tách theo nhóm loại giao dịch thẻ kho.</summary>
public class MovementByGroupDto
{
    /// <summary>Nhập hàng, sửa / hủy phiếu nhập, trả hàng nhập</summary>
    public decimal Purchase { get; set; }
    /// <summary>Bán hàng, hủy hóa đơn, khách trả hàng, hủy phiếu trả</summary>
    public decimal Sale { get; set; }
    /// <summary>Chuyển hàng đi / nhận hàng chuyển / hủy phiếu chuyển</summary>
    public decimal Transfer { get; set; }
    /// <summary>Kiểm kho, hủy phiếu kiểm</summary>
    public decimal Stocktake { get; set; }
    /// <summary>Xuất NVL sản xuất, nhập thành phẩm</summary>
    public decimal Production { get; set; }
    /// <summary>Xuất hủy, hủy phiếu xuất hủy</summary>
    public decimal Disposal { get; set; }
    /// <summary>Điều chỉnh tồn và loại khác</summary>
    public decimal Other { get; set; }
}

/// <summary>Một dòng nhập – xuất – tồn của một hàng tại một kho trong kỳ.</summary>
public class StockMovementRowDto
{
    public string Key { get; set; } = "";
    public int WarehouseId { get; set; }
    public string WarehouseCode { get; set; } = "";
    public string WarehouseName { get; set; } = "";
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string UnitName { get; set; } = "";

    /// <summary>Tồn đầu = balance_after của dòng thẻ kho cuối cùng trước kỳ</summary>
    public decimal OpeningQuantity { get; set; }
    public decimal OpeningValue { get; set; }
    /// <summary>Tổng quantity dương trong kỳ</summary>
    public decimal InQuantity { get; set; }
    public decimal InValue { get; set; }
    /// <summary>Tổng |quantity âm| trong kỳ</summary>
    public decimal OutQuantity { get; set; }
    public decimal OutValue { get; set; }
    public MovementByGroupDto InByGroup { get; set; } = new();
    public MovementByGroupDto OutByGroup { get; set; } = new();
    /// <summary>Tồn cuối = tồn đầu + nhập − xuất</summary>
    public decimal ClosingQuantity { get; set; }
    public decimal ClosingValue { get; set; }

    /// <summary>balance_after của dòng thẻ kho cuối cùng đến hết kỳ (null nếu không có / chưa ghi)</summary>
    public decimal? LedgerBalanceAfter { get; set; }
    /// <summary>Tồn cuối tính được lệch balance_after cuối kỳ (chỉ đánh dấu, không sửa dữ liệu)</summary>
    public bool IsLedgerMismatch { get; set; }
    /// <summary>Tồn hiện tại (trx_inventory_balances) – chỉ có khi kỳ kéo tới hôm nay</summary>
    public decimal? CurrentQuantity { get; set; }
    /// <summary>Tồn cuối lệch tồn hiện tại (chỉ khi kỳ kéo tới hôm nay)</summary>
    public bool IsCurrentMismatch { get; set; }
}

public class StockMovementReportDto
{
    public List<StockMovementRowDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    /// <summary>Dòng tổng của toàn bộ kết quả (mọi trang)</summary>
    public StockMovementRowDto Totals { get; set; } = new();
    /// <summary>Số dòng lệch thẻ kho (toàn bộ kết quả)</summary>
    public int LedgerMismatchCount { get; set; }
    /// <summary>Số dòng lệch tồn hiện tại (toàn bộ kết quả)</summary>
    public int CurrentMismatchCount { get; set; }
}
