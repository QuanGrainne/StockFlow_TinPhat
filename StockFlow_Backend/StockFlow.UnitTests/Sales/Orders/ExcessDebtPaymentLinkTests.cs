using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Orders.Commands;
using StockFlow.Application.Features.Orders.DTOs;
using StockFlow.Application.Features.Orders.Queries;
using StockFlow.Infrastructure.Services;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Sales.Orders;

/// <summary>
/// Khách trả thừa ở màn Bán hàng và chọn "Tính vào công nợ": phần thừa trừ vào hóa đơn còn nợ cũ nhất (phiếu TTHD... của hóa đơn cũ).
/// Chi tiết hóa đơn phải cho thấy hai chiều: hóa đơn mới dùng tiền thừa trả nợ cho phiếu nào, và phiếu thu của hóa đơn cũ là
/// tiền thừa từ hóa đơn nào. Phiếu thu tạo mới có ghi chú "Tiền thừa từ HD...".
/// </summary>
public class ExcessDebtPaymentLinkTests
{
    private static CreatePosOrderRequest Sale(decimal quantity, string paymentMethod, decimal paid, string excessAction = "RETURN_CASH") => new()
    {
        PartnerId = SalesData.KhHm01,
        WarehouseId = TestData.K001,
        PaymentMethod = paymentMethod,
        PaidAmount = paid,
        ExcessAction = excessAction,
        TotalAmount = quantity * SalesData.PTestPrice,
        Items = new List<PosOrderItemRequest> { new() { ProductId = TestData.PTest, Quantity = quantity, UnitPrice = SalesData.PTestPrice } },
    };

    [Fact(DisplayName = "ExcessDebt/01 – HD cũ nợ 300.000; HD mới 200.000 khách đưa 300.000 tính vào công nợ: hai chiều liên kết + ghi chú")]
    public async Task ExcessPayment_LinkedBothWays()
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        SalesData.SeedCustomers(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, 50, 10_000m);
        var user = CurrentUser.Admin(TestData.UserId, TestData.K001);
        var pos = new CreatePosOrderCommandHandler(db, new TransactionCodeGenerator(db), user.Object);

        var oldSale = await pos.Handle(new CreatePosOrderCommand(Sale(3, "DEBT", 0)), CancellationToken.None);
        Assert.True(oldSale.IsSuccess, oldSale.Error);
        var newSale = await pos.Handle(new CreatePosOrderCommand(Sale(2, "CASH", 300_000, "RECORD_DEBT")), CancellationToken.None);
        Assert.True(newSale.IsSuccess, newSale.Error);
        Assert.Equal(100_000m, newSale.Value!.DebtPaymentAmount);
        db.ChangeTracker.Clear();

        var query = new GetOrderDetailQueryHandler(db, user.Object, Permissions.WithFeatures().Object);
        var newDetail = (await query.Handle(new GetOrderDetailQuery(newSale.Value.OrderId), CancellationToken.None)).Value!;
        var oldDetail = (await query.Handle(new GetOrderDetailQuery(oldSale.Value!.OrderId), CancellationToken.None)).Value!;

        // Hóa đơn mới: trả 200.000 cho chính nó, 100.000 tiền thừa trừ vào hóa đơn cũ
        Assert.Equal(200_000m, newDetail.PaidAmount);
        var excess = Assert.Single(newDetail.ExcessDebtPayments);
        Assert.Equal(100_000m, excess.Amount);
        Assert.Equal(oldSale.Value.OrderId, excess.TargetOrderId);
        Assert.Equal(oldDetail.OrderCode, excess.TargetOrderCode);
        Assert.Equal($"TT{oldDetail.OrderCode}", excess.TxCode);
        Assert.All(newDetail.PaymentTransactions, t => Assert.Null(t.SourceOrderCode));

        // Hóa đơn cũ: phiếu thu 100.000 là tiền thừa từ hóa đơn mới
        Assert.Empty(oldDetail.ExcessDebtPayments);
        var fromExcess = Assert.Single(oldDetail.PaymentTransactions);
        Assert.Equal(100_000m, fromExcess.Amount);
        Assert.Equal(newSale.Value.OrderId, fromExcess.SourceOrderId);
        Assert.Equal(newDetail.OrderCode, fromExcess.SourceOrderCode);
        Assert.Equal($"Tiền thừa từ {newDetail.OrderCode}", fromExcess.Description);
        Assert.Equal(200_000m, oldDetail.OutstandingAmount);

        var tx = await db.TrxFinancialTransactions.AsNoTracking().SingleAsync(t => t.TxId == fromExcess.TxId);
        Assert.Equal($"Tiền thừa từ {newDetail.OrderCode}", tx.Description);
    }

    [Fact(DisplayName = "ExcessDebt/02 – khách đưa đủ tiền (trả tiền thừa): không có phiếu trả nợ cũ, không gắn nguồn")]
    public async Task NoExcess_NoLinks()
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        SalesData.SeedCustomers(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, 50, 10_000m);
        var user = CurrentUser.Admin(TestData.UserId, TestData.K001);
        var pos = new CreatePosOrderCommandHandler(db, new TransactionCodeGenerator(db), user.Object);

        var oldSale = await pos.Handle(new CreatePosOrderCommand(Sale(3, "DEBT", 0)), CancellationToken.None);
        var newSale = await pos.Handle(new CreatePosOrderCommand(Sale(2, "CASH", 300_000)), CancellationToken.None);
        Assert.True(newSale.IsSuccess, newSale.Error);
        db.ChangeTracker.Clear();

        var query = new GetOrderDetailQueryHandler(db, user.Object, Permissions.WithFeatures().Object);
        var newDetail = (await query.Handle(new GetOrderDetailQuery(newSale.Value!.OrderId), CancellationToken.None)).Value!;
        var oldDetail = (await query.Handle(new GetOrderDetailQuery(oldSale.Value!.OrderId), CancellationToken.None)).Value!;
        Assert.Empty(newDetail.ExcessDebtPayments);
        Assert.Empty(oldDetail.PaymentTransactions);
        Assert.Equal(300_000m, oldDetail.OutstandingAmount);
    }
}
