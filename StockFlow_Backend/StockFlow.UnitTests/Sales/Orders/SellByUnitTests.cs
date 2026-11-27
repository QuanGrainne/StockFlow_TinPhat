using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Orders.Commands;
using StockFlow.Application.Features.Orders.DTOs;
using StockFlow.Application.Features.SalesBookings.Common;
using StockFlow.Application.Features.SalesReturns.Commands;
using StockFlow.Application.Features.SalesReturns.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.Infrastructure.Services;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Sales.Orders;

/// <summary>
/// Bán theo đơn vị quy đổi (26/11/2026): P-TEST đơn vị cơ bản "Cái", đơn vị quy đổi "Túi (10 cái)" = 10 cái,
/// mã P-TEST-TUI, giá 900.000. Dòng hóa đơn lưu SL / giá theo đơn vị bán + hệ số; tồn, thẻ kho theo đơn vị cơ bản.
/// Precondition chung: tồn P-TEST tại K001 = 50, người dùng có quyền kho K001.
/// </summary>
public class SellByUnitTests
{
    private const string Function = "SellByUnit";
    private const string Bag = "Túi (10 cái)";
    private const decimal BagPrice = 900_000m;

    private static TestStockFlowDbContext Arrange(decimal stock = 50, Action<MstOrderSetting>? settings = null)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        SalesData.SeedCustomers(db);
        if (settings != null) SalesData.SeedOrderSettings(db, settings);
        var p = db.MstProducts.Single(x => x.ProductId == TestData.PTest);
        // Cùng định dạng variants_json backend ghi (khóa con viết hoa đầu)
        p.VariantsJson = "{\"units\":[{\"Name\":\"Cái\",\"ConversionRate\":1,\"IsBase\":true,\"IsDirectSale\":true}," +
                         "{\"Name\":\"" + Bag + "\",\"ConversionRate\":10,\"IsBase\":false,\"IsDirectSale\":true}]," +
                         "\"attributes\":[],\"variants\":[{\"UnitName\":\"Cái\",\"ConversionRate\":1,\"Code\":\"P-TEST\",\"SalePrice\":100000}," +
                         "{\"UnitName\":\"" + Bag + "\",\"ConversionRate\":10,\"Code\":\"P-TEST-TUI\",\"SalePrice\":900000}]}";
        TestData.SaveAndDetach(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, stock, 10_000m);
        return db;
    }

    private static Task<StockFlow.Application.Common.Result<PosOrderResultDto>> Sell(TestStockFlowDbContext db, decimal bags, string? unitName = Bag)
    {
        var user = CurrentUser.WithWarehouses(TestData.UserId, TestData.K001);
        var handler = new CreatePosOrderCommandHandler(db, new TransactionCodeGenerator(db), user.Object);
        var req = new CreatePosOrderRequest
        {
            PartnerId = 0,
            WarehouseId = TestData.K001,
            PaymentMethod = "CASH",
            PaidAmount = bags * BagPrice,
            TotalAmount = bags * BagPrice,
            Items = new List<PosOrderItemRequest>
            {
                new() { ProductId = TestData.PTest, Quantity = bags, UnitName = unitName, OriginalPrice = BagPrice, UnitPrice = BagPrice },
            },
        };
        return handler.Handle(new CreatePosOrderCommand(req), CancellationToken.None);
    }

    [Fact(DisplayName = "SellByUnit/UTCID01 – bán 2 túi (10 cái/túi): trừ 20 cái, dòng hóa đơn 2 túi × 900.000, hệ số 10, thẻ kho −20")]
    [Trait("Function", Function)][Trait("UTCID", "SellByUnit/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_SellTwoBags_DeductsTwentyBaseUnits()
    {
        var db = Arrange();

        var r = await Sell(db, 2);

        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(30, TestData.StockOf(db, TestData.K001));
        var item = db.DtlOrderItems.AsNoTracking().Include(i => i.Unit).Single();
        Assert.Equal(2, item.Quantity);
        Assert.Equal(10, item.ConversionRate);
        Assert.Equal(BagPrice, item.UnitPrice);
        Assert.Equal(1_800_000m, item.LineTotal);
        Assert.Equal(Bag, item.Unit.UnitName);
        var card = Assert.Single(db.TrxInventoryTransactions.AsNoTracking().ToList());
        Assert.Equal(-20, card.Quantity);
        Assert.Equal(90_000m, card.TransactionPrice); // giá theo đơn vị cơ bản
    }

    [Fact(DisplayName = "SellByUnit/UTCID02 – đơn vị không có trong thiết lập của hàng")]
    [Trait("Function", Function)][Trait("UTCID", "SellByUnit/UTCID02")][Trait("Type", "A")]
    public async Task UTCID02_UnknownUnit_ReturnsError()
    {
        var db = Arrange();

        var r = await Sell(db, 1, "Thùng");

        Assert.False(r.IsSuccess);
        Assert.Equal("Sản phẩm 'Sản phẩm test' (P-TEST) không có đơn vị \"Thùng\" trong thiết lập đơn vị tính.", r.Error);
        Assert.Equal(50, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "SellByUnit/UTCID03 – không cho bán vượt tồn, tồn 15 cái, bán 2 túi (20 cái): chặn")]
    [Trait("Function", Function)][Trait("UTCID", "SellByUnit/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_NotEnoughBaseStock_ReturnsError()
    {
        var db = Arrange(stock: 15, settings: s => s.AllowNegativeStockSale = false);

        var r = await Sell(db, 2);

        Assert.False(r.IsSuccess);
        Assert.Contains("Tồn hiện tại: 15", r.Error);
        Assert.Contains("Số lượng yêu cầu xuất: 20", r.Error);
        Assert.Equal(15, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "SellByUnit/UTCID04 – trả 1 túi theo hóa đơn: nhập lại 10 cái")]
    [Trait("Function", Function)][Trait("UTCID", "SellByUnit/UTCID04")][Trait("Type", "N")]
    public async Task UTCID04_ReturnOneBag_AddsTenBaseUnits()
    {
        var db = Arrange();
        var sale = await Sell(db, 2);
        Assert.True(sale.IsSuccess, sale.Error);
        var item = db.DtlOrderItems.AsNoTracking().Single();
        var user = CurrentUser.WithWarehouses(TestData.UserId, TestData.K001);
        var handler = new SalesReturnCommandHandler(db, new TransactionCodeGenerator(db), user.Object);

        var r = await handler.Handle(new CreateSalesReturnCommand(new CreateSalesReturnRequest
        {
            InvoiceId = sale.Value!.OrderId,
            RefundAmount = BagPrice,
            PaymentMethod = "CASH",
            Items = new List<SalesReturnLineRequest> { new() { OrderItemId = item.OrderItemId, Quantity = 1, ReturnPrice = BagPrice } },
        }), CancellationToken.None);

        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(40, TestData.StockOf(db, TestData.K001)); // 50 − 20 + 10
    }

    [Fact(DisplayName = "SellByUnit/UTCID05 – đơn đặt 2 túi còn mở: khách đặt = 20 cái (đơn vị cơ bản)")]
    [Trait("Function", Function)][Trait("UTCID", "SellByUnit/UTCID05")][Trait("Type", "N")]
    public async Task UTCID05_BookingTwoBags_ReservesTwentyBaseUnits()
    {
        var db = Arrange();
        var booking = new TrxOrder
        {
            OrderCode = "DH0001", OrderType = SalesBookingOps.OrderType, Status = SalesBookingOps.Draft,
            PartnerId = SalesData.KhHm01, WarehouseId = TestData.K001, CreatedBy = TestData.UserId,
            SubTotal = 1_800_000m, TotalAmount = 1_800_000m,
        };
        booking.DtlOrderItems.Add(new DtlOrderItem
        {
            ProductId = TestData.PTest, UnitId = TestData.UnitId, Quantity = 2, ConversionRate = 10,
            OriginalPrice = BagPrice, UnitPrice = BagPrice, LineTotal = 1_800_000m,
        });
        db.TrxOrders.Add(booking);
        TestData.SaveAndDetach(db);

        var reserved = await SalesBookingOps.ReservedQtyAsync(db, TestData.K001, new[] { TestData.PTest }, null, CancellationToken.None);

        Assert.Equal(20, reserved[TestData.PTest]);
    }
}
