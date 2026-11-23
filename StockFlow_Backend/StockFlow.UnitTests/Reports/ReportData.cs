using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;

namespace StockFlow.UnitTests.Reports;

/// <summary>
/// Dữ liệu mẫu cho báo cáo: hóa đơn, phiếu trả, dòng thẻ kho với ngày giờ cố định (không phụ thuộc giờ chạy test).
/// Dùng chung kho / hàng / khách của TestData, SalesData.
/// </summary>
internal static class ReportData
{
    public const int SupplierId = 20;

    public static DateTime At(int month, int day, int hour = 10) => new(2026, month, day, hour, 0, 0);

    /// <summary>Kho, người dùng, P-TEST, P-TEST2, KH-HM01 (dư nợ theo tham số), KH-HM02, NCC-01 (phải trả theo tham số).</summary>
    public static TestStockFlowDbContext Db(decimal customerDebt = 5_000_000m, decimal supplierPayable = 3_000_000m)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        SalesData.SeedSecondProduct(db);
        SalesData.SeedCustomers(db, currentDebt: customerDebt);
        db.MstBusinessPartners.Add(new MstBusinessPartner
        {
            PartnerId = SupplierId, PartnerCode = "NCC-01", PartnerName = "Nhà cung cấp 01", PartnerType = "SUPPLIER",
            CurrentDebt = 0, CurrentPayable = supplierPayable, IsActive = true,
        });
        TestData.SaveAndDetach(db);
        return db;
    }

    /// <summary>Hóa đơn / đơn đặt nhiều dòng; discount là giảm giá tổng hóa đơn. Trả về (OrderId, các OrderItemId).</summary>
    public static (int OrderId, List<int> ItemIds) AddOrder(
        TestStockFlowDbContext db, string code, int warehouseId, DateTime date, string status,
        IEnumerable<(int ProductId, decimal Quantity, decimal Price)> lines, decimal discount = 0,
        string orderType = "INVOICE", int partnerId = SalesData.KhHm01)
    {
        var order = new TrxOrder
        {
            OrderCode = code, OrderType = orderType, PartnerId = partnerId, WarehouseId = warehouseId, Status = status,
            CreatedBy = TestData.UserId, OrderDate = date, DiscountType = "AMOUNT", DiscountValue = discount, DiscountAmount = discount,
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
        order.TotalAmount = order.SubTotal - discount;
        order.PaidAmount = order.TotalAmount;
        order.OutstandingAmount = 0;
        db.TrxOrders.Add(order);
        db.SaveChanges();
        var itemIds = order.DtlOrderItems.Select(i => i.OrderItemId).ToList();
        TestData.SaveAndDetach(db);
        return (order.OrderId, itemIds);
    }

    /// <summary>Phiếu trả hàng bán 1 dòng: tiền hàng = SL × giá trả, giảm giá phiếu trả theo tham số.</summary>
    public static int AddReturn(
        TestStockFlowDbContext db, string code, int? invoiceId, int productId, decimal quantity, decimal price,
        int warehouseId, DateTime date, string status = "COMPLETED", decimal discount = 0)
    {
        var goods = quantity * price;
        var ret = new TrxReturnRequest
        {
            ReturnCode = code, PartnerId = SalesData.KhHm01, SalesOrderId = invoiceId, WarehouseId = warehouseId,
            CreatedBy = TestData.UserId, RequestDate = date, Status = status,
            TotalGoodsAmount = goods, DiscountAmount = discount, TotalAmount = goods - discount, RefundAmount = goods - discount,
        };
        ret.DtlReturnRequestItems.Add(new DtlReturnRequestItem
        {
            ProductId = productId, Quantity = quantity, Condition = "GOOD", SalePrice = price, ReturnPrice = price,
        });
        db.TrxReturnRequests.Add(ret);
        TestData.SaveAndDetach(db);
        return ret.ReturnRequestId;
    }

    /// <summary>Phiếu xuất bán (không dòng) của hóa đơn – để dòng thẻ kho trỏ tới (reference STOCK_ISSUE).</summary>
    public static int AddStockIssue(TestStockFlowDbContext db, string code, int orderId, int warehouseId, DateTime date)
    {
        var issue = new TrxStockIssue
        {
            IssueCode = code, IssueType = "SALES", SalesOrderId = orderId, WarehouseId = warehouseId,
            RequestedBy = TestData.UserId, Status = "COMPLETED", RequestedDate = date, ProcessedDate = date,
        };
        db.TrxStockIssues.Add(issue);
        TestData.SaveAndDetach(db);
        return issue.StockIssueId;
    }

    /// <summary>Một dòng thẻ kho (quantity có dấu: nhập dương, xuất âm).</summary>
    public static void AddCard(
        TestStockFlowDbContext db, int warehouseId, int productId, string type, decimal quantity, decimal unitCost,
        DateTime date, decimal? balanceAfter = null, string? referenceType = null, int? referenceId = null)
    {
        db.TrxInventoryTransactions.Add(new TrxInventoryTransaction
        {
            WarehouseId = warehouseId, ProductId = productId, TransactionType = type, Quantity = quantity, UnitCost = unitCost,
            TransactionDate = date, BalanceAfter = balanceAfter, CreatedBy = TestData.UserId,
            ReferenceType = referenceType, ReferenceId = referenceId,
        });
        TestData.SaveAndDetach(db);
    }
}
