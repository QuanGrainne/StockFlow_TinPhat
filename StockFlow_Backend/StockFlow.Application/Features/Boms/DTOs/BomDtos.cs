namespace StockFlow.Application.Features.Boms.DTOs;

/// <summary>Một dòng NVL trong yêu cầu tạo/sửa BOM.</summary>
public class BomItemRequest
{
    public int MaterialId { get; set; }
    public int UnitId { get; set; }

    /// <summary>Định mức trên 1 đơn vị thành phẩm (tối đa 6 chữ số thập phân).</summary>
    public decimal Quantity { get; set; }

    /// <summary>Tỷ lệ hao hụt %, 0–100, tối đa 4 chữ số thập phân. Mặc định 0.</summary>
    public decimal WastageRate { get; set; }
}

public class CreateBomRequest
{
    public int ProductId { get; set; }
    public string? BomName { get; set; }
    public string? Description { get; set; }
    public DateOnly? EffectiveDate { get; set; }
    public List<BomItemRequest> Items { get; set; } = new();
}

/// <summary>Lưu BOM nháp: thay toàn bộ danh sách dòng NVL bằng danh sách gửi lên.</summary>
public class UpdateBomRequest
{
    public string? BomName { get; set; }
    public string? Description { get; set; }
    public DateOnly? EffectiveDate { get; set; }
    public List<BomItemRequest> Items { get; set; } = new();
}

public record BomItemDto(
    int BomItemId,
    int MaterialId,
    string? MaterialCode,
    string? MaterialName,
    int UnitId,
    string? UnitName,
    decimal Quantity,
    decimal WastageRate);

public record BomDto(
    int BomId,
    int ProductId,
    string? ProductCode,
    string? ProductName,
    string? Version,
    string? BomName,
    string? Description,
    string Status,
    DateOnly? EffectiveDate,
    DateTime? CreatedAt,
    bool IsInUse,
    List<BomItemDto> Items);

/// <summary>Một dòng trong danh sách / lịch sử phiên bản.</summary>
public record BomListItemDto(
    int BomId,
    int ProductId,
    string? ProductCode,
    string? ProductName,
    string? Version,
    string? BomName,
    string Status,
    DateOnly? EffectiveDate,
    DateTime? CreatedAt,
    int ItemCount,
    bool IsInUse);

/// <summary>Kết quả kích hoạt: thông báo MSG71 + BOM sau khi kích hoạt.</summary>
public record BomActivationResultDto(string Message, BomDto Bom);
