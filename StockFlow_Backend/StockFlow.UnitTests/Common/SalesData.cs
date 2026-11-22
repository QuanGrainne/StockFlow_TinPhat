using StockFlow.Application.Common;
using StockFlow.Domain.Entities;

namespace StockFlow.UnitTests.Common;

/// <summary>Dữ liệu mẫu cho bán hàng: khách hàng, đơn đặt (BOOKING), hóa đơn (INVOICE), phiếu thu, phiếu trả.</summary>
public static class SalesData
{
    public const int KhHm01 = 10;
    public const int KhHm02 = 11;
    public const int PTest2 = 2;
    public const decimal PTestPrice = 100_000m;

    /// <summary>KH-HM01 (hạn mức, dư nợ theo tham số) và KH-HM02 (hạn mức 10.000.000, dư nợ 0).</summary>
    public static void SeedCustomers(TestStockFlowDbContext db, decimal creditLimit = 10_000_000m, decimal currentDebt = 0)
    {
        db.MstBusinessPartners.AddRange(
            new MstBusinessPartner
            {
                PartnerId = KhHm01, PartnerCode = "KH-HM01", PartnerName = "Khách hàng HM01", PartnerType = "CUSTOMER",
                CreditLimit = creditLimit, CurrentDebt = currentDebt, CurrentPayable = 0, IsActive = true,
            },
            new MstBusinessPartner
            {
                PartnerId = KhHm02, PartnerCode = "KH-HM02", PartnerName = "Khách hàng HM02", PartnerType = "CUSTOMER",
                CreditLimit = 10_000_000m, CurrentDebt = 0, CurrentPayable = 0, IsActive = true,
            });
        TestData.SaveAndDetach(db);
    }

    public static void SeedSecondProduct(TestStockFlowDbContext db)
    {
        db.MstProducts.Add(new MstProduct
        {
            ProductId = PTest2, ProductCode = "P-TEST2", ProductName = "Sản phẩm test 2", CategoryId = TestData.CategoryId,
            BaseUnitId = TestData.UnitId, ProductType = "GOODS", MovingAverageCost = 30_000m, IsActive = true,
        });
        TestData.SaveAndDetach(db);
    }

    /// <summary>Dòng thiết lập đơn hàng (SettingId = 1) với giá trị mặc định của entity, cho phép sửa trước khi lưu.</summary>
    public static void SeedOrderSettings(TestStockFlowDbContext db, Action<MstOrderSetting>? configure = null)
    {
        var settings = new MstOrderSetting { SettingId = 1 };
        configure?.Invoke(settings);
        db.MstOrderSettings.Add(settings);
        TestData.SaveAndDetach(db);
    }

    /// <summary>Đơn đặt hàng; paid > 0 thì tạo kèm phiếu thu tiền trả trước (như SalesBookingCommandHandler.AddDepositAsync).</summary>
    public static int AddBooking(
        TestStockFlowDbContext db, string code, int partnerId, int warehouseId, string status,
        IEnumerable<(int ProductId, decimal Quantity, decimal Price)> lines, decimal paid = 0, DateTime? orderDate = null)
    {
        var order = NewOrder(code, "BOOKING", partnerId, warehouseId, status, lines, orderDate ?? VietnamTime.Now.AddDays(-1));
        order.PaidAmount = paid;
        order.PaymentStatus = paid <= 0 ? "UNPAID" : paid >= order.TotalAmount ? "PAID" : "PARTIAL";
        db.TrxOrders.Add(order);
        db.SaveChanges();
        if (paid > 0)
        {
            db.TrxFinancialTransactions.Add(new TrxFinancialTransaction
            {
                PartnerId = partnerId, TxType = "RECEIPT", TxCode = $"TT{code}", Amount = paid, PaymentMethod = "CASH",
                ReferenceType = "SALES_ORDER", ReferenceId = order.OrderId, TransactionDate = VietnamTime.Now.AddDays(-1),
                CreatedBy = TestData.UserId, Status = "COMPLETED",
            });
        }
        TestData.SaveAndDetach(db);
        return order.OrderId;
    }

