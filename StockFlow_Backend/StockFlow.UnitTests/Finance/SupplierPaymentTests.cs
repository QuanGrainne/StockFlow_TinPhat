using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Features.Suppliers.Commands;
using StockFlow.Application.Features.Suppliers.DTOs;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Finance;

/// <summary>Report 5.1 – sheet CreateSupplierPayment (DatTD): lập phiếu chi trả NCC (UC-85, BR-25, BR-46). Công nợ NCC-01 = 10.000.000.</summary>
public class CreateSupplierPaymentTests
{
    private const string Function = "CreateSupplierPayment";

    private static Task<Result<SupplierPaymentResultDto>> Pay(TestStockFlowDbContext db, decimal amount,
        List<SupplierPaymentAllocationRequest>? allocations = null) =>
        new CreateSupplierPaymentCommandHandler(db, ReceiptData.User().Object)
            .Handle(new CreateSupplierPaymentCommand(PurchaseData.Supplier1, new CreateSupplierPaymentRequest(amount, null, null, null, allocations)),
                CancellationToken.None);

    private static async Task AssertRejected(TestStockFlowDbContext db, Result<SupplierPaymentResultDto> r, string message)
    {
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        Assert.Equal(10_000_000m, PurchaseData.Payable(db));
        Assert.Empty(await db.TrxFinancialTransactions.AsNoTracking().ToListAsync());
    }

    [Fact(DisplayName = "CreateSupplierPayment/UTCID01 – trả 4.000.000: phiếu PCxxxx, công nợ 6.000.000, giao dịch SUPPLIER_PAYMENT")]
    [Trait("Function", Function)][Trait("UTCID", "CreateSupplierPayment/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Payment_ReducesPayable()
    {
        var db = PurchaseData.Db(supplier1Payable: 10_000_000);
        var r = await Pay(db, 4_000_000);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("PC000001", r.Value!.VoucherCode);
        Assert.Equal(6_000_000m, PurchaseData.Payable(db));
        var tx = await db.TrxFinancialTransactions.AsNoTracking().SingleAsync();
        Assert.Equal("SUPPLIER_PAYMENT", tx.TxType);
        Assert.Equal(4_000_000m, tx.Amount);
        Assert.Equal("PC000001", tx.TxCode);
    }

    [Fact(DisplayName = "CreateSupplierPayment/UTCID02 – trả đúng bằng công nợ 10.000.000: công nợ 0")]
    [Trait("Function", Function)][Trait("UTCID", "CreateSupplierPayment/UTCID02")][Trait("Type", "B")]
    public async Task UTCID02_FullPayable_Zero()
    {
        var db = PurchaseData.Db(supplier1Payable: 10_000_000);
        var r = await Pay(db, 10_000_000);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CreateSupplierPayment/UTCID03 – số tiền −1 (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateSupplierPayment/UTCID03")][Trait("Type", "A")]
    public void UTCID03_NegativeAmount_ValidatorRejects()
    {
        var r = new CreateSupplierPaymentCommandValidator().Validate(
            new CreateSupplierPaymentCommand(PurchaseData.Supplier1, new CreateSupplierPaymentRequest(-1, null, null, null, null)));
        Assert.Contains("Số tiền thanh toán phải lớn hơn 0.", r.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreateSupplierPayment/UTCID04 – trả 10.000.001 > công nợ 10.000.000")]
    [Trait("Function", Function)][Trait("UTCID", "CreateSupplierPayment/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_AbovePayable_ReturnsError()
    {
        var db = PurchaseData.Db(supplier1Payable: 10_000_000);
        await AssertRejected(db, await Pay(db, 10_000_001),
            "Số tiền thanh toán (10.000.001) vượt quá nợ hiện tại của nhà cung cấp (10.000.000).");
    }

    [Fact(DisplayName = "CreateSupplierPayment/UTCID05 – phân bổ 3.000.000 vào NH0001 chỉ còn 2.000.000")]
    [Trait("Function", Function)][Trait("UTCID", "CreateSupplierPayment/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_AllocationAboveReceiptDebt_ReturnsError()
    {
        var db = PurchaseData.Db(supplier1Payable: 10_000_000);
        var (grId, _) = PurchaseData.AddReceipt(db, "NH0001", "COMPLETED", new[] { (TestData.PTest, 100m, 20_000m) });
        await AssertRejected(db, await Pay(db, 3_000_000, new() { new(grId, 3_000_000) }),
            "Tiền trả cho phiếu NH0001 (3.000.000) vượt quá số còn cần trả (2.000.000).");
    }
}
