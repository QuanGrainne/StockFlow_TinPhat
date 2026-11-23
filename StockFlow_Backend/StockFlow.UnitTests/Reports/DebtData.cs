using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;

namespace StockFlow.UnitTests.Reports;

/// <summary>
/// Chứng từ công nợ mẫu (ngày cố định tháng 10–12/2026) cho KH-HM01 và NCC-01 của ReportData.Db.
/// Dùng cho test chốt hành vi sổ nợ (màn Khách hàng / NCC) và test báo cáo công nợ.
/// </summary>
internal static class DebtData
{
    public const int Customer = SalesData.KhHm01;
    public const int Supplier = ReportData.SupplierId;

    public static void Tx(TestStockFlowDbContext db, int partnerId, string type, decimal amount, DateTime date,
        string? code = null, string? refType = null, int? refId = null, string status = "COMPLETED")
    {
        db.TrxFinancialTransactions.Add(new TrxFinancialTransaction
        {
            TxCode = code, PartnerId = partnerId, TxType = type, Amount = amount, PaymentMethod = "CASH",
            ReferenceType = refType, ReferenceId = refId, TransactionDate = date, CreatedBy = TestData.UserId, Status = status,
        });
        TestData.SaveAndDetach(db);
    }

    /// <summary>
    /// KH-HM01:
    /// - 20/10 HD0 hóa đơn 1.000.000 (trước kỳ tháng 11).
    /// - 04/11 DH1 đơn đặt hoàn thành 200.000 (sổ nợ hiện tính cả đơn đặt hoàn thành).
    /// - 05/11 HD1 500.000; phiếu thu gắn HD1 200.000 (không mã → TTHD1).
    /// - 06/11 HD2 đã hủy 400.000 (không tính); phiếu thu đã hủy 70.000 (không tính).
    /// - 07/11 phiếu thu PT0001 100.000; 08/11 trả hàng TH1 90.000 (phiếu trả đã hủy 60.000 không tính).
    /// - 09/11 trả tiền khách theo TH1 50.000 (REFUND) và phiếu chi PC0009 20.000 (DEBT_REFUND); 10/11 điều chỉnh DC000001 +30.000.
    /// - 02/12 HD3 300.000 (sau kỳ).
    /// </summary>
    public static void SeedCustomer(TestStockFlowDbContext db)
    {
        var p = (TestData.PTest, 1m, 0m);
        ReportData.AddOrder(db, "HD0", TestData.K001, ReportData.At(10, 20), "COMPLETED", new[] { p with { Item3 = 1_000_000m } });
        ReportData.AddOrder(db, "DH1", TestData.K001, ReportData.At(11, 4), "COMPLETED", new[] { p with { Item3 = 200_000m } }, orderType: "BOOKING");
        var hd1 = ReportData.AddOrder(db, "HD1", TestData.K001, ReportData.At(11, 5), "COMPLETED", new[] { p with { Item3 = 500_000m } });
        Tx(db, Customer, "RECEIPT", 200_000, ReportData.At(11, 5, 11), refType: "SALES_ORDER", refId: hd1.OrderId);
        ReportData.AddOrder(db, "HD2", TestData.K001, ReportData.At(11, 6), "CANCELLED", new[] { p with { Item3 = 400_000m } });
        Tx(db, Customer, "RECEIPT", 70_000, ReportData.At(11, 6), code: "PT0000", status: "CANCELLED");
        Tx(db, Customer, "RECEIPT", 100_000, ReportData.At(11, 7), code: "PT0001");
        var th1 = ReportData.AddReturn(db, "TH1", hd1.OrderId, TestData.PTest, 1, 90_000, TestData.K001, ReportData.At(11, 8));
        ReportData.AddReturn(db, "TH2", hd1.OrderId, TestData.PTest, 1, 60_000, TestData.K001, ReportData.At(11, 8, 12), status: "CANCELLED");
        Tx(db, Customer, "CUSTOMER_REFUND", 50_000, ReportData.At(11, 9), refType: "SALES_RETURN", refId: th1);
        Tx(db, Customer, "CUSTOMER_REFUND", 20_000, ReportData.At(11, 9, 12), code: "PC0009");
        Tx(db, Customer, "DEBT_ADJUST", 30_000, ReportData.At(11, 10), code: "DC000001");
        ReportData.AddOrder(db, "HD3", TestData.K001, ReportData.At(12, 2), "COMPLETED", new[] { p with { Item3 = 300_000m } });
    }

