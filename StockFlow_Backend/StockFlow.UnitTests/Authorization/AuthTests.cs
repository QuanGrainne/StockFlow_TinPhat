using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Auth.Commands;
using StockFlow.Application.Features.Auth.DTOs;
using StockFlow.Infrastructure.Services;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Authorization;

/// <summary>
/// Report 5.1 – sheet Login (TamDM): đăng nhập bằng tên đăng nhập, email hoặc mã nhân viên.
/// Mật khẩu kiểm bằng BcryptPasswordHasher thật, quyền tính bằng UserPermissionService thật; chỉ phần ký JWT được mock (cần khóa bí mật).
/// UTCID05 theo D.1: lỗi theo từng trường của LoginCommandValidator ("Dữ liệu không hợp lệ." + 400 là của middleware → API test).
/// </summary>
public class LoginTests
{
    private const string Function = "Login";

    private static async Task<Result<LoginResponse>> Login(string username, string password)
    {
        var db = AuthData.Db();
        var jwt = new Mock<IJwtTokenGenerator>();
        jwt.Setup(j => j.GenerateToken(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<IEnumerable<string>>(), It.IsAny<IEnumerable<int>>()))
            .Returns("jwt-test-token");
        return await new LoginCommandHandler(db, AuthData.Hasher, jwt.Object, new UserPermissionService(db))
            .Handle(new LoginCommand(username, password), CancellationToken.None);
    }

    private static void AssertAdmin(Result<LoginResponse> r)
    {
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("jwt-test-token", r.Value!.Token);
        Assert.Equal(new[] { "Admin" }, r.Value.Roles);
        Assert.Equal(45, r.Value.Permissions!.Count);
    }

