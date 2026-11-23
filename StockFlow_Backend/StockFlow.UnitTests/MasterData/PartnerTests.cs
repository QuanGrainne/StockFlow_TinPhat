using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Features.Customers.Commands;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Application.Features.Customers.Helpers;
using StockFlow.Application.Features.Suppliers.Commands;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using StockFlow.UnitTests.Finance;
using Xunit;

namespace StockFlow.UnitTests.MasterData;

/// <summary>
/// Report 5.1 – sheet CreateCustomer (DatTD): tạo khách hàng (UC-54, BR-06). Ca 03–06 là luật của CreateCustomerCommandValidator.
/// UTCID07 theo câu chữ D.1 (tiền tố "CUSTOMER_CODE_EXISTS:" để FE nhận diện).
/// </summary>
public class CreateCustomerTests
{
    private const string Function = "CreateCustomer";

    private static CreateCustomerRequest Req(string name = "Công ty Hoa Mai", string? phone = "0912345678", string? email = null,
        string? code = null, decimal? creditLimit = null) =>
        new() { Name = name, Phone = phone, Email = email, Code = code, CreditLimit = creditLimit };

    private static async Task<(TestStockFlowDbContext Db, Result<CustomerDto> R)> Create(CreateCustomerRequest req)
    {
        var db = ReceiptData.Db(0);
        var r = await new CreateCustomerCommandHandler(db, ReceiptData.User().Object).Handle(new CreateCustomerCommand(req), CancellationToken.None);
        return (db, r);
    }

    private static IEnumerable<string> Errors(CreateCustomerRequest req) =>
        new CreateCustomerCommandValidator().Validate(new CreateCustomerCommand(req)).Errors.Select(e => e.ErrorMessage);

