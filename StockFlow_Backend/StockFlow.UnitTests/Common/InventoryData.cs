using StockFlow.Application.Common;
using StockFlow.Domain.Entities;

namespace StockFlow.UnitTests.Common;

/// <summary>Dữ liệu mẫu cho kiểm kho và xuất hủy.</summary>
public static class InventoryData
{
    /// <summary>Phiếu kiểm 1 dòng P-TEST; trả về id phiếu.</summary>
    public static int AddStocktake(
        TestStockFlowDbContext db, string status, decimal systemQty, decimal actualQty,
        int warehouseId = TestData.K001, string? code = null, decimal unitCost = 10_000m)
    {
        var stocktake = new TrxStocktake
        {
            StocktakeCode = code ?? $"KK{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}",
            WarehouseId = warehouseId,
            ConductedBy = TestData.UserId,
            StocktakeDate = VietnamTime.Now.AddHours(-1),
            Status = status,
        };
        stocktake.DtlStocktakeItems.Add(new DtlStocktakeItem
        {
            ProductId = TestData.PTest, SystemQty = systemQty, ActualQty = actualQty, Discrepancy = actualQty - systemQty,
            UnitCost = unitCost, AdjustmentStatus = status == "BALANCED" ? "ADJUSTED" : "PENDING", RecordedBy = TestData.UserId,
        });
        db.TrxStocktakes.Add(stocktake);
        TestData.SaveAndDetach(db);
        return stocktake.StocktakeId;
    }

    /// <summary>Phiếu xuất hủy 1 dòng P-TEST; phiếu COMPLETED kèm dòng thẻ kho DISPOSAL đã trừ (để hủy hoàn lại được).</summary>
    public static int AddDisposal(
        TestStockFlowDbContext db, string code, string status, decimal quantity, int warehouseId = TestData.K001, decimal unitCost = 10_000m)
    {
        var disposal = new TrxInventoryDisposal
        {
            DisposalCode = code, WarehouseId = warehouseId, ProcessedBy = TestData.UserId, CreatedBy = TestData.UserId,
            DisposalDate = VietnamTime.Now.AddHours(-1), Reason = "Hàng vỡ", Status = status,
        };
        disposal.DtlInventoryDisposalItems.Add(new DtlInventoryDisposalItem { ProductId = TestData.PTest, Quantity = quantity });
        db.TrxInventoryDisposals.Add(disposal);
        db.SaveChanges();
        if (status == "COMPLETED")
        {
            db.TrxInventoryTransactions.Add(new TrxInventoryTransaction
            {
                WarehouseId = warehouseId, ProductId = TestData.PTest, TransactionType = "DISPOSAL", Quantity = -quantity,
                ReferenceType = "DISPOSAL", ReferenceId = disposal.DisposalId, TransactionDate = disposal.DisposalDate,
                CreatedBy = TestData.UserId, TransactionPrice = unitCost, UnitCost = unitCost,
            });
        }
        TestData.SaveAndDetach(db);
        return disposal.DisposalId;
    }
}
