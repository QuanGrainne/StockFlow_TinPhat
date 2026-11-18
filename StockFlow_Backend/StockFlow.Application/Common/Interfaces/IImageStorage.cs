namespace StockFlow.Application.Common.Interfaces;

/// <summary>
/// Lưu ảnh hàng hóa thành file trên máy chủ (VPS) thay vì để base64 trong DB hoặc phụ thuộc link ngoài (KiotViet...).
/// DB chỉ lưu đường dẫn công khai dạng "/api/uploads/products/2026/11/abc.jpg".
/// </summary>
public interface IImageStorage
{
    /// <summary>Tiền tố URL công khai của file ảnh đã lưu (API phục vụ thư mục ảnh ở đường dẫn này).</summary>
    const string PublicPathPrefix = "/api/uploads";

    /// <summary>
    /// Chuẩn hoá giá trị ảnh trước khi ghi DB:
    /// - rỗng → rỗng (xoá ảnh);
    /// - "data:image/...;base64,..." (ảnh tải lên từ máy) → lưu file, trả đường dẫn nội bộ;
    /// - link http/https (vd ảnh KiotViet, có thể nhiều link cách nhau dấu phẩy) → tải ảnh đầu tiên về, lưu file;
    /// - đường dẫn nội bộ đã lưu → giữ nguyên.
    /// </summary>
    Task<ImageStoreResult> StoreAsync(string? value, CancellationToken cancellationToken = default);
}

/// <param name="Url">Giá trị ghi vào DB (đường dẫn nội bộ, hoặc link gốc nếu tải về thất bại).</param>
/// <param name="Error">Thông báo khi không lưu được ảnh; null nếu thành công.</param>
/// <param name="Rejected">
/// true khi ảnh tải lên từ máy không hợp lệ (sai định dạng, quá dung lượng): handler nên trả lỗi cho người dùng.
/// false khi chỉ là tải link ngoài thất bại: vẫn lưu link gốc để không chặn việc tạo/import hàng.
/// </param>
public record ImageStoreResult(string? Url, string? Error = null, bool Rejected = false);