    [Fact(DisplayName = "CreateCustomer/UTCID01 – \"Công ty Hoa Mai\", 0912345678, không nhập mã: mã KHxxxxx, ACTIVE, hạn mức mặc định")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomer/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_ValidCustomer_Created()
    {
        Assert.Empty(Errors(Req()));
        var (db, r) = await Create(Req());
        Assert.True(r.IsSuccess, r.Error);
        var saved = await db.MstBusinessPartners.AsNoTracking().SingleAsync(p => p.PartnerName == "Công ty Hoa Mai");
        Assert.Matches(@"^KH\d{5}$", saved.PartnerCode);
        Assert.Equal("CUSTOMER", saved.PartnerType);
        Assert.True(saved.IsActive);
        Assert.Equal(CustomerCreditPolicy.DefaultCreditLimit, saved.CreditLimit);
        Assert.Single(db.TrxCreditLimitHistories.AsNoTracking());
    }

    [Fact(DisplayName = "CreateCustomer/UTCID02 – tên 2 ký tự \"An\", email an@tinphat.vn: tạo được")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomer/UTCID02")][Trait("Type", "B")]
    public async Task UTCID02_TwoCharName_Created()
    {
        var req = Req(name: "An", phone: null, email: "an@tinphat.vn");
        Assert.Empty(Errors(req));
        var (db, r) = await Create(req);
        Assert.True(r.IsSuccess, r.Error);
        Assert.True(await db.MstBusinessPartners.AnyAsync(p => p.PartnerName == "An" && p.Email == "an@tinphat.vn"));
    }

    [Fact(DisplayName = "CreateCustomer/UTCID03 – tên chỉ có khoảng trắng (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomer/UTCID03")][Trait("Type", "A")]
    public void UTCID03_BlankName_ValidatorRejects() =>
        // Nhóm chốt 24/11/2026 theo thực tế: FluentValidation NotEmpty coi chuỗi toàn khoảng trắng là rỗng và dừng ở luật đầu
        Assert.Contains("Tên khách hàng không được để trống.", Errors(Req(name: "   ")));

    [Fact(DisplayName = "CreateCustomer/UTCID04 – không có số điện thoại và email (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomer/UTCID04")][Trait("Type", "A")]
    public void UTCID04_NoContact_ValidatorRejects() =>
        Assert.Contains("Cần cung cấp ít nhất một phương thức liên hệ (Số điện thoại hoặc Email).", Errors(Req(phone: null)));

    [Fact(DisplayName = "CreateCustomer/UTCID05 – số điện thoại \"12345\" (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomer/UTCID05")][Trait("Type", "A")]
    public void UTCID05_InvalidPhone_ValidatorRejects() =>
        Assert.Contains("Số điện thoại không đúng định dạng (từ 10-11 số, ví dụ: 0912 345 678 hoặc +84912345678).", Errors(Req(phone: "12345")));

    [Fact(DisplayName = "CreateCustomer/UTCID06 – hạn mức −1 (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomer/UTCID06")][Trait("Type", "A")]
    public void UTCID06_NegativeLimit_ValidatorRejects() =>
        Assert.Contains("Hạn mức tín dụng không được âm.", Errors(Req(creditLimit: -1)));

    [Fact(DisplayName = "CreateCustomer/UTCID07 – mã KH-HM01 đã tồn tại (câu chữ D.1)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomer/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_DuplicateCode_ReturnsError()
    {
        var (db, r) = await Create(Req(code: "KH-HM01"));
        Assert.False(r.IsSuccess);
        Assert.Equal("CUSTOMER_CODE_EXISTS:Mã khách hàng 'KH-HM01' đã tồn tại trong hệ thống.", r.Error);
        Assert.False(await db.MstBusinessPartners.AnyAsync(p => p.PartnerName == "Công ty Hoa Mai"));
    }
}

/// <summary>Report 5.1 – sheet DeleteCustomer (DatTD): xóa hẳn khi chưa có đơn và dư nợ 0; ngược lại chỉ ngừng hoạt động.</summary>
public class DeleteCustomerTests
{
    private const string Function = "DeleteCustomer";

    private static Task<Result<bool>> Delete(TestStockFlowDbContext db, int id) =>
        new CustomerStatusCommandsHandler(db).Handle(new DeleteCustomerCommand(id), CancellationToken.None);

    private static MstBusinessPartner? Find(TestStockFlowDbContext db, int id) =>
        db.MstBusinessPartners.AsNoTracking().SingleOrDefault(p => p.PartnerId == id);

    [Fact(DisplayName = "DeleteCustomer/UTCID01 – khách chưa có đơn, dư nợ 0: xóa dòng")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteCustomer/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_NoOrdersNoDebt_HardDeleted()
    {
        var db = ReceiptData.Db(0);
        var r = await Delete(db, SalesData.KhHm01);
        Assert.True(r.IsSuccess, r.Error);
        Assert.True(r.Value);
        Assert.Null(Find(db, SalesData.KhHm01));
    }

    [Fact(DisplayName = "DeleteCustomer/UTCID02 – khách đã có đơn: giữ lại, IsActive = false")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteCustomer/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_HasOrders_SoftDeleted()
    {
        var db = ReceiptData.Db(0);
        SalesData.AddBooking(db, "DH0001", SalesData.KhHm01, TestData.K001, "DRAFT", new[] { (TestData.PTest, 1m, 10_000m) });
        var r = await Delete(db, SalesData.KhHm01);
        Assert.True(r.IsSuccess, r.Error);
        Assert.False(Find(db, SalesData.KhHm01)!.IsActive);
    }

    [Fact(DisplayName = "DeleteCustomer/UTCID03 – khách chưa có đơn, dư nợ 1 đ: giữ lại, IsActive = false")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteCustomer/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_DebtOne_SoftDeleted()
    {
        var db = ReceiptData.Db(1);
        var r = await Delete(db, SalesData.KhHm01);
        Assert.True(r.IsSuccess, r.Error);
        Assert.False(Find(db, SalesData.KhHm01)!.IsActive);
    }

    [Fact(DisplayName = "DeleteCustomer/UTCID04 – PartnerId 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteCustomer/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_Unknown_ReturnsError()
    {
        var r = await Delete(ReceiptData.Db(0), 999_999);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy khách hàng #999999", r.Error);
    }

    [Fact(DisplayName = "DeleteCustomer/UTCID05 – PartnerId của nhà cung cấp")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteCustomer/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_SupplierId_ReturnsError()
    {
        var db = ReceiptData.Db(0);
        PurchaseData.SeedPartners(db);
        var r = await Delete(db, PurchaseData.Supplier1);
        Assert.False(r.IsSuccess);
        Assert.Equal($"Không tìm thấy khách hàng #{PurchaseData.Supplier1}", r.Error);
        Assert.NotNull(Find(db, PurchaseData.Supplier1));
    }
}

/// <summary>Report 5.1 – sheet DeleteSupplier (DatTD): xóa hẳn NCC chưa có phiếu nhập và công nợ 0; ngược lại ngừng hoạt động.</summary>
public class DeleteSupplierTests
{
    private const string Function = "DeleteSupplier";

    private static Task<Result<bool>> Delete(TestStockFlowDbContext db, int id) =>
        new DeleteSupplierCommandHandler(db).Handle(new DeleteSupplierCommand(id), CancellationToken.None);

    private static MstBusinessPartner? Find(TestStockFlowDbContext db, int id) =>
        db.MstBusinessPartners.AsNoTracking().SingleOrDefault(p => p.PartnerId == id);

    [Fact(DisplayName = "DeleteSupplier/UTCID01 – NCC chưa có phiếu nhập, công nợ 0: xóa dòng")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteSupplier/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_NoReceiptsNoPayable_HardDeleted()
    {
        var db = PurchaseData.Db();
        var r = await Delete(db, PurchaseData.Supplier1);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Null(Find(db, PurchaseData.Supplier1));
    }

    [Fact(DisplayName = "DeleteSupplier/UTCID02 – NCC đã có phiếu nhập: giữ lại, IsActive = false")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteSupplier/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_HasReceipts_Deactivated()
    {
        var db = PurchaseData.Db();
        PurchaseData.AddReceipt(db, "PN000001", "DRAFT", new[] { (TestData.PTest, 1m, 1000m) });
        var r = await Delete(db, PurchaseData.Supplier1);
        Assert.True(r.IsSuccess, r.Error);
        Assert.False(Find(db, PurchaseData.Supplier1)!.IsActive);
    }

    [Fact(DisplayName = "DeleteSupplier/UTCID03 – NCC chưa có phiếu nhập, công nợ 1 đ: giữ lại, IsActive = false")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteSupplier/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_PayableOne_Deactivated()
    {
        var db = PurchaseData.Db(supplier1Payable: 1);
        var r = await Delete(db, PurchaseData.Supplier1);
        Assert.True(r.IsSuccess, r.Error);
        Assert.False(Find(db, PurchaseData.Supplier1)!.IsActive);
    }

    [Fact(DisplayName = "DeleteSupplier/UTCID04 – PartnerId 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteSupplier/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_Unknown_ReturnsError()
    {
        var r = await Delete(PurchaseData.Db(), 999_999);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy thông tin nhà cung cấp.", r.Error);
    }
}
