namespace StockFlow.Application.Features.CreditRequests.Common;

/// <summary>
/// Thông báo của luồng duyệt hạn mức (HM-01). Gom một chỗ để đối chiếu với SRS Report 3.
/// LƯU Ý: văn bản dưới đây là bản TẠM (chưa có trích đoạn MSG22–25, MSG56–57 của SRS khi viết);
/// cần thay đúng văn bản SRS trước khi nộp. Việc gán mã MSG cho từng câu cũng cần nhóm xác nhận.
/// </summary>
public static class CreditRequestMessages
{
    // MSG22 (tạm): khách hàng vượt hạn mức, có thể gửi yêu cầu duyệt
    public const string NotOverLimit =
        "Khoản nợ dự kiến chưa vượt hạn mức tín dụng của khách hàng, không cần gửi yêu cầu duyệt (MSG22).";

    // MSG23 (tạm): thiếu lý do khi gửi yêu cầu
    public const string ReasonRequired = "Vui lòng nhập lý do gửi yêu cầu duyệt hạn mức (MSG23).";

    // MSG24 (tạm): đã gửi yêu cầu
    public static string Submitted(string code) =>
        $"Đã gửi yêu cầu duyệt hạn mức {code}. Vui lòng chờ Kế toán trưởng phê duyệt (MSG24).";

    // MSG25 (tạm): yêu cầu đã được duyệt
    public static string Approved(string code, string approvalType) => approvalType == Domain.Entities.CreditApprovalType.NewLimit
        ? $"Đã duyệt nâng hạn mức theo yêu cầu {code} (MSG25)."
        : $"Đã duyệt ngoại lệ một lần theo yêu cầu {code} (MSG25).";

    // MSG56 (tạm): từ chối phải có lý do
    public const string RejectReasonRequired = "Vui lòng nhập lý do từ chối (MSG56).";

    public static string Rejected(string code) => $"Đã từ chối yêu cầu {code} (MSG56).";

    // MSG57: yêu cầu đã được xử lý
    public const string AlreadyProcessed = "Yêu cầu này đã được xử lý, không thể xử lý lại (MSG57).";

    // Các thông báo kiểm tra khác (không có mã MSG riêng trong phạm vi đã chốt)
    public const string NotFound = "Không tìm thấy yêu cầu duyệt hạn mức.";
    public const string UserUnknown = "Không xác định được người dùng đăng nhập.";
    public const string CustomerNotFound = "Không tìm thấy thông tin khách hàng trong hệ thống (CUS-002).";
    public const string CustomerInactive = "Khách hàng đang ngừng hoạt động, không thể gửi yêu cầu (CUS-003).";
    public const string WalkInNotAllowed = "Khách lẻ không áp dụng ghi nợ nên không gửi yêu cầu duyệt hạn mức (PAY-009).";
    public const string ZeroLimit =
        "Khách hàng không có hạn mức tín dụng (Hạn mức: 0 đ). Không thể gửi yêu cầu duyệt vượt hạn mức (CUS-007).";

    public static string RequestedLimitTooLow(decimal required) =>
        $"Hạn mức đề xuất phải từ {required:N0} đ trở lên (bằng dư nợ hiện tại + nợ mới dự kiến).";

    public static string NewLimitBelowCurrent(decimal current) =>
        $"Hạn mức mới thấp hơn hạn mức hiện tại của khách hàng ({current:N0} đ), không thể duyệt nâng hạn mức (E62.1).";

    public const string InvalidApprovalType = "Loại duyệt không hợp lệ (chỉ ONE_TIME hoặc NEW_LIMIT).";

    // Dùng ở POS khi gửi kèm CreditRequestId
    public static string UseWrongCustomer(string code) =>
        $"Yêu cầu {code} được duyệt cho khách hàng khác, không dùng được cho hóa đơn này.";

    public static string UseNotOneTime(string code) =>
        $"Yêu cầu {code} chưa được duyệt ngoại lệ một lần, không dùng được cho hóa đơn này.";

    public static string UseAlreadyUsed(string code) =>
        $"Ngoại lệ một lần của yêu cầu {code} đã được dùng cho một hóa đơn khác.";

    public static string UseOverApproved(string code, decimal ceiling, decimal projected) =>
        $"Dư nợ sau hóa đơn ({projected:N0} đ) vượt mức đã duyệt theo yêu cầu {code} ({ceiling:N0} đ). Vui lòng tăng tiền trả hoặc gửi yêu cầu mới.";
}
