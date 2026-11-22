using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Production.Commands;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;
using static StockFlow.UnitTests.Production.Plans.PlanTestBase;

namespace StockFlow.UnitTests.Production.Plans;

/// <summary>
/// Report 5.1 – sheet SubmitProductionPlan (chưa có mã SF-FUNC): gửi kế hoạch DRAFT đi duyệt (PENDING_APPROVAL);
/// mọi thành phẩm phải có định mức đang áp dụng; kỳ đã qua cần ghi chú. Người gửi là người lập (feature kế hoạch sản xuất).
/// </summary>
public class SubmitProductionPlanTests
{
    private const string Function = "SubmitProductionPlan";

    private static SubmitProductionPlanCommandHandler Handler(TestStockFlowDbContext db) =>
        new(db, CurrentUser.WithWarehouses(TestData.UserId, TestData.K001).Object, Permissions.WithFeatures(ProductionData.PlanFeature).Object);

    [Fact(DisplayName = "SubmitProductionPlan/UTCID01 – KH0001 DRAFT, FG-01 có định mức: PENDING_APPROVAL")]
    [Trait("Function", Function)]
    [Trait("UTCID", "SubmitProductionPlan/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_DraftPlanWithActiveBom_SetsPendingApproval()
    {
        // Arrange
        var db = Database();
        var (start, end) = FuturePeriod;
        var id = ProductionData.AddPlan(db, "KH0001", ProductionPlanStatus.Draft, ProductionData.Fg01, start, end);

        // Act
        var result = await Handler(db).Handle(new SubmitProductionPlanCommand(id), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(ProductionPlanStatus.PendingApproval, (await db.TrxProductionPlans.AsNoTracking().SingleAsync()).Status);
        Assert.Contains(ProductionPlanRules.LockKey(id), db.AcquiredLocks);
    }

    [Fact(DisplayName = "SubmitProductionPlan/UTCID02 – KH0003 có FG-02 chưa có định mức đang áp dụng")]
    [Trait("Function", Function)]
    [Trait("UTCID", "SubmitProductionPlan/UTCID02")]
    [Trait("Type", "A")]
    public async Task UTCID02_ProductWithoutActiveBom_ReturnsError()
    {
        // Arrange
        var db = Database();
        var (start, end) = FuturePeriod;
        var id = ProductionData.AddPlan(db, "KH0003", ProductionPlanStatus.Draft, ProductionData.Fg02, start, end);

        // Act
        var result = await Handler(db).Handle(new SubmitProductionPlanCommand(id), CancellationToken.None);

        // Assert – Expected theo D.1 đã duyệt
        Assert.False(result.IsSuccess);
        Assert.Equal("Thành phẩm chưa có định mức đang áp dụng. Vui lòng thiết lập định mức trước. (FG-02)", result.Error);
        Assert.Equal(ProductionPlanStatus.Draft, (await db.TrxProductionPlans.AsNoTracking().SingleAsync()).Status);
    }

    [Fact(DisplayName = "SubmitProductionPlan/UTCID03 – KH0004 kỳ đã kết thúc tháng trước, không ghi chú")]
    [Trait("Function", Function)]
    [Trait("UTCID", "SubmitProductionPlan/UTCID03")]
    [Trait("Type", "A")]
    public async Task UTCID03_PastPeriodWithoutNote_ReturnsError()
    {
        // Arrange
        var db = Database();
        var lastMonth = Today.AddMonths(-1);
        var start = new DateOnly(lastMonth.Year, lastMonth.Month, 1);
        var id = ProductionData.AddPlan(db, "KH0004", ProductionPlanStatus.Draft, ProductionData.Fg01, start, start.AddMonths(1).AddDays(-1));

        // Act
        var result = await Handler(db).Handle(new SubmitProductionPlanCommand(id), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Kỳ kế hoạch đã kết thúc trước hôm nay. Vui lòng ghi lý do vào ô Ghi chú.", result.Error);
    }

    [Fact(DisplayName = "SubmitProductionPlan/UTCID04 – KH0001 đã PENDING_APPROVAL")]
    [Trait("Function", Function)]
    [Trait("UTCID", "SubmitProductionPlan/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_AlreadyPending_ReturnsError()
    {
        // Arrange
        var db = Database();
        var (start, end) = FuturePeriod;
        var id = ProductionData.AddPlan(db, "KH0001", ProductionPlanStatus.PendingApproval, ProductionData.Fg01, start, end);

        // Act
        var result = await Handler(db).Handle(new SubmitProductionPlanCommand(id), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Kế hoạch sản xuất không thể thực hiện thao tác này ở trạng thái hiện tại.", result.Error);
    }

    [Fact(DisplayName = "SubmitProductionPlan/UTCID05 – kế hoạch id 999999 không tồn tại")]
    [Trait("Function", Function)]
    [Trait("UTCID", "SubmitProductionPlan/UTCID05")]
    [Trait("Type", "A")]
    public async Task UTCID05_UnknownPlan_ReturnsError()
    {
        // Arrange
        var db = Database();

        // Act
        var result = await Handler(db).Handle(new SubmitProductionPlanCommand(999_999), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Không tìm thấy kế hoạch sản xuất.", result.Error);
    }
}
