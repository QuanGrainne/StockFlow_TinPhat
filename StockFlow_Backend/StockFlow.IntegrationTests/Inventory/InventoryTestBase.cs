using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Disposals.DTOs;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.Application.Features.Stocktakes.DTOs;
using StockFlow.Application.Features.Transfers.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.IntegrationTests.Infrastructure;
using StockFlow.IntegrationTests.Sales;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Inventory;

/// <summary>
/// Hỗ trợ chung cho chuyển kho, kiểm kho, xuất hủy, phiếu nhập (dùng cả ở các ca phân quyền kho).
/// Request dùng đúng DTO của Application. Chứng từ trong bước Arrange được lập bằng API thật.
/// </summary>
public abstract class InventoryTestBase : SalesTestBase
{
    protected InventoryTestBase(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    // ───────────── Chuyển kho ─────────────

    /// <summary>Ngày chuyển của phiếu trong Arrange: 2 giờ trước (để ngày nhận mặc định = hiện tại luôn lớn hơn).</summary>
    protected static DateTime TransferDateUtc => DateTime.UtcNow.AddHours(-2);

    protected static CreateTransferRequest TransferRequest(int source, int dest, params (int ProductId, decimal Qty)[] lines) => new()
    {
        SourceWarehouseId = source, DestWarehouseId = dest, TransferDate = TransferDateUtc, Status = TransferStatus.Draft,
        Items = lines.Select(l => new CreateTransferItemRequest { ProductId = l.ProductId, Quantity = l.Qty }).ToList(),
    };

    protected async Task<int> ArrangeDraftTransferAsync(HttpClient client, int source, int dest, params (int ProductId, decimal Qty)[] lines)
    {
        var res = await PostAsync(client, "/api/transfers", TransferRequest(source, dest, lines));
        Assert.True(res.IsSuccess, $"Arrange: tạo phiếu chuyển thất bại {res.StatusCode} {res.Body}");
        var id = res.Int("stockTransferId");
        Step($"Arrange: phiếu chuyển {res.String("transferCode")} (id {id}) {source} → {dest}, Phiếu tạm");
        return id;
    }

    protected async Task<int> ArrangeInTransitTransferAsync(HttpClient client, int source, int dest, params (int ProductId, decimal Qty)[] lines)
    {
        var id = await ArrangeDraftTransferAsync(client, source, dest, lines);
        var res = await PostAsync(client, $"/api/transfers/{id}/complete");
        Assert.True(res.IsSuccess, $"Arrange: xuất chuyển thất bại {res.StatusCode} {res.Body}");
        Step($"Arrange: phiếu chuyển id {id} → Đang chuyển");
        return id;
    }

    protected static ReceiveTransferRequest Receive(string? notes, params (int ProductId, decimal Received)[] lines) => new()
    {
        Notes = notes,
        Items = lines.Select(l => new ReceiveTransferItemRequest { ProductId = l.ProductId, ReceivedQuantity = l.Received }).ToList(),
    };

    protected Task<TrxStockTransfer> TransferAsync(int id) => QueryAsync(db =>
        db.TrxStockTransfers.Include(t => t.DtlStockTransferItems).SingleAsync(t => t.StockTransferId == id));

    /// <summary>Dòng thẻ kho của phiếu chuyển (reference_type = TRANSFER).</summary>
    protected Task<List<TrxInventoryTransaction>> TransferCardAsync(int id) => QueryAsync(db =>
        db.TrxInventoryTransactions.Where(t => t.ReferenceType == "TRANSFER" && t.ReferenceId == id).OrderBy(t => t.TransactionId).ToListAsync());

    protected static string Describe(IEnumerable<TrxInventoryTransaction> card) =>
        string.Join(", ", card.Select(c => $"{c.TransactionType} kho {c.WarehouseId} {c.Quantity:0.##}"));

    // ───────────── Kiểm kho ─────────────

    protected static SaveStocktakeRequest Stocktake(int warehouseId, string status, params (int ProductId, decimal Actual)[] lines) => new()
    {
        WarehouseId = warehouseId, Status = status,
        Items = lines.Select(l => new StocktakeItemRequest { ProductId = l.ProductId, ActualQty = l.Actual }).ToList(),
    };

    protected async Task<int> ArrangeStocktakeAsync(HttpClient client, int warehouseId, string status, params (int ProductId, decimal Actual)[] lines)
    {
        var res = await PostAsync(client, "/api/stocktakes", Stocktake(warehouseId, status, lines));
        Assert.True(res.IsSuccess, $"Arrange: lưu phiếu kiểm kho thất bại {res.StatusCode} {res.Body}");
        var id = res.Node!["summary"]!["stocktakeId"]!.GetValue<int>();
        Step($"Arrange: phiếu kiểm {res.Node["summary"]!["stocktakeCode"]} (id {id}) {status}");
        return id;
    }

    protected Task<TrxStocktake> StocktakeAsync(int id) => QueryAsync(db =>
        db.TrxStocktakes.Include(t => t.DtlStocktakeItems).SingleAsync(t => t.StocktakeId == id));

    protected Task<List<TrxInventoryTransaction>> StocktakeCardAsync(int id) => QueryAsync(db =>
        db.TrxInventoryTransactions.Where(t => t.ReferenceType == "STOCKTAKE" && t.ReferenceId == id).OrderBy(t => t.TransactionId).ToListAsync());

    // ───────────── Xuất hủy ─────────────

    protected static SaveDisposalRequest Disposal(int warehouseId, string status, string? reason, params (int ProductId, decimal Qty)[] lines) =>
        new(warehouseId, null, reason, status, lines.Select(l => new DisposalItemRequest(l.ProductId, l.Qty, null)).ToList());

    protected Task<List<TrxInventoryTransaction>> DisposalCardAsync(int id) => QueryAsync(db =>
        db.TrxInventoryTransactions.Where(t => t.ReferenceType == "DISPOSAL" && t.ReferenceId == id).OrderBy(t => t.TransactionId).ToListAsync());

    // ───────────── Phiếu nhập ─────────────

    protected CreatePurchaseRequest Purchase(int warehouseId, string status, params (int ProductId, decimal Qty, decimal Price)[] lines) =>
        new(warehouseId, Ids.Ncc01, null, null, status, 0m, "CASH", null,
            lines.Select(l => new CreatePurchaseItemRequest(l.ProductId, l.Qty, l.Price)).ToList());

    protected async Task<int> ArrangePurchaseAsync(HttpClient client, int warehouseId, string status, params (int ProductId, decimal Qty, decimal Price)[] lines)
    {
        var res = await PostAsync(client, "/api/purchases", Purchase(warehouseId, status, lines));
        Assert.True(res.IsSuccess, $"Arrange: lập phiếu nhập thất bại {res.StatusCode} {res.Body}");
        var id = res.Node?["grId"]?.GetValue<int>()
                 ?? await QueryAsync(db => db.TrxGoodsReceipts.OrderByDescending(g => g.GrId).Select(g => g.GrId).FirstAsync());
        Step($"Arrange: phiếu nhập id {id} kho {warehouseId} {status}");
        return id;
    }

    protected static IEnumerable<int> WarehouseIdsOf(ApiResult list) =>
        list.Items.Select(x => x?["warehouseId"]?.GetValue<int>() ?? 0);
}
