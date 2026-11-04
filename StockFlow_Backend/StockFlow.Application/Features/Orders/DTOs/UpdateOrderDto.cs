namespace StockFlow.Application.Features.Orders.DTOs;

/// <summary>
/// DTO chứa các thông tin cho phép cập nhật trên đơn hàng (Ghi chú, Loại đơn hàng, Người bán, Trạng thái).
/// </summary>
public class UpdateOrderDto
{
    public string? Notes { get; set; }
    
    /// <summary>
    /// Loại đơn hàng: 'INVOICE' (Hóa đơn bán hàng) hoặc 'BOOKING' (Đơn đặt hàng)
    /// </summary>
    public string? OrderType { get; set; }
    
    /// <summary>
    /// Nhân viên phụ trách / Người bán
    /// </summary>
    public string? SalesRepName { get; set; }
    
    /// <summary>
    /// Trạng thái đơn hàng (nếu có cập nhật)
    /// </summary>
    public string? Status { get; set; }
}

