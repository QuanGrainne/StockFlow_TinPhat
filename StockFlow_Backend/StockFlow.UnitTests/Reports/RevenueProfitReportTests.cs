using StockFlow.Application.Common;
using StockFlow.Application.Features.Reports.DTOs;
using StockFlow.Application.Features.Reports.Helpers;
using StockFlow.Application.Features.Reports.Queries;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Reports;

/// <summary>UC-88 – Báo cáo doanh thu và lợi nhuận (GetRevenueProfitReportQuery).</summary>
public class RevenueProfitReportTests
{
    private const string Function = "GetRevenueProfitReport";
    private static readonly DateOnly November1 = new(2026, 11, 1);
    private static readonly DateOnly November30 = new(2026, 11, 30);
    private const int P1 = TestData.PTest;
    private const int P2 = SalesData.PTest2;
    private const int Category2 = 2;
    private const string StockIssueRef = "STOCK_ISSUE";
    private const string ReturnRef = "SALES_RETURN";

    private static Task<Result<RevenueProfitReportDto>> Run(
        TestStockFlowDbContext db, string groupBy, int? warehouseId = null, int? categoryId = null,
        int page = 1, int pageSize = 50, params int[] userWarehouses)
    {
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses.Length == 0 ? new[] { TestData.K001 } : userWarehouses);
        return new GetRevenueProfitReportQueryHandler(db, user.Object).Handle(
            new GetRevenueProfitReportQuery(November1, November30, warehouseId, categoryId, groupBy, page, pageSize),
            CancellationToken.None);
    }

    /// <summary>
    /// Người dùng chỉ có K001; P2 thuộc nhóm hàng 2.
    /// - HD1 05/11 KH-HM01: P1 2 × 100.000 + P2 1 × 300.000, giảm giá hóa đơn 50.000 (P1 chịu 20.000, P2 30.000);
    ///   phiếu xuất XK1: P1 −2 × 60.000, P2 −1 × 200.000.
    /// - HD2 06/11 KH-HM02: P1 1 × 100.000; XK2: P1 −1 × 60.000.
    /// - HD3 07/11 KH-HM01 đã hủy: P1 5 × 100.000; XK3 −5 rồi hủy +5 (08/11) → giá vốn ròng 0, không có doanh thu.
    /// - TH1 08/11 KH-HM01: trả 1 P1 giá 100.000, giảm giá phiếu trả 10.000 → 90.000; nhập lại +1 × 60.000.
    /// - Ngoài kỳ (31/10) và kho K002: không tính.
    /// </summary>
    private static TestStockFlowDbContext SampleDb()
    {
        var db = ReportData.Db();
        db.MstProductCategories.Add(new MstProductCategory { CategoryId = Category2, CategoryName = "Nhóm 2", IsActive = true });
        db.SaveChanges();
        db.MstProducts.Single(p => p.ProductId == P2).CategoryId = Category2;
        TestData.SaveAndDetach(db);

        var hd1 = ReportData.AddOrder(db, "HD1", TestData.K001, ReportData.At(11, 5), "COMPLETED",
            new[] { (P1, 2m, 100_000m), (P2, 1m, 300_000m) }, discount: 50_000);
        var xk1 = ReportData.AddStockIssue(db, "XK1", hd1.OrderId, TestData.K001, ReportData.At(11, 5));
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleIssueType, -2, 60_000, ReportData.At(11, 5), referenceType: StockIssueRef, referenceId: xk1);
        ReportData.AddCard(db, TestData.K001, P2, SalesFigures.SaleIssueType, -1, 200_000, ReportData.At(11, 5), referenceType: StockIssueRef, referenceId: xk1);

        var hd2 = ReportData.AddOrder(db, "HD2", TestData.K001, ReportData.At(11, 6), "COMPLETED",
            new[] { (P1, 1m, 100_000m) }, partnerId: SalesData.KhHm02);
        var xk2 = ReportData.AddStockIssue(db, "XK2", hd2.OrderId, TestData.K001, ReportData.At(11, 6));
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleIssueType, -1, 60_000, ReportData.At(11, 6), referenceType: StockIssueRef, referenceId: xk2);

        var hd3 = ReportData.AddOrder(db, "HD3", TestData.K001, ReportData.At(11, 7), "CANCELLED", new[] { (P1, 5m, 100_000m) });
        var xk3 = ReportData.AddStockIssue(db, "XK3", hd3.OrderId, TestData.K001, ReportData.At(11, 7));
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleIssueType, -5, 60_000, ReportData.At(11, 7), referenceType: StockIssueRef, referenceId: xk3);
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleCancelType, 5, 60_000, ReportData.At(11, 8), referenceType: StockIssueRef, referenceId: xk3);

        var th1 = ReportData.AddReturn(db, "TH1", hd1.OrderId, P1, 1, 100_000, TestData.K001, ReportData.At(11, 8), discount: 10_000);
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleReturnType, 1, 60_000, ReportData.At(11, 8), referenceType: ReturnRef, referenceId: th1);

        ReportData.AddOrder(db, "HD-T10", TestData.K001, ReportData.At(10, 31), "COMPLETED", new[] { (P1, 10m, 100_000m) });
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleIssueType, -10, 60_000, ReportData.At(10, 31));
        ReportData.AddOrder(db, "HD-K2", TestData.K002, ReportData.At(11, 5), "COMPLETED", new[] { (P1, 7m, 100_000m) });
        ReportData.AddCard(db, TestData.K002, P1, SalesFigures.SaleIssueType, -7, 60_000, ReportData.At(11, 5));
        return db;
    }

    private static void AssertRow(RevenueProfitRowDto row, decimal qty, decimal revenue, decimal discount, decimal returns,
        decimal net, decimal cogs, decimal profit)
    {
        Assert.Equal((qty, revenue, discount, returns, net, cogs, profit),
            (row.QuantitySold, row.Revenue, row.Discount, row.ReturnValue, row.NetRevenue, row.CostOfGoodsSold, row.GrossProfit));
    }

    [Fact(DisplayName = "GetRevenueProfitReport/UTCID01 – theo hàng hóa: phân bổ giảm giá, hóa đơn hủy, phiếu trả; tổng khớp báo cáo tổng quan")]
    [Trait("Function", Function)][Trait("UTCID", "GetRevenueProfitReport/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_ByProduct_MatchesSample()
    {
        using var db = SampleDb();

        var result = await Run(db, RevenueProfitGroupBy.Product);

        Assert.True(result.IsSuccess, result.Error);
        var dto = result.Value!;
        Assert.Equal(new[] { "P-TEST2", TestData.PTestCode }, dto.Items.Select(r => r.Code));
        AssertRow(dto.Items[0], 1, 300_000, 30_000, 0, 270_000, 200_000, 70_000);
        Assert.Equal(25.93m, dto.Items[0].MarginPercent);
        AssertRow(dto.Items[1], 3, 300_000, 20_000, 90_000, 190_000, 120_000, 70_000);
        AssertRow(dto.Totals, 4, 600_000, 50_000, 90_000, 460_000, 320_000, 140_000);

        // Cùng dữ liệu: doanh thu thuần, giá vốn khớp báo cáo tổng quan
        var user = CurrentUser.WithWarehouses(TestData.UserId, TestData.K001);
        var kpi = (await new GetDashboardSummaryQueryHandler(db, user.Object)
            .Handle(new GetDashboardSummaryQuery(November1, November30, null), CancellationToken.None)).Value!.Kpi;
        Assert.Equal((kpi.NetRevenue, kpi.CostOfGoodsSold), (dto.Totals.NetRevenue, dto.Totals.CostOfGoodsSold));
    }

    [Fact(DisplayName = "GetRevenueProfitReport/UTCID02 – theo khách hàng: giá vốn lần ngược phiếu xuất / phiếu trả")]
    [Trait("Function", Function)][Trait("UTCID", "GetRevenueProfitReport/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_ByCustomer()
    {
        using var db = SampleDb();

        var dto = (await Run(db, RevenueProfitGroupBy.Customer)).Value!;

        Assert.Equal(new[] { "KH-HM01", "KH-HM02" }, dto.Items.Select(r => r.Code));
        AssertRow(dto.Items[0], 3, 500_000, 50_000, 90_000, 360_000, 260_000, 100_000);
        AssertRow(dto.Items[1], 1, 100_000, 0, 0, 100_000, 60_000, 40_000);
    }

    [Fact(DisplayName = "GetRevenueProfitReport/UTCID03 – theo ngày: chỉ ngày trong kỳ có phát sinh, tăng dần")]
    [Trait("Function", Function)][Trait("UTCID", "GetRevenueProfitReport/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_ByDay_OutsidePeriodExcluded()
    {
        using var db = SampleDb();

        var dto = (await Run(db, RevenueProfitGroupBy.Day)).Value!;

        Assert.Equal(new[] { "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08" }, dto.Items.Select(r => r.Key));
        AssertRow(dto.Items[0], 3, 500_000, 50_000, 0, 450_000, 320_000, 130_000);
        AssertRow(dto.Items[2], 0, 0, 0, 0, 0, 300_000, -300_000);
        AssertRow(dto.Items[3], 0, 0, 0, 90_000, -90_000, -360_000, 270_000);
        Assert.Equal(460_000m, dto.Totals.NetRevenue);   // HD-T10 (31/10) và HD-K2 (K002) không tính
    }

    [Fact(DisplayName = "GetRevenueProfitReport/UTCID04 – lọc nhóm hàng 2: chỉ P-TEST2")]
    [Trait("Function", Function)][Trait("UTCID", "GetRevenueProfitReport/UTCID04")][Trait("Type", "N")]
    public async Task UTCID04_CategoryFilter()
    {
        using var db = SampleDb();

        var dto = (await Run(db, RevenueProfitGroupBy.Customer, categoryId: Category2)).Value!;

        var row = Assert.Single(dto.Items);
        Assert.Equal("KH-HM01", row.Code);
        AssertRow(row, 1, 300_000, 30_000, 0, 270_000, 200_000, 70_000);
    }

    [Fact(DisplayName = "GetRevenueProfitReport/UTCID05 – phân trang phía server; dòng tổng tính trên mọi trang")]
    [Trait("Function", Function)][Trait("UTCID", "GetRevenueProfitReport/UTCID05")][Trait("Type", "B")]
    public async Task UTCID05_Paging()
    {
        using var db = SampleDb();

        var dto = (await Run(db, RevenueProfitGroupBy.Product, page: 2, pageSize: 1)).Value!;

        Assert.Equal((2, 2, 1), (dto.TotalCount, dto.Page, dto.PageSize));
        Assert.Equal(TestData.PTestCode, Assert.Single(dto.Items).Code);
        Assert.Equal(460_000m, dto.Totals.NetRevenue);
    }

    [Fact(DisplayName = "GetRevenueProfitReport/UTCID06 – lọc kho K002 khi chỉ được phân quyền K001: từ chối (BR-04)")]
    [Trait("Function", Function)][Trait("UTCID", "GetRevenueProfitReport/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_UnauthorizedWarehouse_Rejected()
    {
        using var db = SampleDb();

        var result = await Run(db, RevenueProfitGroupBy.Day, warehouseId: TestData.K002);

        Assert.False(result.IsSuccess);
        Assert.Equal("Bạn không có quyền xem dữ liệu của kho này.", result.Error);
    }

    [Fact(DisplayName = "GetRevenueProfitReport/UTCID07 – validator: kiểu nhóm sai, số dòng/trang 0, từ ngày sau đến ngày")]
    [Trait("Function", Function)][Trait("UTCID", "GetRevenueProfitReport/UTCID07")][Trait("Type", "A")]
    public void UTCID07_Validator()
    {
        var validator = new GetRevenueProfitReportQueryValidator();

        var errors = validator.Validate(new GetRevenueProfitReportQuery(November30, November1, null, null, "MONTH", 1, 0))
            .Errors.Select(e => e.ErrorMessage).ToList();

        Assert.Contains("Kiểu nhóm phải là Ngày, Hàng hóa hoặc Khách hàng.", errors);
        Assert.Contains("Số dòng mỗi trang từ 1 đến 500.", errors);
        Assert.Contains("Từ ngày phải trước hoặc bằng đến ngày.", errors);
        Assert.True(validator.Validate(new GetRevenueProfitReportQuery(November1, November30, null, null, "product", 1, 50)).IsValid);
    }
}
