using StockFlow.Application.Common;
using StockFlow.Application.Features.Customers.Helpers;
using StockFlow.Application.Features.Customers.Queries;
using StockFlow.Application.Features.Suppliers.Queries;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Reports;

/// <summary>
/// Chốt hành vi sổ nợ ở màn Khách hàng / Nhà cung cấp và cảnh báo số ngày nợ (viết trước khi tách logic sang helper dùng chung
/// cho báo cáo công nợ UC-86): kết quả phải giữ nguyên sau khi tách.
/// </summary>
public class DebtLedgerCharacterizationTests
{
    private const string Function = "DebtLedger";

    [Fact(DisplayName = "DebtLedger/UTCID01 – sổ nợ khách: hóa đơn / đơn đặt hoàn thành, phiếu thu, trả hàng, trả tiền khách, điều chỉnh")]
    [Trait("Function", Function)][Trait("UTCID", "DebtLedger/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_CustomerLedger_Unchanged()
    {
        using var db = ReportData.Db(customerDebt: 1_710_000);
        DebtData.SeedCustomer(db);

        var result = await new GetCustomerByIdQueryHandler(db).Handle(new GetCustomerByIdQuery(DebtData.Customer), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        var ledger = result.Value!.DebtLedger!.AsEnumerable().Reverse().ToList();
        Assert.Equal(
            new[]
            {
                ("SALE", 1_000_000m, 1_000_000m), ("SALE", 200_000m, 1_200_000m), ("SALE", 500_000m, 1_700_000m),
                ("PAYMENT", -200_000m, 1_500_000m), ("PAYMENT", -100_000m, 1_400_000m), ("RETURN", -90_000m, 1_310_000m),
                ("REFUND", 50_000m, 1_360_000m), ("DEBT_REFUND", 20_000m, 1_380_000m), ("ADJUST", 30_000m, 1_410_000m),
                ("SALE", 300_000m, 1_710_000m),
            },
            ledger.Select(e => (e.Type, e.Amount, e.BalanceAfter)));
        Assert.Equal(new[] { "HD0", "DH1", "HD1", "TTHD1", "PT0001", "TH1" }, ledger.Take(6).Select(e => e.Code));
        Assert.Equal(new[] { "PC0009", "DC000001", "HD3" }, ledger.Skip(7).Select(e => e.Code));
    }

    [Fact(DisplayName = "DebtLedger/UTCID02 – sổ nợ NCC: nợ đầu kỳ, phiếu nhập trừ trả ngay, phiếu chi gộp, trả hàng nhập, NCC trả tiền, điều chỉnh")]
    [Trait("Function", Function)][Trait("UTCID", "DebtLedger/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_SupplierLedger_Unchanged()
    {
        using var db = ReportData.Db(supplierPayable: 2_000_000);
        DebtData.SeedSupplier(db);

        var result = await new GetSupplierByIdQueryHandler(db).Handle(new GetSupplierByIdQuery(DebtData.Supplier), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        var ledger = result.Value!.DebtLedger!.AsEnumerable().Reverse().ToList();
        Assert.Equal(
            new[]
            {
                ("OPENING", 730_000m, 730_000m), ("GOODS_RECEIPT", 1_000_000m, 1_730_000m), ("GOODS_RECEIPT", 300_000m, 2_030_000m),
                ("PAYMENT", -150_000m, 1_880_000m), ("PAYMENT", -40_000m, 1_840_000m), ("SUPPLIER_RETURN", -50_000m, 1_790_000m),
                ("SUPPLIER_REFUND", 20_000m, 1_810_000m), ("ADJUST", -10_000m, 1_800_000m), ("GOODS_RECEIPT", 200_000m, 2_000_000m),
            },
            ledger.Select(e => (e.Type, e.Amount, e.BalanceAfter)));
        Assert.Equal(new[] { "PN0", "PN1", "PC000001" }, ledger.Skip(1).Take(3).Select(e => e.Code));
        Assert.Equal(new[] { "THN1", "PT000009", "DC000002", "PN2" }, ledger.Skip(5).Select(e => e.Code));
    }

    [Fact(DisplayName = "DebtLedger/UTCID03 – cảnh báo số ngày nợ: từ hóa đơn nợ đầu tiên / giao dịch cuối")]
    [Trait("Function", Function)][Trait("UTCID", "DebtLedger/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_DebtDaysWarning_Unchanged()
    {
        using var db = ReportData.Db(customerDebt: 500_000);
        var today = VietnamTime.Now.Date;
        AddDebtInvoice(db, "HD-CU", today.AddDays(-40), outstanding: 300_000);
        AddDebtInvoice(db, "HD-MOI", today.AddDays(-5), outstanding: 200_000);
        AddDebtInvoice(db, "HD-DU", today.AddDays(-2), outstanding: 0);
        db.MstDebtWarningSettings.Add(new MstDebtWarningSetting
        {
            SettingId = 1, EnableDebtDaysWarning = true, DebtDaysThreshold = 30, DebtDaysFrom = "FIRST_DEBT",
        });
        TestData.SaveAndDetach(db);
        var partners = db.MstBusinessPartners.Where(p => p.PartnerId == DebtData.Customer).ToList();

        var first = await CustomerDebtWarning.EvaluateAsync(db, partners, CancellationToken.None);
        Assert.Equal("Nợ 40 ngày kể từ giao dịch nợ đầu tiên (mức cảnh báo 30 ngày)", first[DebtData.Customer]);

        var setting = db.MstDebtWarningSettings.Single();
        setting.DebtDaysFrom = MstDebtWarningSetting.FromLastTransaction;
        setting.DebtDaysThreshold = 2;
        TestData.SaveAndDetach(db);
        var last = await CustomerDebtWarning.EvaluateAsync(db, partners, CancellationToken.None);
        Assert.Equal("2 ngày chưa phát sinh giao dịch (mức cảnh báo 2 ngày)", last[DebtData.Customer]);
    }

    private static void AddDebtInvoice(TestStockFlowDbContext db, string code, DateTime date, decimal outstanding)
    {
        var id = ReportData.AddOrder(db, code, TestData.K001, date, "COMPLETED", new[] { (TestData.PTest, 1m, 300_000m) }).OrderId;
        db.TrxOrders.Single(o => o.OrderId == id).OutstandingAmount = outstanding;
        TestData.SaveAndDetach(db);
    }
}
