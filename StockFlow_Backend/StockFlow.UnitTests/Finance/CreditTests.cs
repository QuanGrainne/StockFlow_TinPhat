using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Features.CreditRequests.Commands;
using StockFlow.Application.Features.CreditRequests.Common;
using StockFlow.Application.Features.CreditRequests.DTOs;
using StockFlow.Application.Features.Customers.Commands;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.Infrastructure.Services;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Finance;

internal static class CreditData
{
    public const int WalkIn = 12;
    public const int ZeroLimit = 13;
    public const int Inactive = 14;
    public const int Third = 15;

    /// <summary>KH-HM01 hạn mức 10.000.000, dư nợ theo tham số; KH-HM02; khách lẻ KH00000; KH-ZERO hạn mức 0; KH-OFF ngừng hoạt động; KH-03.</summary>
    public static TestStockFlowDbContext Db(decimal debt = 9_000_000)
    {
        var db = ReceiptData.Db(debt);
        db.MstBusinessPartners.AddRange(
            new MstBusinessPartner { PartnerId = WalkIn, PartnerCode = "KH00000", PartnerName = "Khách lẻ", PartnerType = "CUSTOMER", CreditLimit = 0, CurrentDebt = 0, IsActive = true },
            new MstBusinessPartner { PartnerId = ZeroLimit, PartnerCode = "KH-ZERO", PartnerName = "Khách không hạn mức", PartnerType = "CUSTOMER", CreditLimit = 0, CurrentDebt = 0, IsActive = true },
            new MstBusinessPartner { PartnerId = Inactive, PartnerCode = "KH-OFF", PartnerName = "Khách ngừng hoạt động", PartnerType = "CUSTOMER", CreditLimit = 10_000_000, CurrentDebt = 0, IsActive = false },
            new MstBusinessPartner { PartnerId = Third, PartnerCode = "KH-03", PartnerName = "Khách hàng 03", PartnerType = "CUSTOMER", CreditLimit = 2_000_000, CurrentDebt = 0, IsActive = true });
        TestData.SaveAndDetach(db);
        return db;
    }

    public static decimal Limit(TestStockFlowDbContext db, int partnerId = SalesData.KhHm01) =>
        db.MstBusinessPartners.AsNoTracking().Single(p => p.PartnerId == partnerId).CreditLimit ?? 0;

    /// <summary>Yêu cầu duyệt tín dụng của KH-HM01: hạn mức hiện tại 10.000.000, đề xuất 12.000.000.</summary>
    public static int AddRequest(TestStockFlowDbContext db, string code, string status)
    {
        var request = new TrxCreditLimitRequest
        {
            RequestCode = code, PartnerId = SalesData.KhHm01, RequestedBy = TestData.OtherUserId, CurrentLimit = 10_000_000,
            RequestedLimit = 12_000_000, Reason = "Khách quen", Status = status, RequestDate = VietnamTime.Now.AddHours(-2),
        };
        db.TrxCreditLimitRequests.Add(request);
        TestData.SaveAndDetach(db);
        return request.RequestId;
    }

    public static TrxCreditLimitRequest Request(TestStockFlowDbContext db, int id) =>
        db.TrxCreditLimitRequests.AsNoTracking().Single(r => r.RequestId == id);
}

/// <summary>Report 5.1 – sheet CreateCreditRequest (DatTD): gửi yêu cầu duyệt tín dụng khi nợ dự kiến vượt hạn mức (UC-27, BR-12, BR-13).</summary>
public class CreateCreditRequestTests
{
    private const string Function = "CreateCreditRequest";

    private static CreateCreditRequestRequest Req(int partnerId = SalesData.KhHm01, decimal expected = 2_000_000, decimal? requested = 12_000_000,
        string reason = "Khách quen") =>
        new() { PartnerId = partnerId, ExpectedNewDebt = expected, RequestedLimit = requested, Reason = reason };

    private static async Task<(TestStockFlowDbContext Db, Result<CreditRequestActionResultDto> R)> Run(CreateCreditRequestRequest req)
    {
        var db = CreditData.Db();
        var r = await new CreateCreditRequestCommandHandler(db, new TransactionCodeGenerator(db), ReceiptData.User().Object)
            .Handle(new CreateCreditRequestCommand(req), CancellationToken.None);
        return (db, r);
    }