    [Fact(DisplayName = "Login/UTCID01 – admin / TinPhat@2026: token, roles [Admin], 45 quyền")]
    [Trait("Function", Function)][Trait("UTCID", "Login/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Username_LoggedIn() => AssertAdmin(await Login("admin", AuthData.DefaultPassword));

    [Fact(DisplayName = "Login/UTCID02 – đăng nhập bằng email admin@tinphat.vn")]
    [Trait("Function", Function)][Trait("UTCID", "Login/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_Email_LoggedIn() => AssertAdmin(await Login("admin@tinphat.vn", AuthData.DefaultPassword));

    [Fact(DisplayName = "Login/UTCID03 – đăng nhập bằng mã nhân viên NV-NV004: roles [WarehouseStaff], kho K001, K002")]
    [Trait("Function", Function)][Trait("UTCID", "Login/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_StaffCode_LoggedIn()
    {
        var r = await Login("NV-NV004", AuthData.DefaultPassword);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(new[] { "WarehouseStaff" }, r.Value!.Roles);
        Assert.Equal("NV-NV004", r.Value.Code);
        Assert.Equal(new[] { "K001", "K002" }, r.Value.Warehouses.Select(w => w.WarehouseCode).OrderBy(c => c));
    }

    [Fact(DisplayName = "Login/UTCID04 – \"  ADMIN  \" (chữ hoa, có khoảng trắng)")]
    [Trait("Function", Function)][Trait("UTCID", "Login/UTCID04")][Trait("Type", "B")]
    public async Task UTCID04_UpperCaseWithSpaces_LoggedIn() => AssertAdmin(await Login("  ADMIN  ", AuthData.DefaultPassword));

    [Fact(DisplayName = "Login/UTCID05 – tên đăng nhập và mật khẩu trống (validator, câu chữ D.1)")]
    [Trait("Function", Function)][Trait("UTCID", "Login/UTCID05")][Trait("Type", "A")]
    public void UTCID05_Empty_ValidatorRejects()
    {
        var errors = new LoginCommandValidator().Validate(new LoginCommand("", "")).Errors.Select(e => e.ErrorMessage).ToList();
        Assert.Contains("Tên đăng nhập không được để trống.", errors);
        Assert.Contains("Mật khẩu không được để trống.", errors);
    }

    [Fact(DisplayName = "Login/UTCID06 – tài khoản không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "Login/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_UnknownUser_ReturnsError()
    {
        var r = await Login("khongtontai", "SaiMatKhau@1");
        Assert.False(r.IsSuccess);
        Assert.Equal("Tên đăng nhập hoặc mật khẩu không chính xác.", r.Error);
    }

    [Fact(DisplayName = "Login/UTCID07 – tài khoản locked01 bị khóa")]
    [Trait("Function", Function)][Trait("UTCID", "Login/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_Locked_ReturnsError()
    {
        var r = await Login("locked01", AuthData.DefaultPassword);
        Assert.False(r.IsSuccess);
        Assert.Equal("Tài khoản của bạn đã bị vô hiệu hóa.", r.Error);
    }
}

/// <summary>
/// Report 5.1 – sheet ChangePassword (QuanDN): đổi mật khẩu của người đang đăng nhập (UC-03, BR-35, BR-36, BR-37).
/// sales01 mật khẩu Abc@12345. Ca 04, 05 là luật của ChangePasswordCommandValidator; ca 03 có ở cả validator và handler.
/// </summary>
public class ChangePasswordTests
{
    private const string Function = "ChangePassword";

    private static async Task<(TestStockFlowDbContext Db, Result<bool> R)> Change(string current, string newPassword, string confirm, bool locked = false)
    {
        var db = AuthData.Db();
        if (locked)
        {
            db.SecUsers.Single(u => u.UserId == AuthData.Sales).IsActive = false;
            TestData.SaveAndDetach(db);
        }
        var user = CurrentUser.WithWarehouses(AuthData.Sales, TestData.K001);
        var r = await new ChangePasswordCommandHandler(db, AuthData.Hasher, user.Object, NullLogger<ChangePasswordCommandHandler>.Instance)
            .Handle(new ChangePasswordCommand(current, newPassword, confirm), CancellationToken.None);
        return (db, r);
    }

    private static List<string> Errors(string current, string newPassword, string confirm) =>
        new ChangePasswordCommandValidator().Validate(new ChangePasswordCommand(current, newPassword, confirm)).Errors.Select(e => e.ErrorMessage).ToList();

    private static string StoredHash(TestStockFlowDbContext db) => db.SecUsers.AsNoTracking().Single(u => u.UserId == AuthData.Sales).PasswordHash!;

    [Fact(DisplayName = "ChangePassword/UTCID01 – Abc@12345 → Xyz@67890: lưu hash BCrypt mới")]
    [Trait("Function", Function)][Trait("UTCID", "ChangePassword/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Valid_Changed()
    {
        Assert.Empty(Errors(AuthData.SalesPassword, "Xyz@67890", "Xyz@67890"));
        var (db, r) = await Change(AuthData.SalesPassword, "Xyz@67890", "Xyz@67890");
        Assert.True(r.IsSuccess, r.Error);
        Assert.True(AuthData.Hasher.Verify("Xyz@67890", StoredHash(db)));
    }

    [Fact(DisplayName = "ChangePassword/UTCID02 – mật khẩu hiện tại sai")]
    [Trait("Function", Function)][Trait("UTCID", "ChangePassword/UTCID02")][Trait("Type", "A")]
    public async Task UTCID02_WrongCurrent_ReturnsError()
    {
        var (db, r) = await Change("Wrong@111", "Xyz@67890", "Xyz@67890");
        Assert.False(r.IsSuccess);
        Assert.Equal("Mật khẩu hiện tại không chính xác (BR-37).", r.Error);
        Assert.True(AuthData.Hasher.Verify(AuthData.SalesPassword, StoredHash(db)));
    }

    [Fact(DisplayName = "ChangePassword/UTCID03 – mật khẩu mới trùng mật khẩu hiện tại")]
    [Trait("Function", Function)][Trait("UTCID", "ChangePassword/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_SameAsCurrent_ReturnsError()
    {
        const string message = "Mật khẩu mới không được trùng mật khẩu hiện tại (BR-36).";
        Assert.Contains(message, Errors(AuthData.SalesPassword, AuthData.SalesPassword, AuthData.SalesPassword));
        var (_, r) = await Change(AuthData.SalesPassword, AuthData.SalesPassword, AuthData.SalesPassword);
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
    }

    [Fact(DisplayName = "ChangePassword/UTCID04 – xác nhận không khớp (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "ChangePassword/UTCID04")][Trait("Type", "A")]
    public void UTCID04_ConfirmMismatch_ValidatorRejects() =>
        Assert.Contains("Xác nhận mật khẩu mới không khớp.", Errors(AuthData.SalesPassword, "Xyz@67890", "Xyz@67891"));

    [Fact(DisplayName = "ChangePassword/UTCID05 – mật khẩu mới không có chữ in hoa (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "ChangePassword/UTCID05")][Trait("Type", "A")]
    public void UTCID05_NoUpperCase_ValidatorRejects() =>
        Assert.Contains("Mật khẩu mới phải có ít nhất 1 chữ in hoa (BR-35).", Errors(AuthData.SalesPassword, "xyz@67890", "xyz@67890"));

    [Fact(DisplayName = "ChangePassword/UTCID06 – mật khẩu mới đúng độ dài tối thiểu (8), đủ hoa / thường / số / ký tự đặc biệt")]
    [Trait("Function", Function)][Trait("UTCID", "ChangePassword/UTCID06")][Trait("Type", "B")]
    public async Task UTCID06_MinimumLength_Changed()
    {
        var minimal = "Aa1@" + new string('b', PasswordPolicy.MinLength - 4);
        Assert.Equal(PasswordPolicy.MinLength, minimal.Length);
        Assert.Empty(Errors(AuthData.SalesPassword, minimal, minimal));
        var (db, r) = await Change(AuthData.SalesPassword, minimal, minimal);
        Assert.True(r.IsSuccess, r.Error);
        Assert.True(AuthData.Hasher.Verify(minimal, StoredHash(db)));
    }

    [Fact(DisplayName = "ChangePassword/UTCID07 – tài khoản sales01 bị khóa sau khi đăng nhập")]
    [Trait("Function", Function)][Trait("UTCID", "ChangePassword/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_Locked_ReturnsError()
    {
        var (_, r) = await Change(AuthData.SalesPassword, "Xyz@67890", "Xyz@67890", locked: true);
        Assert.False(r.IsSuccess);
        Assert.Equal("Tài khoản đang bị khóa, không thể đổi mật khẩu.", r.Error);
    }
}
