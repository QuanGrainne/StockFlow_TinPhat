using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.SalesReturns.Commands;
using StockFlow.Application.Features.SalesReturns.DTOs;
using StockFlow.Application.Features.SalesReturns.Queries;
using StockFlow.Infrastructure.Services;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Sales.Returns;

/// <summary>
/// Report 5.1 – sheet CreateSalesReturn (chưa có mã SF-FUNC): phiếu trả theo hóa đơn đã hoàn thành; SL trả ≤ SL mua − SL đã trả;
/// hàng nhập lại kho (RETURN_SALE), công nợ / tiền trả khách cập nhật. Precondition chung: HD0001 của KH-HM01 tại K001,
/// P-TEST SL 5 giá 100.000, COMPLETED. (Workbook ghi BR-18; Report 3 bản sao là BR-19, BR-21.)
/// </summary>
public class CreateSalesReturnTests
{
    private const string Function = "CreateSalesReturn";

    private static (TestStockFlowDbContext Db, SalesReturnCommandHandler Handler, int InvoiceId, int OrderItemId) Arrange(
        string invoiceStatus = "COMPLETED", decimal alreadyReturned = 0)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        SalesData.SeedCustomers(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, 45, 10_000m);
        var (invoiceId, itemId) = SalesData.AddInvoice(db, "HD0001", SalesData.KhHm01, TestData.K001, invoiceStatus,
            TestData.PTest, 5, SalesData.PTestPrice, withStockIssue: true, paid: 500_000);
        if (alreadyReturned > 0) SalesData.AddReturn(db, "TH0001", invoiceId, itemId, TestData.PTest, alreadyReturned);
        var user = CurrentUser.WithWarehouses(TestData.UserId, TestData.K001);
        return (db, new SalesReturnCommandHandler(db, new TransactionCodeGenerator(db), user.Object), invoiceId, itemId);
    }

    private static CreateSalesReturnRequest Return(int invoiceId, int orderItemId, decimal quantity, decimal refund) => new()
    {
        InvoiceId = invoiceId,
        RefundAmount = refund,
        PaymentMethod = "CASH",
        Items = new List<SalesReturnLineRequest>
        {
            new() { OrderItemId = orderItemId, ProductId = TestData.PTest, Quantity = quantity, ReturnPrice = SalesData.PTestPrice },
        },
    };

    [Fact(DisplayName = "CreateSalesReturn/UTCID01 – trả P-TEST 2, hoàn tiền mặt đủ: phiếu COMPLETED, K001 +2, thẻ kho RETURN_SALE")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateSalesReturn/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_ReturnWithFullRefund_AddsStockBack()
    {
        // Arrange
        var (db, handler, invoiceId, itemId) = Arrange();

        // Act
        var result = await handler.Handle(new CreateSalesReturnCommand(Return(invoiceId, itemId, 2, 200_000)), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.StartsWith("TH", result.Value!.ReturnCode);
        var ret = await db.TrxReturnRequests.AsNoTracking().SingleAsync();
        Assert.Equal(SalesReturnOps.Completed, ret.Status);
        Assert.Equal(47, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(TestData.CardEntries(db, SalesReturnOps.ReferenceType, ret.ReturnRequestId));
        Assert.Equal(SalesReturnOps.StockInType, card.TransactionType);
        Assert.Equal(2, card.Quantity);
    }

    [Fact(DisplayName = "CreateSalesReturn/UTCID02 – đã trả 2, trả tiếp 3: tạo phiếu (còn 0)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateSalesReturn/UTCID02")]
    [Trait("Type", "B")]
    public async Task UTCID02_ReturnRemainingQuantity_Succeeds()
    {
        // Arrange
        var (db, handler, invoiceId, itemId) = Arrange(alreadyReturned: 2);

        // Act
        var result = await handler.Handle(new CreateSalesReturnCommand(Return(invoiceId, itemId, 3, 0)), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        var returned = await SalesReturnOps.ReturnedByOrderItemAsync(db, invoiceId, null, CancellationToken.None);
        Assert.Equal(5, returned[itemId]);
    }

    [Fact(DisplayName = "CreateSalesReturn/UTCID03 – đã trả 2, trả tiếp 4 (vượt SL còn lại)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateSalesReturn/UTCID03")]
    [Trait("Type", "A")]
    public async Task UTCID03_ReturnAboveRemaining_ReturnsError()
    {
        // Arrange
        using var _ = new VietnameseCulture();
        var (db, handler, invoiceId, itemId) = Arrange(alreadyReturned: 2);

        // Act
        var result = await handler.Handle(new CreateSalesReturnCommand(Return(invoiceId, itemId, 4, 0)), CancellationToken.None);

        // Assert – Expected theo D.1 đã duyệt: thay "<P-TEST name>" bằng tên hàng trong dữ liệu test
        Assert.False(result.IsSuccess);
        Assert.Equal("\"Sản phẩm test\" chỉ còn được trả 3 (đã mua 5, đã trả 2) (BR-19).", result.Error);
        Assert.Equal(45, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "CreateSalesReturn/UTCID04 – trả hàng không thuộc hóa đơn")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateSalesReturn/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_ItemNotInInvoice_ReturnsError()
    {
        // Arrange
        var (_, handler, invoiceId, _) = Arrange();

        // Act – dòng hóa đơn 999999 không thuộc HD0001
        var result = await handler.Handle(new CreateSalesReturnCommand(Return(invoiceId, 999_999, 1, 0)), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Hàng trả không thuộc hóa đơn gốc (BR-18).", result.Error);
    }

    [Fact(DisplayName = "CreateSalesReturn/UTCID05 – trả từ HD0002 đã CANCELLED")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateSalesReturn/UTCID05")]
    [Trait("Type", "A")]
    public async Task UTCID05_CancelledInvoice_ReturnsError()
    {
        // Arrange
        var (db, handler, _, _) = Arrange();
        var (invoice2, item2) = SalesData.AddInvoice(db, "HD0002", SalesData.KhHm01, TestData.K001, "CANCELLED",
            TestData.PTest, 5, SalesData.PTestPrice);

        // Act
        var result = await handler.Handle(new CreateSalesReturnCommand(Return(invoice2, item2, 1, 0)), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Hóa đơn HD0002 chưa hoàn thành hoặc đã hủy, không trả hàng được.", result.Error);
    }

    [Fact(DisplayName = "CreateSalesReturn/UTCID06 – cần trả 200.000, trả khách 250.000")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateSalesReturn/UTCID06")]
    [Trait("Type", "A")]
    public async Task UTCID06_RefundAboveTotal_ReturnsError()
    {
        // Arrange
        using var _ = new VietnameseCulture();
        var (_, handler, invoiceId, itemId) = Arrange();

        // Act
        var result = await handler.Handle(new CreateSalesReturnCommand(Return(invoiceId, itemId, 2, 250_000)), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Tiền trả khách (250.000) vượt quá số cần trả khách (200.000).", result.Error);
    }

    [Fact(DisplayName = "CreateSalesReturn/UTCID07 – mọi dòng SL trả = 0")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateSalesReturn/UTCID07")]
    [Trait("Type", "A")]
    public async Task UTCID07_AllQuantitiesZero_ReturnsError()
    {
        // Arrange
        var (_, handler, invoiceId, itemId) = Arrange();

        // Act
        var result = await handler.Handle(new CreateSalesReturnCommand(Return(invoiceId, itemId, 0, 0)), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Chọn ít nhất 1 hàng hóa với số lượng trả lớn hơn 0.", result.Error);
    }
}
