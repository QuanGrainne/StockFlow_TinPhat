using StockFlow.Application.Features.Reports.Helpers;
using StockFlow.Application.Features.Reports.Queries;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Reports;

/// <summary>UC-90 – Báo cáo tổng quan (GetDashboardSummaryQuery): KPI, theo ngày, top hàng, việc chờ, dưới định mức.</summary>
public class DashboardSummaryTests
{
    private const string Function = "GetDashboardSummary";
    private static readonly DateOnly November1 = new(2026, 11, 1);
    private static readonly DateOnly November30 = new(2026, 11, 30);
    private const int P1 = TestData.PTest;
    private const int P2 = SalesData.PTest2;

    private static Task<StockFlow.Application.Common.Result<StockFlow.Application.Features.Reports.DTOs.DashboardSummaryDto>> Run(
        TestStockFlowDbContext db, int? warehouseId = null, DateOnly? from = null, DateOnly? to = null, params int[] userWarehouses)
    {
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses.Length == 0 ? new[] { TestData.K001 } : userWarehouses);
        return new GetDashboardSummaryQueryHandler(db, user.Object)
            .Handle(new GetDashboardSummaryQuery(from ?? November1, to ?? November30, warehouseId), CancellationToken.None);
    }

    /// <summary>
    /// Kỳ 01–30/11, người dùng chỉ có K001:
    /// - HD1 05/11: P1 2 × 100.000 = 200.000; giá vốn 2 × 60.000.
    /// - HD2 06/11: P2 1 × 300.000, giảm giá hóa đơn 50.000 → 250.000; giá vốn 200.000.
    /// - HD3 07/11 đã hủy 08/11: 5 × 100.000 (không tính doanh thu); thẻ kho bán −5 rồi hủy +5 → giá vốn ròng 0.
    /// - TH1 08/11 hoàn thành: trả 1 P1 giá 100.000 (giá vốn 60.000).
    /// - TH2 09/11 đã hủy: trả 1 P1 rồi hủy phiếu trả → không ảnh hưởng.
    /// - Đơn đặt (BOOKING) K001, hóa đơn K002, hóa đơn ngoài kỳ: không tính.
    /// </summary>
    private static TestStockFlowDbContext SampleDb()
    {
        var db = ReportData.Db();
        var hd1 = ReportData.AddOrder(db, "HD1", TestData.K001, ReportData.At(11, 5), "COMPLETED", new[] { (P1, 2m, 100_000m) });
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleIssueType, -2, 60_000, ReportData.At(11, 5));
        ReportData.AddOrder(db, "HD2", TestData.K001, ReportData.At(11, 6), "COMPLETED", new[] { (P2, 1m, 300_000m) }, discount: 50_000);
        ReportData.AddCard(db, TestData.K001, P2, SalesFigures.SaleIssueType, -1, 200_000, ReportData.At(11, 6));
        ReportData.AddOrder(db, "HD3", TestData.K001, ReportData.At(11, 7), "CANCELLED", new[] { (P1, 5m, 100_000m) });
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleIssueType, -5, 60_000, ReportData.At(11, 7));
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleCancelType, 5, 60_000, ReportData.At(11, 8));
        ReportData.AddReturn(db, "TH1", hd1.OrderId, P1, 1, 100_000, TestData.K001, ReportData.At(11, 8));
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleReturnType, 1, 60_000, ReportData.At(11, 8));
        ReportData.AddReturn(db, "TH2", hd1.OrderId, P1, 1, 100_000, TestData.K001, ReportData.At(11, 9), status: "CANCELLED");
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleReturnType, 1, 60_000, ReportData.At(11, 9));
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleReturnCancelType, -1, 60_000, ReportData.At(11, 9, 11));

        ReportData.AddOrder(db, "DH1", TestData.K001, ReportData.At(11, 5), "COMPLETED", new[] { (P1, 9m, 100_000m) }, orderType: "BOOKING");
        ReportData.AddOrder(db, "HD-K2", TestData.K002, ReportData.At(11, 5), "COMPLETED", new[] { (P1, 7m, 100_000m) });
        ReportData.AddCard(db, TestData.K002, P1, SalesFigures.SaleIssueType, -7, 60_000, ReportData.At(11, 5));
        ReportData.AddOrder(db, "HD-T10", TestData.K001, ReportData.At(10, 31, 23), "COMPLETED", new[] { (P1, 10m, 100_000m) });
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleIssueType, -10, 60_000, ReportData.At(10, 31, 23));

        TestData.SetStock(db, TestData.K001, P1, 10, 60_000);
        TestData.SetStock(db, TestData.K001, P2, 1, 200_000);
        TestData.SetStock(db, TestData.K002, P1, 5, 60_000);
        return db;
    }

    [Fact(DisplayName = "GetDashboardSummary/UTCID01 – đối chiếu KPI có hóa đơn hủy, phiếu trả hoàn thành và phiếu trả đã hủy")]
    [Trait("Function", Function)][Trait("UTCID", "GetDashboardSummary/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Kpi_MatchesSample()
    {
        using var db = SampleDb();

        var result = await Run(db);

        Assert.True(result.IsSuccess, result.Error);
        var kpi = result.Value!.Kpi;
        Assert.Equal(450_000m, kpi.InvoiceRevenue);
        Assert.Equal(2, kpi.InvoiceCount);
        Assert.Equal(225_000m, kpi.AverageOrderValue);
        Assert.Equal(100_000m, kpi.ReturnValue);
        Assert.Equal(350_000m, kpi.NetRevenue);
        Assert.Equal(260_000m, kpi.CostOfGoodsSold);   // 120.000 + 200.000 + (300.000 − 300.000) − 60.000 + (60.000 − 60.000)
        Assert.Equal(90_000m, kpi.GrossProfit);
        Assert.Equal(25.71m, kpi.GrossMarginPercent);
        Assert.Equal(800_000m, kpi.InventoryValue);     // chỉ K001: 10 × 60.000 + 1 × 200.000
        Assert.Equal(5_000_000m, kpi.Receivable);
        Assert.Equal(3_000_000m, kpi.Payable);
    }

    [Fact(DisplayName = "GetDashboardSummary/UTCID02 – theo ngày đủ 30 ngày; top hàng theo tiền dòng hóa đơn")]
    [Trait("Function", Function)][Trait("UTCID", "GetDashboardSummary/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_DailyAndTopProducts()
    {
        using var db = SampleDb();

        var dto = (await Run(db)).Value!;

        Assert.Equal(30, dto.Daily.Count);
        var day5 = dto.Daily.Single(d => d.Date == new DateOnly(2026, 11, 5));
        Assert.Equal(200_000m, day5.NetRevenue);
        Assert.Equal(80_000m, day5.GrossProfit);
        var day8 = dto.Daily.Single(d => d.Date == new DateOnly(2026, 11, 8));
        Assert.Equal(-100_000m, day8.NetRevenue);
        Assert.Equal(260_000m, day8.GrossProfit);      // −100.000 − (−300.000 hủy bán − 60.000 trả hàng)
        Assert.Equal(dto.Kpi.GrossProfit, dto.Daily.Sum(d => d.GrossProfit));

        Assert.Equal(new[] { "P-TEST2", TestData.PTestCode }, dto.TopProducts.Select(p => p.ProductCode));
        Assert.Equal(300_000m, dto.TopProducts[0].Revenue);
        Assert.Equal(2m, dto.TopProducts[1].Quantity);
    }

    [Fact(DisplayName = "GetDashboardSummary/UTCID03 – dữ liệu ngoài kỳ bị loại, biên đầu / cuối kỳ được tính")]
    [Trait("Function", Function)][Trait("UTCID", "GetDashboardSummary/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_OutsidePeriod_Excluded()
    {
        using var db = ReportData.Db();
        ReportData.AddOrder(db, "HD-TRUOC", TestData.K001, new DateTime(2026, 10, 31, 23, 59, 59), "COMPLETED", new[] { (P1, 1m, 1_000m) });
        ReportData.AddOrder(db, "HD-DAU", TestData.K001, new DateTime(2026, 11, 1, 0, 0, 0), "COMPLETED", new[] { (P1, 1m, 10_000m) });
        ReportData.AddOrder(db, "HD-CUOI", TestData.K001, new DateTime(2026, 11, 30, 23, 59, 59), "COMPLETED", new[] { (P1, 1m, 20_000m) });
        ReportData.AddOrder(db, "HD-SAU", TestData.K001, new DateTime(2026, 12, 1, 0, 0, 0), "COMPLETED", new[] { (P1, 1m, 4_000m) });
        ReportData.AddReturn(db, "TH-SAU", null, P1, 1, 500, TestData.K001, new DateTime(2026, 12, 1, 0, 0, 0));
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleIssueType, -1, 700, new DateTime(2026, 10, 31, 23, 59, 59));
        ReportData.AddCard(db, TestData.K001, P1, SalesFigures.SaleIssueType, -1, 3_000, new DateTime(2026, 11, 1, 0, 0, 0));

        var kpi = (await Run(db)).Value!.Kpi;

        Assert.Equal(30_000m, kpi.InvoiceRevenue);
        Assert.Equal(2, kpi.InvoiceCount);
        Assert.Equal(0m, kpi.ReturnValue);
        Assert.Equal(3_000m, kpi.CostOfGoodsSold);
    }

    [Fact(DisplayName = "GetDashboardSummary/UTCID04 – lọc kho K002 khi chỉ được phân quyền K001: từ chối (BR-04)")]
    [Trait("Function", Function)][Trait("UTCID", "GetDashboardSummary/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_UnauthorizedWarehouse_Rejected()
    {
        using var db = SampleDb();

        var result = await Run(db, warehouseId: TestData.K002);

        Assert.False(result.IsSuccess);
        Assert.Equal("Bạn không có quyền xem dữ liệu của kho này.", result.Error);
    }

    [Fact(DisplayName = "GetDashboardSummary/UTCID05 – lọc đúng kho được phân quyền K002: chỉ số liệu K002")]
    [Trait("Function", Function)][Trait("UTCID", "GetDashboardSummary/UTCID05")][Trait("Type", "N")]
    public async Task UTCID05_AuthorizedWarehouseFilter()
    {
        using var db = SampleDb();

        var kpi = (await Run(db, TestData.K002, null, null, TestData.K001, TestData.K002)).Value!.Kpi;

        Assert.Equal(700_000m, kpi.InvoiceRevenue);
        Assert.Equal(420_000m, kpi.CostOfGoodsSold);
        Assert.Equal(300_000m, kpi.InventoryValue);
    }

    [Fact(DisplayName = "GetDashboardSummary/UTCID06 – validator: từ ngày sau đến ngày; kỳ 367 ngày; kỳ 366 ngày hợp lệ")]
    [Trait("Function", Function)][Trait("UTCID", "GetDashboardSummary/UTCID06")][Trait("Type", "A")]
    public void UTCID06_Validator()
    {
        var validator = new GetDashboardSummaryQueryValidator();

        var reversed = validator.Validate(new GetDashboardSummaryQuery(November30, November1, null));
        Assert.Contains(reversed.Errors, e => e.ErrorMessage == "Từ ngày phải trước hoặc bằng đến ngày.");

        var tooLong = validator.Validate(new GetDashboardSummaryQuery(new DateOnly(2026, 1, 1), new DateOnly(2027, 1, 2), null));
        Assert.Contains(tooLong.Errors, e => e.ErrorMessage == "Kỳ báo cáo tối đa 366 ngày.");

        Assert.True(validator.Validate(new GetDashboardSummaryQuery(new DateOnly(2026, 1, 1), new DateOnly(2027, 1, 1), null)).IsValid);
    }

    [Fact(DisplayName = "GetDashboardSummary/UTCID07 – việc chờ xử lý và hàng dưới định mức theo kho được phân quyền")]
    [Trait("Function", Function)][Trait("UTCID", "GetDashboardSummary/UTCID07")][Trait("Type", "N")]
    public async Task UTCID07_PendingAndLowStock()
    {
        using var db = ReportData.Db();
        db.TrxCreditLimitRequests.AddRange(
            new TrxCreditLimitRequest { RequestCode = "YC1", PartnerId = SalesData.KhHm01, RequestedBy = TestData.UserId, Status = CreditRequestStatus.Pending },
            new TrxCreditLimitRequest { RequestCode = "YC2", PartnerId = SalesData.KhHm01, RequestedBy = TestData.UserId, Status = CreditRequestStatus.Approved });
        db.TrxProductionOrders.AddRange(
            new TrxProductionOrder { ProductionOrderCode = "LSX1", ProductId = P1, BomId = 1, Status = ProductionOrderStatus.InProgress, CreatedBy = TestData.UserId },
            new TrxProductionOrder { ProductionOrderCode = "LSX2", ProductId = P1, BomId = 1, Status = ProductionOrderStatus.Completed, CreatedBy = TestData.UserId });
        TestData.SaveAndDetach(db);
        ProductionData.AddPlan(db, "KH1", ProductionPlanStatus.PendingApproval, P1, November1, November30);
        ProductionData.AddPlan(db, "KH2", ProductionPlanStatus.Draft, P1, November1, November30);
        TestData.AddTransfer(db, TransferStatus.InTransit, 1, source: TestData.K002, dest: TestData.K001);
        TestData.AddTransfer(db, TransferStatus.InTransit, 1, source: TestData.K001, dest: TestData.K002);

        var p1 = db.MstProducts.Single(p => p.ProductId == P1);
        p1.ReorderPoint = 5;
        var p2 = db.MstProducts.Single(p => p.ProductId == P2);
        p2.MinSafeStock = 3;
        TestData.SaveAndDetach(db);
        TestData.SetStock(db, TestData.K001, P1, 2, 10_000);   // 2 ≤ 5 → dưới định mức
        TestData.SetStock(db, TestData.K001, P2, 4, 30_000);   // 4 > 3 → đủ
        TestData.SetStock(db, TestData.K002, P1, 0, 10_000);   // kho không được phân quyền

        var dto = (await Run(db)).Value!;

        Assert.Equal(1, dto.Pending.CreditRequests);
        Assert.Equal(1, dto.Pending.ProductionPlansPendingApproval);
        Assert.Equal(1, dto.Pending.ProductionOrdersInProgress);
        Assert.Equal(1, dto.Pending.TransfersInTransit);
        var low = Assert.Single(dto.LowStock);
        Assert.Equal((TestData.K001, P1, 2m), (low.WarehouseId, low.ProductId, low.Quantity));
        Assert.Equal(1, dto.LowStockTotal);
    }
}
