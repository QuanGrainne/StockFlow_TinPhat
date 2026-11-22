using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Domain.Entities;

namespace StockFlow.UnitTests.Common;

/// <summary>
/// Dữ liệu mẫu cho mua hàng: nhà cung cấp, phiếu đặt hàng nhập (PDN), phiếu nhập (PN), phiếu trả hàng nhập (THN),
/// khoản thanh toán NCC. "Product 1" trong workbook là P-TEST (TestData.PTest).
/// </summary>
public static class PurchaseData
{
    public const int Supplier1 = 40;
    public const int Supplier2 = 41;
    public const int BothPartner = 42;
    public const int Customer = 43;

    /// <summary>NCC-01, NCC-02 (SUPPLIER), DT-BOTH (BOTH), KH-01 (CUSTOMER); công nợ phải trả của NCC-01 theo tham số.</summary>
    public static void SeedPartners(TestStockFlowDbContext db, decimal supplier1Payable = 0)
    {
        db.MstBusinessPartners.AddRange(
            new MstBusinessPartner { PartnerId = Supplier1, PartnerCode = "NCC-01", PartnerName = "Nhà cung cấp 01", PartnerType = "SUPPLIER", CurrentPayable = supplier1Payable, CurrentDebt = 0, IsActive = true },
            new MstBusinessPartner { PartnerId = Supplier2, PartnerCode = "NCC-02", PartnerName = "Nhà cung cấp 02", PartnerType = "SUPPLIER", CurrentPayable = 0, CurrentDebt = 0, IsActive = true },
            new MstBusinessPartner { PartnerId = BothPartner, PartnerCode = "DT-BOTH", PartnerName = "Đối tác vừa mua vừa bán", PartnerType = "BOTH", CurrentPayable = 0, CurrentDebt = 0, IsActive = true },
            new MstBusinessPartner { PartnerId = Customer, PartnerCode = "KH-01", PartnerName = "Khách hàng 01", PartnerType = "CUSTOMER", CurrentPayable = 0, CurrentDebt = 0, IsActive = true });
        TestData.SaveAndDetach(db);
    }