    /// <summary>Hóa đơn 1 dòng; withStockIssue = true thì tạo phiếu xuất kho hoàn thành tương ứng. Trả về (OrderId, OrderItemId).</summary>
    public static (int OrderId, int OrderItemId) AddInvoice(
        TestStockFlowDbContext db, string code, int partnerId, int warehouseId, string status,
        int productId, decimal quantity, decimal price, int? bookingId = null, bool withStockIssue = false, decimal paid = 0)
    {
        var order = NewOrder(code, "INVOICE", partnerId, warehouseId, status, new[] { (productId, quantity, price) },
            VietnamTime.Now.AddHours(-1));
        order.BookingOrderId = bookingId;
        order.PaidAmount = paid;
        order.OutstandingAmount = Math.Max(0, (order.TotalAmount ?? 0) - paid);
        order.PaymentStatus = paid >= order.TotalAmount ? "PAID" : paid > 0 ? "PARTIAL" : "DEBT";
        db.TrxOrders.Add(order);
        db.SaveChanges();
        var itemId = order.DtlOrderItems.Single().OrderItemId;
        if (withStockIssue)
        {
            var issue = new TrxStockIssue
            {
                IssueCode = $"XK-{code}", IssueType = "SALES", SalesOrderId = order.OrderId, WarehouseId = warehouseId,
                RequestedBy = TestData.UserId, ProcessedBy = TestData.UserId, Status = "COMPLETED",
                RequestedDate = order.OrderDate, ProcessedDate = order.OrderDate,
            };
            db.TrxStockIssues.Add(issue);
            db.SaveChanges();
            db.DtlStockIssueItems.Add(new DtlStockIssueItem
            {
                StockIssueId = issue.StockIssueId, OrderItemId = itemId, RequestedQty = quantity, ActualIssuedQty = quantity,
            });
        }
        TestData.SaveAndDetach(db);
        return (order.OrderId, itemId);
    }

    /// <summary>Phiếu trả hàng của hóa đơn (1 dòng).</summary>
    public static int AddReturn(
        TestStockFlowDbContext db, string code, int invoiceId, int orderItemId, int productId, decimal quantity,
        string status = "COMPLETED", int partnerId = KhHm01, int warehouseId = TestData.K001)
    {
        var ret = new TrxReturnRequest
        {
            ReturnCode = code, PartnerId = partnerId, SalesOrderId = invoiceId, WarehouseId = warehouseId,
            CreatedBy = TestData.UserId, RequestDate = VietnamTime.Now.AddMinutes(-30), Status = status,
            TotalGoodsAmount = quantity * PTestPrice, TotalAmount = quantity * PTestPrice,
        };
        ret.DtlReturnRequestItems.Add(new DtlReturnRequestItem
        {
            ProductId = productId, OrderItemId = orderItemId, Quantity = quantity, Condition = "GOOD",
            SalePrice = PTestPrice, ReturnPrice = PTestPrice,
        });
        db.TrxReturnRequests.Add(ret);
        TestData.SaveAndDetach(db);
        return ret.ReturnRequestId;
    }

    private static TrxOrder NewOrder(
        string code, string orderType, int partnerId, int warehouseId, string status,
        IEnumerable<(int ProductId, decimal Quantity, decimal Price)> lines, DateTime orderDate)
    {
        var order = new TrxOrder
        {
            OrderCode = code, OrderType = orderType, PartnerId = partnerId, WarehouseId = warehouseId, Status = status,
            CreatedBy = TestData.UserId, OrderDate = orderDate, DiscountType = "AMOUNT",
        };
        foreach (var (productId, quantity, price) in lines)
        {
            order.DtlOrderItems.Add(new DtlOrderItem
            {
                ProductId = productId, Quantity = quantity, UnitId = TestData.UnitId, OriginalPrice = price, UnitPrice = price,
                DiscountType = "AMOUNT", LineTotal = quantity * price,
            });
        }
        order.SubTotal = order.DtlOrderItems.Sum(i => i.LineTotal);
        order.TotalAmount = order.SubTotal;
        order.OutstandingAmount = 0;
        return order;
    }
}