    private static async Task AssertRejected(CreateCreditRequestRequest req, string message)
    {
        var (db, r) = await Run(req);
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        Assert.Empty(db.TrxCreditLimitRequests.AsNoTracking());
    }

    [Fact(DisplayName = "CreateCreditRequest/UTCID01 – dư nợ 9.000.000 + nợ mới 2.000.000 > hạn mức: yêu cầu PENDING, MSG23")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCreditRequest/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_OverLimit_RequestPending()
    {
        var (db, r) = await Run(Req());
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("Đã gửi yêu cầu duyệt tín dụng tới Kế toán trưởng (MSG23).", r.Value!.Message);
        var saved = await db.TrxCreditLimitRequests.AsNoTracking().SingleAsync();
        Assert.Equal("PENDING", saved.Status);
        Assert.Equal(12_000_000m, saved.RequestedLimit);
        Assert.Equal(10_000_000m, saved.CurrentLimit);
        Assert.Equal(TestData.UserId, saved.RequestedBy);
    }

    [Fact(DisplayName = "CreateCreditRequest/UTCID02 – nợ mới 1.000.000 (tổng đúng bằng hạn mức): chưa vượt")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCreditRequest/UTCID02")][Trait("Type", "B")]
    public Task UTCID02_EqualToLimit_ReturnsError() =>
        AssertRejected(Req(expected: 1_000_000, requested: null),
            "Khoản nợ dự kiến chưa vượt hạn mức tín dụng của khách hàng, không cần gửi yêu cầu duyệt (BR-12).");

    [Fact(DisplayName = "CreateCreditRequest/UTCID03 – lý do trống (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCreditRequest/UTCID03")][Trait("Type", "A")]
    public void UTCID03_EmptyReason_ValidatorRejects()
    {
        var r = new CreateCreditRequestCommandValidator().Validate(new CreateCreditRequestCommand(Req(reason: "")));
        Assert.Contains("Vui lòng nhập lý do gửi yêu cầu duyệt tín dụng.", r.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreateCreditRequest/UTCID04 – khách lẻ KH00000")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCreditRequest/UTCID04")][Trait("Type", "A")]
    public Task UTCID04_WalkIn_ReturnsError() =>
        AssertRejected(Req(partnerId: CreditData.WalkIn),
            "Khách lẻ không áp dụng ghi nợ nên không gửi yêu cầu duyệt tín dụng (PAY-009).");

    [Fact(DisplayName = "CreateCreditRequest/UTCID05 – KH-ZERO hạn mức 0")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCreditRequest/UTCID05")][Trait("Type", "A")]
    public Task UTCID05_ZeroLimit_ReturnsError() =>
        AssertRejected(Req(partnerId: CreditData.ZeroLimit, expected: 1_000_000, requested: null),
            "Khách hàng không có hạn mức tín dụng (Hạn mức: 0 đ). Không thể gửi yêu cầu duyệt vượt hạn mức (CUS-007).");

    [Fact(DisplayName = "CreateCreditRequest/UTCID06 – KH-OFF ngừng hoạt động")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCreditRequest/UTCID06")][Trait("Type", "A")]
    public Task UTCID06_InactiveCustomer_ReturnsError() =>
        AssertRejected(Req(partnerId: CreditData.Inactive, expected: 1_000_000, requested: null),
            "Khách hàng đang ngừng hoạt động, không thể gửi yêu cầu (CUS-003).");
}

/// <summary>
/// Report 5.1 – sheet ApproveCreditRequest (DatTD): Kế toán trưởng duyệt nâng hạn mức (UC-64, BR-13, BR-50).
/// CR1 PENDING đề xuất 12.000.000; hạn mức hiện tại của khách 10.000.000. UTCID04 theo câu chữ D.1.
/// </summary>
public class ApproveCreditRequestTests
{
    private const string Function = "ApproveCreditRequest";

    private static ApproveCreditRequestCommand Cmd(int id, decimal? limit = null) =>
        new(id, new ApproveCreditRequestRequest { ApprovalType = CreditApprovalType.NewLimit, ApprovedLimit = limit });

    private static Task<Result<CreditRequestActionResultDto>> Approve(TestStockFlowDbContext db, ApproveCreditRequestCommand cmd) =>
        new ApproveCreditRequestCommandHandler(db, ReceiptData.User().Object).Handle(cmd, CancellationToken.None);

    [Fact(DisplayName = "ApproveCreditRequest/UTCID01 – duyệt theo đề xuất: APPROVED, hạn mức 12.000.000, có lịch sử, MSG56")]
    [Trait("Function", Function)][Trait("UTCID", "ApproveCreditRequest/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_ApproveRequested_LimitRaised()
    {
        var db = CreditData.Db();
        var id = CreditData.AddRequest(db, "CR1", "PENDING");
        var r = await Approve(db, Cmd(id));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("Đã ghi nhận quyết định của bạn (MSG56).", r.Value!.Message);
        Assert.Equal("APPROVED", CreditData.Request(db, id).Status);
        Assert.Equal(12_000_000m, CreditData.Limit(db));
        var history = await db.TrxCreditLimitHistories.AsNoTracking().SingleAsync();
        Assert.Equal(10_000_000m, history.OldLimit);
        Assert.Equal(12_000_000m, history.NewLimit);
        Assert.Equal(id, history.RequestId);
    }

    [Fact(DisplayName = "ApproveCreditRequest/UTCID02 – duyệt mức 11.000.000: hạn mức 11.000.000")]
    [Trait("Function", Function)][Trait("UTCID", "ApproveCreditRequest/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_ApproveCustomLimit()
    {
        var db = CreditData.Db();
        var id = CreditData.AddRequest(db, "CR1", "PENDING");
        var r = await Approve(db, Cmd(id, 11_000_000));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("APPROVED", CreditData.Request(db, id).Status);
        Assert.Equal(11_000_000m, CreditData.Limit(db));
    }

    [Fact(DisplayName = "ApproveCreditRequest/UTCID03 – mức duyệt 0 (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "ApproveCreditRequest/UTCID03")][Trait("Type", "A")]
    public void UTCID03_ZeroLimit_ValidatorRejects()
    {
        var r = new ApproveCreditRequestCommandValidator().Validate(Cmd(1, 0));
        Assert.Contains("Mức duyệt phải lớn hơn 0.", r.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "ApproveCreditRequest/UTCID04 – mức duyệt 9.000.000 thấp hơn hạn mức hiện tại (câu chữ D.1)")]
    [Trait("Function", Function)][Trait("UTCID", "ApproveCreditRequest/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_BelowCurrent_ReturnsError()
    {
        using var _ = new VietnameseCulture();
        var db = CreditData.Db();
        var id = CreditData.AddRequest(db, "CR1", "PENDING");
        var r = await Approve(db, Cmd(id, 9_000_000));
        Assert.False(r.IsSuccess);
        Assert.Equal("Hạn mức mới thấp hơn hạn mức hiện tại của khách hàng (10.000.000 đ), không thể duyệt nâng hạn mức (E62.1).", r.Error);
        Assert.Equal("PENDING", CreditData.Request(db, id).Status);
        Assert.Equal(10_000_000m, CreditData.Limit(db));
    }

    [Fact(DisplayName = "ApproveCreditRequest/UTCID05 – CR1 đã duyệt")]
    [Trait("Function", Function)][Trait("UTCID", "ApproveCreditRequest/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_AlreadyApproved_ReturnsError()
    {
        var db = CreditData.Db();
        var id = CreditData.AddRequest(db, "CR1", "APPROVED");
        var r = await Approve(db, Cmd(id));
        Assert.False(r.IsSuccess);
        Assert.Equal("Yêu cầu này đã được xử lý (MSG57).", r.Error);
        Assert.Equal(10_000_000m, CreditData.Limit(db));
    }

    [Fact(DisplayName = "ApproveCreditRequest/UTCID06 – 2 Kế toán trưởng duyệt CR1 cùng lúc: lần 1 thành công, lần 2 MSG57 (concurrency token Status)")]
    [Trait("Function", Function)][Trait("UTCID", "ApproveCreditRequest/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_ConcurrentApprove_SecondRejected()
    {
        var db = CreditData.Db();
        var id = CreditData.AddRequest(db, "CR1", "PENDING");
        // Manager 2 mở yêu cầu (đọc lúc còn PENDING) trước khi Manager 1 lưu
        using var db2 = db.OpenSameDatabase();
        await db2.TrxCreditLimitRequests.Include(r => r.Partner).SingleAsync(r => r.RequestId == id);

        var first = await Approve(db, Cmd(id));
        var second = await Approve(db2, Cmd(id, 13_000_000));

        Assert.True(first.IsSuccess, first.Error);
        Assert.False(second.IsSuccess);
        Assert.Equal("Yêu cầu này đã được xử lý (MSG57).", second.Error);
        Assert.Equal(12_000_000m, CreditData.Limit(db));
    }
}

/// <summary>Report 5.1 – sheet RejectCreditRequest (DatTD): từ chối yêu cầu kèm lý do (E62.1); hạn mức không đổi.</summary>
public class RejectCreditRequestTests
{
    private const string Function = "RejectCreditRequest";

    private static Task<Result<CreditRequestActionResultDto>> Reject(TestStockFlowDbContext db, int id, string reason) =>
        new RejectCreditRequestCommandHandler(db, ReceiptData.User().Object)
            .Handle(new RejectCreditRequestCommand(id, new RejectCreditRequestRequest { Reason = reason }), CancellationToken.None);

    private static IEnumerable<string> ValidatorErrors(string reason) =>
        new RejectCreditRequestCommandValidator()
            .Validate(new RejectCreditRequestCommand(1, new RejectCreditRequestRequest { Reason = reason }))
            .Errors.Select(e => e.ErrorMessage);

    [Fact(DisplayName = "RejectCreditRequest/UTCID01 – lý do \"Khách nợ quá hạn\": REJECTED, hạn mức không đổi, MSG56")]
    [Trait("Function", Function)][Trait("UTCID", "RejectCreditRequest/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Reject_LimitUnchanged()
    {
        var db = CreditData.Db();
        var id = CreditData.AddRequest(db, "CR2", "PENDING");
        var r = await Reject(db, id, "Khách nợ quá hạn");
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("Đã ghi nhận quyết định của bạn (MSG56).", r.Value!.Message);
        var saved = CreditData.Request(db, id);
        Assert.Equal("REJECTED", saved.Status);
        Assert.Equal("Khách nợ quá hạn", saved.ApprovalNotes);
        Assert.Equal(10_000_000m, CreditData.Limit(db));
    }

    [Fact(DisplayName = "RejectCreditRequest/UTCID02 – lý do trống (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "RejectCreditRequest/UTCID02")][Trait("Type", "A")]
    public void UTCID02_EmptyReason_ValidatorRejects() =>
        Assert.Contains("Vui lòng nhập lý do từ chối (E62.1).", ValidatorErrors(""));

    [Fact(DisplayName = "RejectCreditRequest/UTCID03 – lý do 501 ký tự (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "RejectCreditRequest/UTCID03")][Trait("Type", "B")]
    public void UTCID03_ReasonTooLong_ValidatorRejects() =>
        Assert.Contains("Lý do từ chối tối đa 500 ký tự.", ValidatorErrors(new string('x', 501)));

    [Fact(DisplayName = "RejectCreditRequest/UTCID04 – CR2 đã từ chối")]
    [Trait("Function", Function)][Trait("UTCID", "RejectCreditRequest/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_AlreadyRejected_ReturnsError()
    {
        var db = CreditData.Db();
        var id = CreditData.AddRequest(db, "CR2", "REJECTED");
        var r = await Reject(db, id, "x");
        Assert.False(r.IsSuccess);
        Assert.Equal("Yêu cầu này đã được xử lý (MSG57).", r.Error);
    }

    [Fact(DisplayName = "RejectCreditRequest/UTCID05 – yêu cầu 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "RejectCreditRequest/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_Unknown_ReturnsError()
    {
        var r = await Reject(CreditData.Db(), 999_999, "x");
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy yêu cầu duyệt tín dụng.", r.Error);
    }
}

/// <summary>
/// Report 5.1 – sheet AdjustCreditLimit (DatTD): đặt / điều chỉnh hạn mức một hoặc nhiều khách (UC-55, BR-12, BR-49).
/// Ca 04–07 là luật của validator. Ca 01–03 đi qua CreditLimitChanger dùng ExecuteUpdateAsync (UPDATE có điều kiện dư nợ ngay trong câu SQL);
/// EF Core InMemory không hỗ trợ ExecuteUpdate nên các ca này thuộc Integration test (PostgreSQL), không chạy ở unit.
/// </summary>
public class AdjustCreditLimitTests
{
    private const string Function = "AdjustCreditLimit";
    private const string IntegrationOnly =
        "INTEGRATION: CreditLimitChanger.ApplyAsync dùng ExecuteUpdateAsync (CreditLimitChanger.cs) – EF Core InMemory không hỗ trợ; chạy ở bộ Integration (PostgreSQL).";

    private static IEnumerable<string> BatchErrors(List<int> ids, string mode, decimal value, string? reason) =>
        new BatchUpdateCustomerCreditLimitCommandValidator()
            .Validate(new BatchUpdateCustomerCreditLimitCommand(new BatchUpdateCustomerCreditLimitRequest { PartnerIds = ids, Mode = mode, Value = value, Reason = reason }))
            .Errors.Select(e => e.ErrorMessage);

    [Fact(DisplayName = "AdjustCreditLimit/UTCID01 – SET 15.000.000 cho KH-HM01", Skip = IntegrationOnly)]
    [Trait("Function", Function)][Trait("UTCID", "AdjustCreditLimit/UTCID01")][Trait("Type", "N")]
    public void UTCID01_Set_Integration() { }

    [Fact(DisplayName = "AdjustCreditLimit/UTCID02 – PERCENT +10 cho 3 khách", Skip = IntegrationOnly)]
    [Trait("Function", Function)][Trait("UTCID", "AdjustCreditLimit/UTCID02")][Trait("Type", "N")]
    public void UTCID02_Percent_Integration() { }

    [Fact(DisplayName = "AdjustCreditLimit/UTCID03 – SET 999.999.999.999", Skip = IntegrationOnly)]
    [Trait("Function", Function)][Trait("UTCID", "AdjustCreditLimit/UTCID03")][Trait("Type", "B")]
    public void UTCID03_SetMax_Integration() { }

    [Fact(DisplayName = "AdjustCreditLimit/UTCID03 (phần validator) – SET 999.999.999.999 nằm trong khoảng cho phép")]
    [Trait("Function", Function)][Trait("UTCID", "AdjustCreditLimit/UTCID03")][Trait("Type", "B")]
    public void UTCID03_SetMax_PassesValidator()
    {
        Assert.Empty(BatchErrors(new List<int> { SalesData.KhHm01 }, CreditLimitBatchModes.Set, 999_999_999_999m, "Tăng doanh số"));
        var single = new UpdateCustomerCreditLimitCommandValidator().Validate(new UpdateCustomerCreditLimitCommand(SalesData.KhHm01,
            new UpdateCustomerCreditLimitRequest { NewLimit = 999_999_999_999m, Reason = "Tăng doanh số" }));
        Assert.True(single.IsValid);
    }

    [Fact(DisplayName = "AdjustCreditLimit/UTCID04 – SET 15.000.000, lý do trống (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "AdjustCreditLimit/UTCID04")][Trait("Type", "A")]
    public void UTCID04_EmptyReason_ValidatorRejects() =>
        Assert.Contains("Vui lòng nhập lý do điều chỉnh hạn mức.",
            BatchErrors(new List<int> { SalesData.KhHm01 }, CreditLimitBatchModes.Set, 15_000_000, ""));

    [Fact(DisplayName = "AdjustCreditLimit/UTCID05 – PERCENT −100 (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "AdjustCreditLimit/UTCID05")][Trait("Type", "A")]
    public void UTCID05_PercentMinus100_ValidatorRejects() =>
        Assert.Contains("Tỷ lệ điều chỉnh phải khác 0, lớn hơn -100% và không quá 1000%.",
            BatchErrors(new List<int> { SalesData.KhHm01 }, CreditLimitBatchModes.Percent, -100, "Điều chỉnh quý"));

    [Fact(DisplayName = "AdjustCreditLimit/UTCID06 – không chọn khách hàng (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "AdjustCreditLimit/UTCID06")][Trait("Type", "A")]
    public void UTCID06_NoCustomer_ValidatorRejects() =>
        Assert.Contains("Chưa chọn khách hàng nào.", BatchErrors(new List<int>(), CreditLimitBatchModes.Set, 15_000_000, "Tăng doanh số"));

    [Fact(DisplayName = "AdjustCreditLimit/UTCID07 – Mode \"DOUBLE\" (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "AdjustCreditLimit/UTCID07")][Trait("Type", "A")]
    public void UTCID07_InvalidMode_ValidatorRejects() =>
        Assert.Contains("Cách điều chỉnh không hợp lệ (SET, PERCENT hoặc RESET_DEFAULT).",
            BatchErrors(new List<int> { SalesData.KhHm01 }, "DOUBLE", 2, "Tăng doanh số"));
}
