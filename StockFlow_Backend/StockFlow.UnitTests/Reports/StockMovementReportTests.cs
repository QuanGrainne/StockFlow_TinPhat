using StockFlow.Application.Common;
using StockFlow.Application.Features.Reports.DTOs;
using StockFlow.Application.Features.Reports.Queries;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Reports;

/// <summary>UC-87 – Báo cáo nhập – xuất – tồn (GetStockMovementReportQuery), đọc từ thẻ kho.</summary>
public class StockMovementReportTests
{
    private const string Function = "GetStockMovementReport";
    private static readonly DateOnly November1 = new(2026, 11, 1);
    private static readonly DateOnly November15 = new(2026, 11, 15);
    private const int P1 = TestData.PTest;
    private const int P2 = SalesData.PTest2;

    private static Task<Result<StockMovementReportDto>> Run(
        TestStockFlowDbContext db, DateOnly from, DateOnly to, int? warehouseId = null, bool onlyMismatch = false,
        params int[] userWarehouses)
    {
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses.Length == 0 ? new[] { TestData.K001 } : userWarehouses);
        return new GetStockMovementReportQueryHandler(db, user.Object).Handle(
            new GetStockMovementReportQuery(from, to, warehouseId, null, onlyMismatch, 1, 50), CancellationToken.None);
    }

    private static void Card(TestStockFlowDbContext db, int product, string type, decimal qty, decimal cost, int month, int day, decimal balance,
        int warehouse = TestData.K001) =>
        ReportData.AddCard(db, warehouse, product, type, qty, cost, ReportData.At(month, day), balance);

    /// <summary>
    /// K001 – P1: trước kỳ nhập 10, bán 2 (tồn đầu 8 × 50.000); trong kỳ 01–15/11: nhập mua 12, bán 5, chuyển đi 3,
    /// hủy hóa đơn +1, kiểm kho −1, xuất hủy 2, nhập thành phẩm 4 (giá vốn sau giao dịch 60.000) → tồn cuối 14; 20/11 bán 4 (ngoài kỳ).
    /// K001 – P2: nhập 5 (tồn sau 5), bán 1 nhưng thẻ kho ghi tồn sau 7 → lệch (tính được 4).
    /// K002 – P1: không được phân quyền.
    /// </summary>
    private static TestStockFlowDbContext SampleDb()
    {
        var db = ReportData.Db();
        Card(db, P1, "INBOUND_RECEIPT", 10, 50_000, 10, 20, 10);
        Card(db, P1, "ISSUE_SALE", -2, 50_000, 10, 25, 8);
        Card(db, P1, "INBOUND_RECEIPT", 12, 60_000, 11, 3, 20);
        Card(db, P1, "ISSUE_SALE", -5, 60_000, 11, 5, 15);
        Card(db, P1, "TRANSFER_OUT", -3, 60_000, 11, 7, 12);
        Card(db, P1, "ISSUE_SALE_CANCEL", 1, 60_000, 11, 8, 13);
        Card(db, P1, "STOCKTAKE_OUT", -1, 60_000, 11, 10, 12);
        Card(db, P1, "DISPOSAL", -2, 60_000, 11, 12, 10);
        Card(db, P1, "PRODUCTION_RECEIPT", 4, 60_000, 11, 15, 14);
        Card(db, P1, "ISSUE_SALE", -4, 60_000, 11, 20, 10);

        Card(db, P2, "INBOUND_RECEIPT", 5, 30_000, 11, 2, 5);
        Card(db, P2, "ISSUE_SALE", -1, 30_000, 11, 4, 7);

        Card(db, P1, "INBOUND_RECEIPT", 99, 10_000, 11, 3, 99, warehouse: TestData.K002);
        return db;
    }

    [Fact(DisplayName = "GetStockMovementReport/UTCID01 – tồn đầu, nhập / xuất tách nhóm, tồn cuối, giá trị; đánh dấu dòng lệch thẻ kho")]
    [Trait("Function", Function)][Trait("UTCID", "GetStockMovementReport/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Movement_MatchesSample()
    {
        using var db = SampleDb();

        var result = await Run(db, November1, November15);

        Assert.True(result.IsSuccess, result.Error);
        var dto = result.Value!;
        Assert.Equal(2, dto.TotalCount);
        Assert.All(dto.Items, r => Assert.Equal(TestData.K001, r.WarehouseId));

        var p1 = dto.Items.Single(r => r.ProductId == P1);
        Assert.Equal((8m, 400_000m), (p1.OpeningQuantity, p1.OpeningValue));
        Assert.Equal((17m, 1_020_000m), (p1.InQuantity, p1.InValue));
        Assert.Equal((11m, 660_000m), (p1.OutQuantity, p1.OutValue));
        Assert.Equal((14m, 840_000m), (p1.ClosingQuantity, p1.ClosingValue));
        Assert.Equal((12m, 1m, 0m, 0m, 4m, 0m),
            (p1.InByGroup.Purchase, p1.InByGroup.Sale, p1.InByGroup.Transfer, p1.InByGroup.Stocktake, p1.InByGroup.Production, p1.InByGroup.Disposal));
        Assert.Equal((0m, 5m, 3m, 1m, 0m, 2m),
            (p1.OutByGroup.Purchase, p1.OutByGroup.Sale, p1.OutByGroup.Transfer, p1.OutByGroup.Stocktake, p1.OutByGroup.Production, p1.OutByGroup.Disposal));
        Assert.Equal(14m, p1.LedgerBalanceAfter);
        Assert.False(p1.IsLedgerMismatch);

        var p2 = dto.Items.Single(r => r.ProductId == P2);
        Assert.Equal(4m, p2.ClosingQuantity);
        Assert.Equal(7m, p2.LedgerBalanceAfter);
        Assert.True(p2.IsLedgerMismatch);
        Assert.Equal(1, dto.LedgerMismatchCount);
        Assert.Equal(18m, dto.Totals.ClosingQuantity);

        // Báo cáo chỉ đọc: thẻ kho không bị sửa
        Assert.Equal(7m, db.TrxInventoryTransactions.Single(t => t.ProductId == P2 && t.TransactionType == "ISSUE_SALE").BalanceAfter);
    }

    [Fact(DisplayName = "GetStockMovementReport/UTCID02 – chỉ dòng lệch (onlyMismatch)")]
    [Trait("Function", Function)][Trait("UTCID", "GetStockMovementReport/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_OnlyMismatch()
    {
        using var db = SampleDb();

        var dto = (await Run(db, November1, November15, onlyMismatch: true)).Value!;

        Assert.Equal(P2, Assert.Single(dto.Items).ProductId);
        Assert.Equal(1, dto.TotalCount);
    }

    [Fact(DisplayName = "GetStockMovementReport/UTCID03 – kỳ 16–19/11: dữ liệu ngoài kỳ bị loại, tồn đầu = tồn cuối")]
    [Trait("Function", Function)][Trait("UTCID", "GetStockMovementReport/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_OutsidePeriod_Excluded()
    {
        using var db = SampleDb();

        var dto = (await Run(db, new DateOnly(2026, 11, 16), new DateOnly(2026, 11, 19))).Value!;

        var p1 = dto.Items.Single(r => r.ProductId == P1);
        Assert.Equal((14m, 0m, 0m, 14m), (p1.OpeningQuantity, p1.InQuantity, p1.OutQuantity, p1.ClosingQuantity));
        Assert.Equal(840_000m, p1.ClosingValue);
        Assert.False(p1.IsLedgerMismatch);
    }

    [Fact(DisplayName = "GetStockMovementReport/UTCID04 – kỳ tới hôm nay: tồn cuối so với tồn hiện tại, hàng có tồn mà không có thẻ kho bị đánh dấu")]
    [Trait("Function", Function)][Trait("UTCID", "GetStockMovementReport/UTCID04")][Trait("Type", "B")]
    public async Task UTCID04_CurrentBalanceCompared()
    {
        using var db = ReportData.Db();
        var today = DateOnly.FromDateTime(VietnamTime.Now);
        ReportData.AddCard(db, TestData.K001, P1, "INBOUND_RECEIPT", 6, 10_000, VietnamTime.Now.Date.AddDays(-3), 6);
        TestData.SetStock(db, TestData.K001, P1, 6, 10_000);
        TestData.SetStock(db, TestData.K001, P2, 5, 30_000);   // có tồn nhưng không có dòng thẻ kho

        var dto = (await Run(db, today.AddDays(-1), today)).Value!;

        var p1 = dto.Items.Single(r => r.ProductId == P1);
        Assert.Equal((6m, 6m, false), (p1.ClosingQuantity, p1.CurrentQuantity, p1.IsCurrentMismatch));
        var p2 = dto.Items.Single(r => r.ProductId == P2);
        Assert.Equal((0m, 5m, true), (p2.ClosingQuantity, p2.CurrentQuantity, p2.IsCurrentMismatch));
        Assert.Equal(1, dto.CurrentMismatchCount);
    }

    [Fact(DisplayName = "GetStockMovementReport/UTCID05 – lọc kho K002 khi chỉ được phân quyền K001: từ chối (BR-04)")]
    [Trait("Function", Function)][Trait("UTCID", "GetStockMovementReport/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_UnauthorizedWarehouse_Rejected()
    {
        using var db = SampleDb();

        var result = await Run(db, November1, November15, warehouseId: TestData.K002);

        Assert.False(result.IsSuccess);
        Assert.Equal("Bạn không có quyền xem dữ liệu của kho này.", result.Error);
    }

    [Fact(DisplayName = "GetStockMovementReport/UTCID06 – validator: kỳ 367 ngày, trang 0")]
    [Trait("Function", Function)][Trait("UTCID", "GetStockMovementReport/UTCID06")][Trait("Type", "A")]
    public void UTCID06_Validator()
    {
        var errors = new GetStockMovementReportQueryValidator()
            .Validate(new GetStockMovementReportQuery(new DateOnly(2026, 1, 1), new DateOnly(2027, 1, 2), null, null, false, 0, 50))
            .Errors.Select(e => e.ErrorMessage).ToList();

        Assert.Contains("Kỳ báo cáo tối đa 366 ngày.", errors);
        Assert.Contains("Trang phải từ 1 trở lên.", errors);
    }
}
