using StockFlow.Application.Common;
using StockFlow.Application.Features.Reports.DTOs;
using StockFlow.Application.Features.Reports.Queries;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Reports;

/// <summary>UC-86 – Báo cáo công nợ phải thu / phải trả (GetDebtReportQuery). Dữ liệu: DebtData.</summary>
public class DebtReportTests
{
    private const string Function = "GetDebtReport";
    private static readonly DateOnly November1 = new(2026, 11, 1);
    private static readonly DateOnly November30 = new(2026, 11, 30);

    private static Task<Result<DebtReportDto>> Run(
        TestStockFlowDbContext db, string type, DateOnly? from = null, DateOnly? to = null, string? search = null) =>
        new GetDebtReportQueryHandler(db).Handle(
            new GetDebtReportQuery(from ?? November1, to ?? November30, type, search, 1, 50), CancellationToken.None);

    private static TestStockFlowDbContext CustomerDb()
    {
        var db = ReportData.Db(customerDebt: 1_710_000);
        DebtData.SeedCustomer(db);
        return db;
    }

    private static void AssertRow(DebtReportRowDto row, decimal opening, decimal increase, decimal decrease, decimal closing) =>
        Assert.Equal((opening, increase, decrease, closing), (row.Opening, row.Increase, row.Decrease, row.Closing));