    /// <summary>
    /// NCC-01 (phải trả hiện tại theo ReportData.Db):
    /// - 25/10 PN0 phiếu nhập 10 × 100.000 = 1.000.000 (trước kỳ).
    /// - 02/11 PN1 10 × 50.000 = 500.000, trả ngay lúc nhập 200.000 → +300.000; PN-DRAFT phiếu tạm (không tính).
    /// - 03/11 phiếu chi PC000001 gồm 2 phần 100.000 + 50.000 → −150.000; 04/11 thanh toán không mã 40.000 → −40.000.
    /// - 05/11 trả hàng nhập THN1 80.000, NCC trả ngay 30.000 → −50.000; 06/11 phiếu thu PT000009 NCC trả 20.000 → +20.000.
    /// - 07/11 điều chỉnh DC000002 −10.000; 03/12 PN2 200.000 (sau kỳ).
    /// </summary>
    public static void SeedSupplier(TestStockFlowDbContext db)
    {
        AddReceipt(db, "PN0", "COMPLETED", 10, 100_000, ReportData.At(10, 25));
        var pn1 = AddReceipt(db, "PN1", "COMPLETED", 10, 50_000, ReportData.At(11, 2));
        Tx(db, Supplier, "SUPPLIER_PAYMENT", 200_000, ReportData.At(11, 2), refType: "GOODS_RECEIPT", refId: pn1);
        AddReceipt(db, "PN-DRAFT", "DRAFT", 3, 10_000, ReportData.At(11, 2, 12));
        Tx(db, Supplier, "SUPPLIER_PAYMENT", 100_000, ReportData.At(11, 3), code: "PC000001", refType: "GOODS_RECEIPT", refId: pn1);
        Tx(db, Supplier, "SUPPLIER_PAYMENT", 50_000, ReportData.At(11, 3), code: "PC000001");
        Tx(db, Supplier, "SUPPLIER_PAYMENT", 40_000, ReportData.At(11, 4));

        var ret = new TrxPurchaseReturn
        {
            ReturnCode = "THN1", WarehouseId = TestData.K001, PartnerId = Supplier, ReturnDate = ReportData.At(11, 5),
            Status = "COMPLETED", ReturnType = "STOCK", DiscountAmount = 0, TotalAmount = 80_000, RefundAmount = 30_000,
            PaymentMethod = "CASH", CreatedBy = TestData.UserId, CreatedAt = ReportData.At(11, 5),
        };
        ret.DtlPurchaseReturnItems.Add(new DtlPurchaseReturnItem
        {
            ProductId = TestData.PTest, Quantity = 1, ImportPrice = 80_000, ReturnPrice = 80_000,
        });
        db.TrxPurchaseReturns.Add(ret);
        TestData.SaveAndDetach(db);
        Tx(db, Supplier, "SUPPLIER_REFUND", 30_000, ReportData.At(11, 5), refType: "PURCHASE_RETURN", refId: ret.PurchaseReturnId);
        Tx(db, Supplier, "SUPPLIER_REFUND", 20_000, ReportData.At(11, 6), code: "PT000009");
        Tx(db, Supplier, "SUPPLIER_DEBT_ADJUST", -10_000, ReportData.At(11, 7), code: "DC000002");
        AddReceipt(db, "PN2", "COMPLETED", 2, 100_000, ReportData.At(12, 3));
    }

    private static int AddReceipt(TestStockFlowDbContext db, string code, string status, decimal qty, decimal price, DateTime date)
    {
        var gr = new TrxGoodsReceipt
        {
            GrCode = code, PartnerId = Supplier, WarehouseId = TestData.K001, ReceivedBy = TestData.UserId,
            ReceivedDate = date, Status = status, DiscountAmount = 0,
        };
        gr.DtlGoodsReceiptItems.Add(new DtlGoodsReceiptItem
        {
            ProductId = TestData.PTest, OrderedQty = qty, ReceivedQty = qty, AcceptedQty = qty, DefectiveQty = 0,
            DamagedQty = 0, ShortageQty = 0, UnitLandedCost = price, UnitPrice = price, DiscountPercent = 0,
        });
        db.TrxGoodsReceipts.Add(gr);
        TestData.SaveAndDetach(db);
        return gr.GrId;
    }
}