    /// <summary>Dữ liệu nền mua hàng: kho, người dùng, P-TEST, P-TEST2, đối tác.</summary>
    public static TestStockFlowDbContext Db(decimal supplier1Payable = 0)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        SalesData.SeedSecondProduct(db);
        SeedPartners(db, supplier1Payable);
        return db;
    }

    public static decimal Payable(TestStockFlowDbContext db, int partnerId = Supplier1) =>
        db.MstBusinessPartners.AsNoTracking().Single(p => p.PartnerId == partnerId).CurrentPayable ?? 0;

    /// <summary>Phiếu đặt hàng nhập; lines = (sản phẩm, SL đặt, đơn giá). Trả về PoId.</summary>
    public static int AddPo(
        TestStockFlowDbContext db, string code, string status, IEnumerable<(int ProductId, decimal Qty, decimal Price)> lines,
        int warehouseId = TestData.K001, int partnerId = Supplier1, decimal discount = 0, string? notes = null)
    {
        var po = new TrxPurchaseOrder
        {
            PoCode = code, PartnerId = partnerId, WarehouseId = warehouseId, Status = status, OrderDate = VietnamTime.Now.AddDays(-2),
            DiscountAmount = discount, Notes = notes, CreatedBy = TestData.UserId,
        };
        foreach (var (productId, qty, price) in lines)
            po.DtlPurchaseOrderItems.Add(new DtlPurchaseOrderItem { ProductId = productId, OrderedQty = qty, UnitPrice = price, DiscountPercent = 0 });
        po.TotalAmount = po.DtlPurchaseOrderItems.Sum(i => i.OrderedQty * i.UnitPrice) - discount;
        db.TrxPurchaseOrders.Add(po);
        TestData.SaveAndDetach(db);
        return po.PoId;
    }

    /// <summary>
    /// Phiếu nhập; lines = (sản phẩm, SL đạt, đơn giá). Không giảm giá nên giá vốn dòng = đơn giá.
    /// Trả về (GrId, GrItemId của dòng đầu). Không tự cộng tồn – bước Arrange dùng TestData.SetStock nếu cần.
    /// </summary>
    public static (int GrId, int GrItemId) AddReceipt(
        TestStockFlowDbContext db, string code, string status, IEnumerable<(int ProductId, decimal Qty, decimal Price)> lines,
        int warehouseId = TestData.K001, int partnerId = Supplier1, int? poId = null, decimal defect = 0)
    {
        var gr = new TrxGoodsReceipt
        {
            GrCode = code, PartnerId = partnerId, WarehouseId = warehouseId, ReceivedBy = TestData.UserId,
            ReceivedDate = VietnamTime.Now.AddDays(-1), Status = status, PurchaseOrderId = poId, DiscountAmount = 0,
        };
        foreach (var (productId, qty, price) in lines)
        {
            gr.DtlGoodsReceiptItems.Add(new DtlGoodsReceiptItem
            {
                ProductId = productId, OrderedQty = qty + defect, ReceivedQty = qty + defect, AcceptedQty = qty, DefectiveQty = defect,
                DamagedQty = 0, ShortageQty = 0, UnitLandedCost = price, UnitPrice = price, DiscountPercent = 0,
            });
        }
        db.TrxGoodsReceipts.Add(gr);
        TestData.SaveAndDetach(db);
        return (gr.GrId, gr.DtlGoodsReceiptItems.Select(i => i.GrItemId).FirstOrDefault());
    }

    /// <summary>Khoản trả NCC lúc nhập (SUPPLIER_PAYMENT tham chiếu phiếu nhập); txCode khác null = đã lập phiếu chi.</summary>
    public static void AddPayment(TestStockFlowDbContext db, int grId, decimal amount, int partnerId = Supplier1, string? txCode = null)
    {
        db.TrxFinancialTransactions.Add(new TrxFinancialTransaction
        {
            TxCode = txCode, PartnerId = partnerId, TxType = "SUPPLIER_PAYMENT", Amount = amount, PaymentMethod = "CASH",
            ReferenceType = "GOODS_RECEIPT", ReferenceId = grId, TransactionDate = VietnamTime.Now.AddDays(-1),
            CreatedBy = TestData.UserId, Status = "COMPLETED",
        });
        TestData.SaveAndDetach(db);
    }

    /// <summary>
    /// Phiếu trả hàng nhập 1 dòng (STOCK). grId/grItemId null = trả tự do. TotalAmount = SL × giá trả; refund > 0 thì tạo kèm
    /// giao dịch SUPPLIER_REFUND như ApplyCompletionAsync. Trả về PurchaseReturnId.
    /// </summary>
    public static int AddReturn(
        TestStockFlowDbContext db, string code, string status, decimal qty, decimal price, int? grId = null, int? grItemId = null,
        decimal refund = 0, int warehouseId = TestData.K001, int partnerId = Supplier1, int productId = TestData.PTest)
    {
        var ret = new TrxPurchaseReturn
        {
            ReturnCode = code, GrId = grId, WarehouseId = warehouseId, PartnerId = partnerId, ReturnDate = VietnamTime.Now.AddHours(-1),
            Status = status, ReturnType = "STOCK", DiscountAmount = 0, TotalAmount = qty * price, RefundAmount = refund,
            PaymentMethod = "CASH", CreatedBy = TestData.UserId, CreatedAt = VietnamTime.Now.AddHours(-1),
        };
        ret.DtlPurchaseReturnItems.Add(new DtlPurchaseReturnItem
        {
            ProductId = productId, GrItemId = grItemId, Quantity = qty, ImportPrice = price, ReturnPrice = price,
        });
        db.TrxPurchaseReturns.Add(ret);
        db.SaveChanges();
        if (refund > 0)
        {
            db.TrxFinancialTransactions.Add(new TrxFinancialTransaction
            {
                PartnerId = partnerId, TxType = "SUPPLIER_REFUND", Amount = refund, PaymentMethod = "CASH",
                ReferenceType = "PURCHASE_RETURN", ReferenceId = ret.PurchaseReturnId, TransactionDate = VietnamTime.Now.AddHours(-1),
                CreatedBy = TestData.UserId, Status = "COMPLETED",
            });
        }
        TestData.SaveAndDetach(db);
        return ret.PurchaseReturnId;
    }

    public static TrxPurchaseOrder Po(TestStockFlowDbContext db, int poId) =>
        db.TrxPurchaseOrders.AsNoTracking().Include(p => p.DtlPurchaseOrderItems).Single(p => p.PoId == poId);

    public static decimal UnitCost(TestStockFlowDbContext db, int warehouseId = TestData.K001, int productId = TestData.PTest) =>
        db.TrxInventoryBalances.AsNoTracking().Where(b => b.WarehouseId == warehouseId && b.ProductId == productId)
            .Select(b => b.UnitCost ?? 0).First();
}
