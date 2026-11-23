using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Features.Orders.Commands;
using StockFlow.Application.Features.Orders.DTOs;
using StockFlow.Application.Features.SalesBookings.Common;
using StockFlow.Domain.Entities;
using StockFlow.Infrastructure.Services;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Sales.Orders;

/// <summary>
/// Report 5.1 – sheet CreatePosOrder (SF-FUNC-102): bán tại quầy, trừ tồn (ISSUE_SALE), ghi nợ / thu tiền, chặn theo chính sách tồn
/// và hạn mức (BR-12). Precondition chung: tồn P-TEST tại K001 = 50, giá 100.000; người dùng có quyền kho K001.
/// UTCID04, 05 là luật của CreatePosOrderCommandValidator (chạy qua ValidationBehavior) nên test lớp validator.
/// UTCID10, 11 là 2 ca luồng chính đã duyệt ở mục H của báo cáo review (chưa có trong workbook).
/// </summary>
public class CreatePosOrderTests
{
    private const string Function = "SF-FUNC-102";

    private static (TestStockFlowDbContext Db, CreatePosOrderCommandHandler Handler) Arrange(
        int[]? userWarehouses = null, decimal stock = 50, decimal creditLimit = 10_000_000m, decimal currentDebt = 0,
        Action<MstOrderSetting>? settings = null)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        SalesData.SeedCustomers(db, creditLimit, currentDebt);
        if (settings != null) SalesData.SeedOrderSettings(db, settings);
        TestData.SetStock(db, TestData.K001, TestData.PTest, stock, 10_000m);
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses ?? new[] { TestData.K001 });
        return (db, new CreatePosOrderCommandHandler(db, new TransactionCodeGenerator(db), user.Object));
    }

    private static CreatePosOrderRequest Sale(int partnerId, decimal quantity, string paymentMethod, decimal paid) => new()
    {
        PartnerId = partnerId,
        WarehouseId = TestData.K001,
        PaymentMethod = paymentMethod,
        PaidAmount = paid,
        TotalAmount = quantity * SalesData.PTestPrice,
        Items = new List<PosOrderItemRequest> { new() { ProductId = TestData.PTest, Quantity = quantity, UnitPrice = SalesData.PTestPrice } },
    };

    [Fact(DisplayName = "CreatePosOrder/UTCID01 – khách lẻ mua 2, tiền mặt 200.000: hóa đơn COMPLETED, K001 còn 48, thẻ kho ISSUE_SALE −2")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreatePosOrder/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_WalkInCashSale_CompletesAndDeductsStock()
    {
        // Arrange
        var (db, handler) = Arrange();

        // Act
        var result = await handler.Handle(new CreatePosOrderCommand(Sale(0, 2, "CASH", 200_000)), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal("COMPLETED", result.Value!.Status);
        Assert.StartsWith("HD", result.Value.OrderCode);
        Assert.Equal(48, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(db.TrxInventoryTransactions.AsNoTracking().ToList());
        Assert.Equal("ISSUE_SALE", card.TransactionType);
        Assert.Equal(-2, card.Quantity);
        Assert.Equal("STOCK_ISSUE", card.ReferenceType);
    }

    [Fact(DisplayName = "CreatePosOrder/UTCID02 – KH-HM01 (hạn mức 10.000.000, nợ 0) mua 3, ghi nợ: hóa đơn COMPLETED, nợ 300.000")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreatePosOrder/UTCID02")]
    [Trait("Type", "N")]
    public async Task UTCID02_CustomerOnDebt_CompletesAndIncreasesDebt()
    {
        // Arrange
        var (db, handler) = Arrange();

        // Act
        var result = await handler.Handle(new CreatePosOrderCommand(Sale(SalesData.KhHm01, 3, "DEBT", 0)), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal("COMPLETED", result.Value!.Status);
        Assert.Equal(300_000m, result.Value.OutstandingAmount);
        Assert.Equal(300_000m, (await db.MstBusinessPartners.AsNoTracking().SingleAsync(p => p.PartnerId == SalesData.KhHm01)).CurrentDebt);
    }

    [Fact(DisplayName = "CreatePosOrder/UTCID03 – khách lẻ mua 50 (bằng tồn), tiền mặt 5.000.000: COMPLETED, K001 = 0")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreatePosOrder/UTCID03")]
    [Trait("Type", "B")]
    public async Task UTCID03_SellAllStock_StockBecomesZero()
    {
        // Arrange
        var (db, handler) = Arrange();

        // Act
        var result = await handler.Handle(new CreatePosOrderCommand(Sale(0, 50, "CASH", 5_000_000)), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal("COMPLETED", result.Value!.Status);
        Assert.Equal(0, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "CreatePosOrder/UTCID04 – đơn không có sản phẩm (validator)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreatePosOrder/UTCID04")]
    [Trait("Type", "A")]
    public void UTCID04_NoItems_ValidatorRejects()
    {
        // Arrange
        var request = Sale(0, 1, "CASH", 0);
        request.Items.Clear();

        // Act
        var result = new CreatePosOrderCommandValidator().Validate(new CreatePosOrderCommand(request));

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Đơn hàng phải có ít nhất 1 sản phẩm (AMT-001).", result.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreatePosOrder/UTCID05 – số lượng 0 (validator)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreatePosOrder/UTCID05")]
    [Trait("Type", "A")]
    public void UTCID05_ZeroQuantity_ValidatorRejects()
    {
        // Arrange
        var request = Sale(0, 0, "CASH", 0);

        // Act
        var result = new CreatePosOrderCommandValidator().Validate(new CreatePosOrderCommand(request));

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Số lượng sản phẩm phải lớn hơn 0 (POS-005, POS-006).", result.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreatePosOrder/UTCID06 – khách lẻ ghi nợ 50%")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreatePosOrder/UTCID06")]
    [Trait("Type", "A")]
    public async Task UTCID06_WalkInPartialPayment_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange();

        // Act – tổng 200.000, trả 100.000 (50%)
        var result = await handler.Handle(new CreatePosOrderCommand(Sale(0, 2, "DEBT", 100_000)), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(
            "Khách lẻ tại quầy bắt buộc phải thanh toán đủ 100% (Tiền mặt, VietQR, Thẻ POS). Không áp dụng hình thức ghi nợ cho khách lẻ (PAY-009).",
            result.Error);
        Assert.Equal(50, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "CreatePosOrder/UTCID07 – KH-HM01 hạn mức 10.000.000, nợ 9.900.000, ghi nợ thêm 300.000")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreatePosOrder/UTCID07")]
    [Trait("Type", "A")]
    public async Task UTCID07_DebtAboveRemainingCredit_ReturnsError()
    {
        // Arrange
        using var _ = new VietnameseCulture();
        var (db, handler) = Arrange(currentDebt: 9_900_000m);

        // Act
        var result = await handler.Handle(new CreatePosOrderCommand(Sale(SalesData.KhHm01, 3, "DEBT", 0)), CancellationToken.None);

        // Assert – workbook ghi tắt phần giữa bằng "..."
        Assert.False(result.IsSuccess);
        Assert.StartsWith("Khoản nợ 300.000 đ vượt quá hạn mức tín dụng còn lại", result.Error);
        Assert.EndsWith("(CUS-009).", result.Error);
        Assert.Equal(9_900_000m, (await db.MstBusinessPartners.AsNoTracking().SingleAsync(p => p.PartnerId == SalesData.KhHm01)).CurrentDebt);
    }

    [Fact(DisplayName = "CreatePosOrder/UTCID08 – người dùng chỉ có quyền K002, bán từ K001")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreatePosOrder/UTCID08")]
    [Trait("Type", "A")]
    public async Task UTCID08_NoAccessToWarehouse_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange(userWarehouses: new[] { TestData.K002 });
        var warehouseName = (await db.MstWarehouses.AsNoTracking().SingleAsync(w => w.WarehouseId == TestData.K001)).WarehouseName;

        // Act
        var result = await handler.Handle(new CreatePosOrderCommand(Sale(0, 2, "CASH", 200_000)), CancellationToken.None);

        // Assert – workbook ghi tên kho 'Kho Gia Lâm'; dữ liệu seed của K001 là "Kho Tổng Gia Lâm" (tên kho lấy từ dữ liệu)
        Assert.False(result.IsSuccess);
        Assert.Equal($"Bạn không có quyền xuất hàng từ kho '{warehouseName}' (AUTH-WH).", result.Error);
    }

    [Fact(DisplayName = "CreatePosOrder/UTCID09 – thời gian bán là ngày mai")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreatePosOrder/UTCID09")]
    [Trait("Type", "A")]
    public async Task UTCID09_FutureSaleDate_ReturnsError()
    {
        // Arrange – thời gian giao dịch luôn cho chọn (đã bỏ tuỳ chọn khoá thời gian 24/11/2026)
        var (db, handler) = Arrange();
        var request = Sale(0, 2, "CASH", 200_000);
        request.OrderDate = VietnamTime.Now.AddDays(1);

        // Act
        var result = await handler.Handle(new CreatePosOrderCommand(request), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Không được bán hàng với thời gian trong tương lai.", result.Error);
        Assert.Empty(db.TrxOrders.AsNoTracking());
    }

    [Fact(DisplayName = "CreatePosOrder/UTCID10 (mục H) – lập hóa đơn từ đơn đặt DH0001, giao đủ 10")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreatePosOrder/UTCID10")]
    [Trait("Type", "N")]
    [Trait("Source", "Review mục H")]
    public async Task UTCID10_InvoiceFromBooking_FullDelivery_FinishesBooking()
    {
        // Arrange – đơn đặt DH0001 của KH-HM01 tại K001: P-TEST 10, trả trước 200.000 (đã giảm nợ khách khi thu)
        var (db, handler) = Arrange(currentDebt: -200_000m);
        var bookingId = SalesData.AddBooking(db, "DH0001", SalesData.KhHm01, TestData.K001, SalesBookingOps.Draft,
            new[] { (TestData.PTest, 10m, SalesData.PTestPrice) }, paid: 200_000);
        var request = Sale(SalesData.KhHm01, 10, "CASH", 800_000);
        request.BookingOrderId = bookingId;

        // Act
        var result = await handler.Handle(new CreatePosOrderCommand(request), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal("COMPLETED", result.Value!.Status);
        Assert.Equal(200_000m, result.Value.DepositAmount);
        Assert.Null(result.Value.RemainderBookingId);
        var booking = await db.TrxOrders.AsNoTracking().SingleAsync(o => o.OrderId == bookingId);
        // Mục H ghi "DH0001 COMPLETED"; trạng thái "Hoàn thành" của đơn đặt trong code là FINISHED (SalesBookingOps.Finished)
        Assert.Equal(SalesBookingOps.Finished, booking.Status);
        Assert.Equal(40, TestData.StockOf(db, TestData.K001));
        Assert.Equal(2, await db.TrxOrders.AsNoTracking().CountAsync());
        Assert.Equal(0m, (await db.MstBusinessPartners.AsNoTracking().SingleAsync(p => p.PartnerId == SalesData.KhHm01)).CurrentDebt);
    }

    [Fact(DisplayName = "CreatePosOrder/UTCID11 (mục H) – tồn 10, đơn đặt khác giữ 8, bán 5")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreatePosOrder/UTCID11")]
    [Trait("Type", "A")]
    [Trait("Source", "Review mục H")]
    public async Task UTCID11_SellReservedStock_ReturnsError()
    {
        // Arrange
        using var _ = new VietnameseCulture();
        // Cài đặt tắt "bán hàng vượt tồn kho" (mặc định từ 24/11/2026 là cho phép) → không bán phần hàng khách đã đặt
        var (db, handler) = Arrange(stock: 10, settings: st => st.AllowNegativeStockSale = false);
        SalesData.AddBooking(db, "DH0009", SalesData.KhHm02, TestData.K001, SalesBookingOps.Draft,
            new[] { (TestData.PTest, 8m, SalesData.PTestPrice) });

        // Act
        var result = await handler.Handle(new CreatePosOrderCommand(Sale(0, 5, "CASH", 500_000)), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(
            "Sản phẩm 'Sản phẩm test' (Mã: P-TEST) có tồn kho 10 nhưng đang tạm giữ 8 cho các đơn đặt hàng khác. Tồn khả dụng: 2, Yêu cầu xuất: 5. Cài đặt hiện không cho bán hàng vượt tồn kho.",
            result.Error);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
    }
}