    [Fact(DisplayName = "GetDebtReport/UTCID01 – phải thu tháng 11: nợ đầu, phát sinh tăng / giảm, nợ cuối khớp sổ nợ khách (có hóa đơn hủy, phiếu trả)")]
    [Trait("Function", Function)][Trait("UTCID", "GetDebtReport/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Receivable_MatchesLedger()
    {
        using var db = CustomerDb();

        var result = await Run(db, DebtReportType.Receivable);

        Assert.True(result.IsSuccess, result.Error);
        var row = Assert.Single(result.Value!.Items);   // KH-HM02 không nợ, không phát sinh → không hiện
        Assert.Equal("KH-HM01", row.Code);
        // Tăng: DH1 200.000 + HD1 500.000 + trả tiền khách 50.000 + 20.000 + điều chỉnh 30.000 (HD2 đã hủy, phiếu thu hủy, TH2 hủy không tính)
        // Giảm: phiếu thu 200.000 + 100.000 + trả hàng 90.000; nợ cuối = 1.710.000 − HD3 tháng 12 (300.000)
        AssertRow(row, 1_000_000, 800_000, 390_000, 1_410_000);
        Assert.Equal(10_000_000m, row.CreditLimit);
        AssertRow(result.Value.Totals, 1_000_000, 800_000, 390_000, 1_410_000);
    }

    [Fact(DisplayName = "GetDebtReport/UTCID02 – phải trả tháng 11: khớp sổ nợ NCC (phiếu nhập trừ trả ngay, phiếu tạm không tính)")]
    [Trait("Function", Function)][Trait("UTCID", "GetDebtReport/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_Payable_MatchesLedger()
    {
        using var db = ReportData.Db(supplierPayable: 2_000_000);
        DebtData.SeedSupplier(db);

        var dto = (await Run(db, DebtReportType.Payable)).Value!;

        var row = Assert.Single(dto.Items);
        Assert.Equal("NCC-01", row.Code);
        // Tăng: PN1 300.000 + NCC trả tiền 20.000; giảm: phiếu chi 150.000 + 40.000 + trả hàng nhập 50.000 + điều chỉnh 10.000
        AssertRow(row, 1_730_000, 320_000, 250_000, 1_800_000);
        Assert.Null(row.CreditLimit);
        Assert.Null(row.DebtDays);
        Assert.Null(dto.DebtDaysFrom);
        Assert.Empty(dto.Aging);
    }

    [Fact(DisplayName = "GetDebtReport/UTCID03 – kỳ tháng 12: phát sinh tháng 11 thành nợ đầu kỳ, chỉ tính HD3")]
    [Trait("Function", Function)][Trait("UTCID", "GetDebtReport/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_OutsidePeriod_MovesToOpening()
    {
        using var db = CustomerDb();

        var row = Assert.Single((await Run(db, DebtReportType.Receivable, new DateOnly(2026, 12, 1), new DateOnly(2026, 12, 31))).Value!.Items);

        AssertRow(row, 1_410_000, 300_000, 0, 1_710_000);
    }

    [Fact(DisplayName = "GetDebtReport/UTCID04 – số ngày nợ và nhóm tuổi nợ dùng hàm cảnh báo công nợ (từ hóa đơn nợ đầu tiên)")]
    [Trait("Function", Function)][Trait("UTCID", "GetDebtReport/UTCID04")][Trait("Type", "N")]
    public async Task UTCID04_DebtDaysAndAging()
    {
        using var db = CustomerDb();
        var hd0 = db.TrxOrders.Single(o => o.OrderCode == "HD0");
        hd0.OutstandingAmount = 1_000_000;
        TestData.SaveAndDetach(db);
        var expectedDays = (VietnamTime.Now.Date - new DateTime(2026, 10, 20)).Days;

        var dto = (await Run(db, DebtReportType.Receivable)).Value!;

        var row = dto.Items.Single();
        Assert.Equal(expectedDays, row.DebtDays);
        Assert.Equal(DebtAgingBucket.Of(expectedDays), row.AgingBucket);
        Assert.Equal("FIRST_DEBT", dto.DebtDaysFrom);
        var bucket = dto.Aging.Single(a => a.Bucket == row.AgingBucket);
        Assert.Equal((1, 1_410_000m), (bucket.Count, bucket.Amount));
        Assert.Equal(new[] { "0-30", "31-60", "61-90", "90+" }, dto.Aging.Select(a => a.Bucket));
    }

    [Fact(DisplayName = "GetDebtReport/UTCID05 – công nợ không lọc theo kho: hóa đơn ở kho K002 vẫn được tính")]
    [Trait("Function", Function)][Trait("UTCID", "GetDebtReport/UTCID05")][Trait("Type", "B")]
    public async Task UTCID05_NotFilteredByWarehouse()
    {
        using var db = ReportData.Db(customerDebt: 0);
        ReportData.AddOrder(db, "HD-K2", TestData.K002, ReportData.At(11, 5), "COMPLETED", new[] { (TestData.PTest, 1m, 250_000m) },
            partnerId: SalesData.KhHm02);
        db.MstBusinessPartners.Single(p => p.PartnerId == SalesData.KhHm02).CurrentDebt = 250_000;
        TestData.SaveAndDetach(db);

        var row = Assert.Single((await Run(db, DebtReportType.Receivable)).Value!.Items);

        Assert.Equal("KH-HM02", row.Code);
        AssertRow(row, 0, 250_000, 0, 250_000);
    }

    [Fact(DisplayName = "GetDebtReport/UTCID06 – tìm theo mã / tên khách")]
    [Trait("Function", Function)][Trait("UTCID", "GetDebtReport/UTCID06")][Trait("Type", "N")]
    public async Task UTCID06_Search()
    {
        using var db = CustomerDb();

        Assert.Single((await Run(db, DebtReportType.Receivable, search: "hm01")).Value!.Items);
        Assert.Empty((await Run(db, DebtReportType.Receivable, search: "HM02")).Value!.Items);
    }

    [Fact(DisplayName = "GetDebtReport/UTCID07 – validator: loại công nợ sai, từ khóa quá dài, từ ngày sau đến ngày")]
    [Trait("Function", Function)][Trait("UTCID", "GetDebtReport/UTCID07")][Trait("Type", "A")]
    public void UTCID07_Validator()
    {
        var errors = new GetDebtReportQueryValidator()
            .Validate(new GetDebtReportQuery(November30, November1, "OTHER", new string('a', 101), 1, 50))
            .Errors.Select(e => e.ErrorMessage).ToList();

        Assert.Contains("Loại công nợ phải là Phải thu hoặc Phải trả.", errors);
        Assert.Contains("Từ khóa tìm kiếm tối đa 100 ký tự.", errors);
        Assert.Contains("Từ ngày phải trước hoặc bằng đến ngày.", errors);
        Assert.True(new GetDebtReportQueryValidator().Validate(new GetDebtReportQuery(November1, November30, "payable")).IsValid);
    }
}
