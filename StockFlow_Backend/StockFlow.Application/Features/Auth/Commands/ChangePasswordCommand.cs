using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Auth.Commands;

/// <summary>
/// Đổi mật khẩu của chính tài khoản đang đăng nhập (UC-50 – Quản lý tài khoản &amp; bảo mật).
/// Người dùng lấy từ JWT qua ICurrentUserService, không nhận UserId từ body (không đổi được mật khẩu người khác).
/// Admin đặt lại mật khẩu nhân viên dùng ResetStaffPasswordCommand (luồng khác).
/// </summary>
public record ChangePasswordCommand(string CurrentPassword, string NewPassword, string ConfirmNewPassword)
    : IRequest<Result<bool>>;

public class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordCommandValidator()
    {
        // BR-37: bắt buộc nhập mật khẩu hiện tại (đúng/sai kiểm trong handler vì cần đọc DB)
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Vui lòng nhập mật khẩu hiện tại.");

        // BR-35: tối thiểu 8 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt
        RuleFor(x => x.NewPassword)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng nhập mật khẩu mới.")
            .StrongPassword("Mật khẩu mới")
            // BR-36 (kiểm nhanh): khác chuỗi mật khẩu hiện tại vừa nhập; handler kiểm lại với hash trong DB
            .NotEqual(x => x.CurrentPassword).WithMessage("Mật khẩu mới không được trùng mật khẩu hiện tại (BR-36).");

        RuleFor(x => x.ConfirmNewPassword)
            .NotEmpty().WithMessage("Vui lòng nhập lại mật khẩu mới.")
            .Equal(x => x.NewPassword).WithMessage("Xác nhận mật khẩu mới không khớp.");
    }
}

public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<ChangePasswordCommandHandler> _logger;

    public ChangePasswordCommandHandler(
        IStockFlowDbContext context,
        IPasswordHasher passwordHasher,
        ICurrentUserService currentUser,
        ILogger<ChangePasswordCommandHandler> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(ChangePasswordCommand command, CancellationToken cancellationToken)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");
        var userId = _currentUser.UserId.Value;

        var user = await _context.SecUsers.FirstOrDefaultAsync(u => u.UserId == userId, cancellationToken);
        if (user == null)
            return Result.Failure<bool>("Không tìm thấy tài khoản.");

        // Token còn hạn nhưng tài khoản đã bị khóa: không cho đổi mật khẩu
        if (user.IsActive == false)
            return Result.Failure<bool>("Tài khoản đang bị khóa, không thể đổi mật khẩu.");

        // BR-37: xác thực mật khẩu hiện tại bằng cơ chế băm hiện có của dự án (BCrypt qua IPasswordHasher)
        if (string.IsNullOrEmpty(user.PasswordHash) || !_passwordHasher.Verify(command.CurrentPassword, user.PasswordHash))
        {
            _logger.LogWarning("AUDIT ChangePassword thất bại: sai mật khẩu hiện tại. UserId={UserId}, Username={Username}",
                userId, user.Username);
            return Result.Failure<bool>("Mật khẩu hiện tại không chính xác (BR-37).");
        }

        // BR-36: mật khẩu mới không được trùng mật khẩu đang lưu
        if (_passwordHasher.Verify(command.NewPassword, user.PasswordHash))
            return Result.Failure<bool>("Mật khẩu mới không được trùng mật khẩu hiện tại (BR-36).");

        user.PasswordHash = _passwordHasher.Hash(command.NewPassword);
        user.UpdatedAt = VietnamTime.Now;
        await _context.SaveChangesAsync(cancellationToken);

        // BR-38: ghi nhật ký hệ thống. Dự án chưa có bảng audit log nên ghi log có cấu trúc (không thêm bảng ngoài phạm vi).
        // Không bao giờ ghi mật khẩu (kể cả dạng băm) vào log.
        _logger.LogInformation("AUDIT ChangePassword thành công. UserId={UserId}, Username={Username}, At={At}",
            userId, user.Username, user.UpdatedAt);

        return Result.Success(true);
    }
}
