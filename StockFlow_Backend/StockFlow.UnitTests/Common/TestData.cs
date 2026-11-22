using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Domain.Entities;

namespace StockFlow.UnitTests.Common;

/// <summary>
/// Dữ liệu mẫu tối thiểu, cùng id / mã với DatabaseSeeder để khớp Precondition trong Report 5.1:
/// kho 1–2 ngừng hoạt động, K001 = 3 (Gia Lâm), K002 = 4 (Đông Anh), K003 = 5, K004 = 6; hàng P-TEST.
/// Không gọi DatabaseSeeder (dùng migration / PostgreSQL).
/// </summary>
public static class TestData
{
    public const int UserId = 1;
    public const int OtherUserId = 2;

    public const int InactiveWarehouse = 1;
    public const int K001 = 3;
    public const int K002 = 4;
    public const int K003 = 5;
    public const int K004 = 6;

    public const int UnitId = 1;
    public const int CategoryId = 1;
    public const int PTest = 1;
    public const string PTestCode = "P-TEST";

    /// <summary>Kho, người dùng, đơn vị, nhóm hàng và hàng P-TEST (giá vốn 10.000).</summary>
    public static void SeedMasterData(TestStockFlowDbContext db, decimal pTestCost = 10_000m)
    {
        db.SecUsers.AddRange(
            new SecUser { UserId = UserId, Username = "kho01", FullName = "Nhân viên kho 01", IsActive = true },
            new SecUser { UserId = OtherUserId, Username = "kho02", FullName = "Nhân viên kho 02", IsActive = true });

        db.MstWarehouses.AddRange(
            new MstWarehouse { WarehouseId = InactiveWarehouse, WarehouseCode = "KTP-01", WarehouseName = "Kho Thành Phẩm", IsActive = false },
            new MstWarehouse { WarehouseId = 2, WarehouseCode = "KNVL-01", WarehouseName = "Kho Nguyên Vật Liệu", IsActive = false },
            new MstWarehouse { WarehouseId = K001, WarehouseCode = "K001", WarehouseName = "Kho Tổng Gia Lâm", IsActive = true },
            new MstWarehouse { WarehouseId = K002, WarehouseCode = "K002", WarehouseName = "Kho Đông Anh", IsActive = true },
            new MstWarehouse { WarehouseId = K003, WarehouseCode = "K003", WarehouseName = "Kho Hà Đông", IsActive = true },
            new MstWarehouse { WarehouseId = K004, WarehouseCode = "K004", WarehouseName = "Kho Hoàn Kiếm", IsActive = true });

        db.MstUnits.Add(new MstUnit { UnitId = UnitId, UnitName = "Cái", Abbreviation = "cái" });
        db.MstProductCategories.Add(new MstProductCategory { CategoryId = CategoryId, CategoryName = "Hàng test", IsActive = true });
        db.MstProducts.Add(new MstProduct
        {
            ProductId = PTest,
            ProductCode = PTestCode,
            ProductName = "Sản phẩm test",
            CategoryId = CategoryId,
            BaseUnitId = UnitId,
            ProductType = "GOODS",
            MovingAverageCost = pTestCost,
            IsActive = true,
        });
        SaveAndDetach(db);
    }

    /// <summary>Tạo dòng tồn mặc định (không vị trí, không lô) của hàng tại kho.</summary>
    public static void SetStock(TestStockFlowDbContext db, int warehouseId, int productId, decimal quantity, decimal unitCost)
    {
        db.TrxInventoryBalances.Add(new TrxInventoryBalance
        {
            WarehouseId = warehouseId,
            ProductId = productId,
            Quantity = quantity,
            UnitCost = unitCost,
            LastUpdated = VietnamTime.Now,
        });
        SaveAndDetach(db);
    }

    /// <summary>Tạo phiếu chuyển một dòng hàng ở trạng thái cho trước; trả về id phiếu.</summary>
    public static int AddTransfer(
        TestStockFlowDbContext db,
        string status,
        decimal quantity,
        int source = K001,
        int dest = K002,
        decimal? issuedQuantity = null,
        decimal? receivedQuantity = null,
        decimal? unitCost = null,
        DateTime? transferDate = null)
    {
        var transfer = new TrxStockTransfer
        {
            TransferCode = $"CK{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}",
            SourceWarehouseId = source,
            DestWarehouseId = dest,
            CreatedBy = UserId,
            TransferDate = transferDate ?? VietnamTime.Now.AddHours(-2),
            Status = status,
        };
        db.TrxStockTransfers.Add(transfer);
        db.SaveChanges();
        db.DtlStockTransferItems.Add(new DtlStockTransferItem
        {
            StockTransferId = transfer.StockTransferId,
            ProductId = PTest,
            Quantity = quantity,
            IssuedQuantity = issuedQuantity ?? 0,
            ReceivedQuantity = receivedQuantity,
            UnitCost = unitCost,
        });
        SaveAndDetach(db);
        return transfer.StockTransferId;
    }

    /// <summary>Tổng tồn của hàng tại kho (đọc lại từ database, không dùng bộ nhớ đệm của DbContext).</summary>
    public static decimal StockOf(TestStockFlowDbContext db, int warehouseId, int productId = PTest) =>
        db.TrxInventoryBalances.AsNoTracking()
            .Where(b => b.WarehouseId == warehouseId && b.ProductId == productId)
            .Sum(b => b.Quantity ?? 0);

    /// <summary>Các dòng thẻ kho của một chứng từ.</summary>
    public static List<TrxInventoryTransaction> CardEntries(TestStockFlowDbContext db, string referenceType, int referenceId) =>
        db.TrxInventoryTransactions.AsNoTracking()
            .Where(t => t.ReferenceType == referenceType && t.ReferenceId == referenceId)
            .OrderBy(t => t.TransactionId)
            .ToList();

    /// <summary>Lưu rồi bỏ theo dõi để handler đọc dữ liệu như đọc từ DB (không dùng lại object của bước Arrange).</summary>
    public static void SaveAndDetach(TestStockFlowDbContext db)
    {
        db.SaveChanges();
        db.ChangeTracker.Clear();
    }
}
