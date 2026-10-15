using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Auth.DTOs;

namespace StockFlow.Application.Features.Auth.Commands;

public record LoginCommand(string Username, string Password) : IRequest<Result<LoginResponse>>;

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Tên đăng nhập không được để trống.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Mật khẩu không được để trống.");
    }
}

public class LoginCommandHandler : IRequestHandler<LoginCommand, Result<LoginResponse>>
{
    private readonly IStockFlowDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public LoginCommandHandler(
        IStockFlowDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<Result<LoginResponse>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.SecUsers
            .Include(u => u.JncUserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.JncUserWarehouseAccesses)
                .ThenInclude(wa => wa.Warehouse)
            .FirstOrDefaultAsync(u => u.Username == request.Username, cancellationToken);

        if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Result.Failure<LoginResponse>("Tên đăng nhập hoặc mật khẩu không chính xác.");
        }

        if (user.IsActive == false)
        {
            return Result.Failure<LoginResponse>("Tài khoản của bạn đã bị vô hiệu hóa.");
        }

        var roles = user.JncUserRoles
            .Where(r => r.Role != null && !string.IsNullOrEmpty(r.Role.RoleName))
            .Select(r => r.Role.RoleName!)
            .ToList();

        var warehouses = user.JncUserWarehouseAccesses
            .Where(w => w.Warehouse != null)
            .Select(w => new WarehouseSummaryDto(
                w.WarehouseId,
                w.Warehouse.WarehouseCode ?? "",
                w.Warehouse.WarehouseName ?? ""))
            .ToList();

        var warehouseIds = warehouses.Select(w => w.WarehouseId);

        var token = _jwtTokenGenerator.GenerateToken(
            user.UserId,
            user.Username ?? "",
            user.FullName ?? "",
            roles,
            warehouseIds);

        var response = new LoginResponse(
            token,
            user.UserId,
            user.Username ?? "",
            user.FullName ?? "",
            user.Email ?? "",
            roles,
            warehouses);

        return Result.Success(response);
    }
}
