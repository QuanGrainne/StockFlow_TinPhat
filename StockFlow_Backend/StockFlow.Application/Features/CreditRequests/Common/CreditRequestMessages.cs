namespace StockFlow.Application.Features.CreditRequests.Common;

/// <summary>
/// Thông báo của luồng duyệt hạn mức (HM-01). Văn bản dịch từ SRS Report 3 revised, mục 5.2 System Messages:
///   MSG23 Credit request submitted to the Manager.
///   MSG56 Your decision has been recorded.
///   MSG57 This request has already been processed.
/// MSG22 (popup vượt hạn mức), MSG24 (đã duyệt), MSG25 (bị từ chối) hiển thị ở frontend
/// (features/credit-requests/utils/creditRequestUtils.ts).
/// Câu không có mã MSG trong SRS ghi theo mã luồng (E62.1) hoặc mã POS hiện có (CUS-xxx, PAY-xxx).
/// </summary>
public static class CreditRequestMessages
{
    // MSG23 – Toast (Success): Credit request submitted to the Manager.
    public const string Submitted = "Đã gửi yêu cầu duyệt tín dụng tới Kế toán trưởng (MSG23).";

    // MSG56 – Toast (Success): Your decision has been recorded. (dùng cho cả duyệt và từ chối)
    public const string DecisionRecorded = "Đã ghi nhận quyết định của bạn (MSG56).";

    // MSG57 – Toast (Error): This request has already been processed.
    public const string AlreadyProcessed = "Yêu cầu này đã được xử lý (MSG57).";

    // E62.1: từ chối không có lý do / hạn mức mới thấp hơn hạn mức hiện tại → không lưu quyết định
    public const string RejectReasonRequired = "Vui lòng nhập lý do từ chối (E62.1).";

    public static string NewLimitBelowCurrent(decimal current) =>
        $"Hạn mức mới thấp hơn hạn mức hiện tại của khách hàng ({current:N0} đ), không thể duyệt nâng hạn mức (E62.1).";

    public static string OneTimeCeilingTooLow(decimal current) =>
        $"Mức dư nợ tối đa duyệt cho ngoại lệ phải lớn hơn hạn mức hiện tại của khách hàng ({current:N0} đ).";

    // Kiểm tra khi gửi yêu cầu (UC-27) – SRS không có mã MSG riêng
    public const string ReasonRequired = "Vui lòng nhập lý do gửi yêu cầu duyệt tín dụng.";
    public const string NotOverLimit =
        "Khoản nợ dự kiến chưa vượt hạn mức tín dụng của khách hàng, không cần gửi yêu cầu duyệt (BR-12).";

    public static string RequestedLimitTooLow(decimal required) =>
        $"Hạn mức đề xuất phải từ {required:N0} đ trở lên (bằng dư nợ hiện tại + nợ mới dự kiến).";

    public const string NotFound = "Không tìm thấy yêu cầu duyệt tín dụng.";
    public const string UserUnknown = "Không xác định được người dùng đăng nhập.";
    public const string CustomerNotFound = "Không tìm thấy thông tin khách hàng trong hệ thống (CUS-002).";
    public const string CustomerInactive = "Khách hàng đang ngừng hoạt động, không thể gửi yêu cầu (CUS-003).";
    public const string WalkInNotAllowed = "Khách lẻ không áp dụng ghi nợ nên không gửi yêu cầu duyệt tín dụng (PAY-009).";
    public const string ZeroLimit =
        "Khách hàng không có hạn mức tín dụng (Hạn mức: 0 đ). Không thể gửi yêu cầu duyệt vượt hạn mức (CUS-007).";

    public const string InvalidApprovalType = "Loại duyệt không hợp lệ (chỉ ONE_TIME hoặc NEW_LIMIT).";

    // Dùng ở POS khi gửi kèm CreditRequestId (BR-12: ngoại lệ đã duyệt cho đúng giao dịch)
    public static string UseWrongCustomer(string code) =>
        $"Yêu cầu {code} được duyệt cho khách hàng khác, không dùng được cho hóa đơn này.";

    public static string UseNotOneTime(string code) =>
        $"Yêu cầu {code} chưa được duyệt ngoại lệ một lần, không dùng được cho hóa đơn này.";

    public static string UseAlreadyUsed(string code) =>
        $"Ngoại lệ một lần của yêu cầu {code} đã được dùng cho một hóa đơn khác.";

    public static string UseOverApproved(string code, decimal ceiling, decimal projected) =>
        $"Dư nợ sau hóa đơn ({projected:N0} đ) vượt mức đã duyệt theo yêu cầu {code} ({ceiling:N0} đ). Vui lòng tăng tiền trả hoặc gửi yêu cầu mới.";
}
