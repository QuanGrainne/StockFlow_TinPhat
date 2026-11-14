using FluentValidation;

namespace StockFlow.Application.Common;

/// <summary>
/// Quy tắc độ mạnh mật khẩu dùng chung (BR-35): tối thiểu 8 ký tự, có chữ in hoa, chữ thường, chữ số và ký tự đặc biệt.
/// Dùng cho: người dùng tự đổi mật khẩu (ChangePasswordCommand) và Admin đặt mật khẩu cho nhân viên
/// (CreateStaff / UpdateStaff / ResetStaffPassword). Frontend có bản tương ứng ở lib/auth/passwordPolicy.ts.
/// </summary>
public static class PasswordPolicy
{
    public const int MinLength = 8;

    public static IRuleBuilderOptions<T, string> StrongPassword<T>(this IRuleBuilder<T, string> rule, string fieldLabel = "Mật khẩu")
        => rule
            .MinimumLength(MinLength).WithMessage($"{fieldLabel} phải có tối thiểu {MinLength} ký tự (BR-35).")
            .Matches("[A-Z]").WithMessage($"{fieldLabel} phải có ít nhất 1 chữ in hoa (BR-35).")
            .Matches("[a-z]").WithMessage($"{fieldLabel} phải có ít nhất 1 chữ thường (BR-35).")
            .Matches("[0-9]").WithMessage($"{fieldLabel} phải có ít nhất 1 chữ số (BR-35).")
            .Matches("[^A-Za-z0-9]").WithMessage($"{fieldLabel} phải có ít nhất 1 ký tự đặc biệt (BR-35).");
}
