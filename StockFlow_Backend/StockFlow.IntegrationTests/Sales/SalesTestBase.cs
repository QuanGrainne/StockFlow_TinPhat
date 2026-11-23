using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Features.Orders.DTOs;
using StockFlow.Application.Features.SalesBookings.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Sales;

/// <summary>
/// Hỗ trợ chung cho các ca bán hàng (POS, đặt hàng, trả hàng). Request dùng đúng DTO của Application
/// (CreatePosOrderRequest, SaveSalesBookingRequest...) nên tên trường JSON khớp API thật.
/// </summary>
public abstract class SalesTestBase : IntegrationTestBase
{
    protected const int K001 = SeedIds.K001;
    protected const int K002 = SeedIds.K002;
    protected const int UnitCai = 8;
    protected const decimal PTestPrice = 100_000m;
    protected const decimal PTest2Price = 150_000m;
    protected const decimal POtherPrice = 50_000m;
    protected const int WalkIn = 0; // POS không chọn khách → "Khách lẻ" KH00000

    protected SalesTestBase(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    // ───────────── Dữ liệu tồn kho / công nợ (Arrange có kiểm soát trên PostgreSQL) ─────────────

    /// <summary>Đặt tồn của hàng tại kho (dòng tồn chung: không vị trí, không lô), giá vốn = giá vốn của hàng.</summary>
    protected Task SetStockAsync(int warehouseId, int productId, decimal quantity, decimal? unitCost = null) => ArrangeDbAsync(async db =>
    {
        var product = await db.MstProducts.SingleAsync(p => p.ProductId == productId);
        var rows = await db.TrxInventoryBalances.Where(b => b.WarehouseId == warehouseId && b.ProductId == productId).ToListAsync();
        db.TrxInventoryBalances.RemoveRange(rows);
        db.TrxInventoryBalances.Add(new TrxInventoryBalance
        {
            WarehouseId = warehouseId, ProductId = productId, Quantity = quantity,
            UnitCost = unitCost ?? product.MovingAverageCost, LastUpdated = VietnamTime.Now.AddDays(-1),
        });
        Step($"Tồn kho {warehouseId}/{product.ProductCode} = {quantity}" + (unitCost.HasValue ? $", giá vốn {unitCost:N0}" : ""));
    });

    /// <summary>Giá vốn của hàng tại kho (dòng tồn chung).</summary>
    protected Task<decimal?> CostAsync(int warehouseId, int productId) => QueryAsync(async db =>
        (await db.TrxInventoryBalances.Where(b => b.WarehouseId == warehouseId && b.ProductId == productId)
            .OrderBy(b => b.InventoryId).FirstOrDefaultAsync())?.UnitCost);

    protected Task SetDebtAsync(int partnerId, decimal debt) => ArrangeDbAsync(async db =>
    {
        var partner = await db.MstBusinessPartners.SingleAsync(p => p.PartnerId == partnerId);
        partner.CurrentDebt = debt;
        Step($"Dư nợ {partner.PartnerCode} = {debt:N0}");
    });

    protected Task<decimal> StockAsync(int warehouseId, int productId) => QueryAsync(db =>
        db.TrxInventoryBalances.Where(b => b.WarehouseId == warehouseId && b.ProductId == productId).SumAsync(b => b.Quantity ?? 0));

    protected Task<decimal> DebtAsync(int partnerId) => QueryAsync(async db =>
        (await db.MstBusinessPartners.SingleAsync(p => p.PartnerId == partnerId)).CurrentDebt ?? 0);

    protected Task<TrxOrder?> OrderAsync(int orderId) => QueryAsync(db =>
        db.TrxOrders.Include(o => o.DtlOrderItems).FirstOrDefaultAsync(o => o.OrderId == orderId));

    protected Task<int> CountOrdersAsync(string orderType) => QueryAsync(db => db.TrxOrders.CountAsync(o => o.OrderType == orderType));

    protected Task<int> CountInventoryTransactionsAsync(string? type = null) => QueryAsync(db =>
        db.TrxInventoryTransactions.CountAsync(t => type == null || t.TransactionType == type));

    protected Task<List<TrxFinancialTransaction>> FinancialAsync(string referenceType, int referenceId) => QueryAsync(db =>
        db.TrxFinancialTransactions.Where(t => t.ReferenceType == referenceType && t.ReferenceId == referenceId)
            .OrderBy(t => t.TxId).ToListAsync());

    /// <summary>Dòng thẻ kho phát sinh từ các phiếu xuất của hóa đơn (reference_type = STOCK_ISSUE).</summary>
    protected Task<List<TrxInventoryTransaction>> StockCardOfInvoiceAsync(int orderId) => QueryAsync(async db =>
    {
        var issueIds = await db.TrxStockIssues.Where(s => s.SalesOrderId == orderId).Select(s => s.StockIssueId).ToListAsync();
        return await db.TrxInventoryTransactions
            .Where(t => t.ReferenceType == "STOCK_ISSUE" && t.ReferenceId.HasValue && issueIds.Contains(t.ReferenceId.Value))
            .OrderBy(t => t.TransactionId).ToListAsync();
    });

    // ───────────── Request ─────────────

    protected static CreatePosOrderRequest Pos(
        int partnerId, int warehouseId, string paymentMethod, decimal paid, IEnumerable<(int ProductId, decimal Qty, decimal Price)> lines,
        int? bookingOrderId = null)
    {
        var items = lines.Select(l => new PosOrderItemRequest
        {
            ProductId = l.ProductId, Quantity = l.Qty, UnitId = UnitCai, OriginalPrice = l.Price, UnitPrice = l.Price,
            LineTotal = l.Qty * l.Price,
        }).ToList();
        var total = items.Sum(i => i.LineTotal);
        return new CreatePosOrderRequest
        {
            PartnerId = partnerId, WarehouseId = warehouseId, PaymentMethod = paymentMethod,
            SubTotal = total, TotalAmount = total, PaidAmount = paid, Status = "COMPLETED", IssueStockNow = true,
            ClientRequestId = Guid.NewGuid().ToString("N"), BookingOrderId = bookingOrderId, Items = items,
        };
    }

    protected static SaveSalesBookingRequest Booking(
        int partnerId, int warehouseId, IEnumerable<(int ProductId, decimal Qty, decimal Price)> lines, decimal paid = 0, string method = "CASH")
    {
        return new SaveSalesBookingRequest
        {
            PartnerId = partnerId, WarehouseId = warehouseId, PaidAmount = paid, PaymentMethod = method,
            Items = lines.Select(l => new SalesBookingLineRequest { ProductId = l.ProductId, UnitId = UnitCai, Quantity = l.Qty, OriginalPrice = l.Price }).ToList(),
        };
    }

    /// <summary>
    /// Arrange: tạo hóa đơn POS thật qua API, bắt buộc thành công. Trả về id hóa đơn.
    /// </summary>
    protected async Task<int> ArrangeInvoiceAsync(HttpClient client, CreatePosOrderRequest request, string label)
    {
        var res = await PostAsync(client, "/api/orders/pos", request);
        Assert.True(res.IsSuccess, $"Arrange '{label}' thất bại: {res.StatusCode} {res.Body}");
        var id = res.Int("orderId");
        Step($"Arrange: {label} = {res.String("orderCode")} (id {id})");
        return id;
    }

    /// <summary>
    /// Arrange: tạo đơn đặt hàng thật qua API, bắt buộc thành công. Ngày đặt được lùi 1 giờ vì Precondition mô tả
    /// đơn đã có từ trước (tránh chặn "nhấn thanh toán nhiều lần trong 3 giây" của POS khi tổng tiền trùng nhau).
    /// </summary>
    protected async Task<(int Id, string Code)> ArrangeBookingAsync(HttpClient client, SaveSalesBookingRequest request, string label)
    {
        var res = await PostAsync(client, "/api/sales-bookings", request);
        Assert.True(res.IsSuccess, $"Arrange '{label}' thất bại: {res.StatusCode} {res.Body}");
        var id = res.Int("orderId");
        var code = res.String("orderCode") ?? "";
        await ArrangeDbAsync(async db =>
        {
            var o = await db.TrxOrders.SingleAsync(x => x.OrderId == id);
            o.OrderDate = (o.OrderDate ?? VietnamTime.Now).AddHours(-1);
            foreach (var t in await db.TrxFinancialTransactions.Where(t => t.ReferenceType == "SALES_ORDER" && t.ReferenceId == id).ToListAsync())
                t.TransactionDate = (t.TransactionDate ?? VietnamTime.Now).AddHours(-1);
        });
        Step($"Arrange: {label} = {code} (id {id})");
        return (id, code);
    }
}
