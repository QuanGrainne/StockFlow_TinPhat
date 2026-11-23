using StockFlow.Application.Common;
using StockFlow.UnitTests.Common;

namespace StockFlow.UnitTests.Production.Plans;

/// <summary>Dựng chung cho gửi duyệt / duyệt / từ chối kế hoạch: FG-01 có định mức đang áp dụng, FG-02 không có.</summary>
internal static class PlanTestBase
{
    public static DateOnly Today => DateOnly.FromDateTime(VietnamTime.Now);

    /// <summary>Kỳ ở tương lai (không vướng luật Q-V1 "kỳ đã kết thúc cần ghi chú").</summary>
    public static (DateOnly Start, DateOnly End) FuturePeriod => (Today.AddDays(10), Today.AddDays(40));

    public static TestStockFlowDbContext Database(bool fg01HasActiveBom = true)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        ProductionData.SeedProducts(db);
        ProductionData.AddBom(db, ProductionData.Fg01, "1.0", active: fg01HasActiveBom);
        return db;
    }
}
