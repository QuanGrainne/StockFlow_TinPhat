using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Production.Commands;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;
using static StockFlow.UnitTests.Production.Plans.PlanTestBase;

namespace StockFlow.UnitTests.Production.Plans;

/// <summary>
/// Report 5.1 – sheet ApproveProductionPlan (chưa có mã SF-FUNC): người có feature "Duyệt kế hoạch sản xuất" duyệt kế hoạch
/// PENDING_APPROVAL (APPROVED, ApprovedBy, ApprovalDate); kiểm lại định mức lúc duyệt.
/// </summary>
public class ApproveProductionPlanTests
{
    private const string Function = "ApproveProductionPlan";

    private static ApproveProductionPlanCommandHandler Handler(TestStockFlowDbContext db, bool canApprove = true) =>
        new(db, CurrentUser.WithWarehouses(TestData.UserId, TestData.K001).Object,
            (canApprove ? Permissions.WithFeatures(ProductionData.ApprovalFeature) : Permissions.WithFeatures(ProductionData.PlanFeature)).Object);

    [Fact(DisplayName = "ApproveProductionPlan/UTCID01 – duyệt KH0001: APPROVED, ghi ApprovedBy và ApprovalDate")]
    [Trait("Function", Function)]
    [Trait("UTCID", "ApproveProductionPlan/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_PendingPlan_Approves()
    {
        // Arrange
        var db = Database();
        var (start, end) = FuturePeriod;
        var id = ProductionData.AddPlan(db, "KH0001", ProductionPlanStatus.PendingApproval, ProductionData.Fg01, start, end);

        // Act
        var result = await Handler(db).Handle(new ApproveProductionPlanCommand(id), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        var plan = await db.TrxProductionPlans.AsNoTracking().SingleAsync();
        Assert.Equal(ProductionPlanStatus.Approved, plan.Status);
        Assert.Equal(TestData.UserId, plan.ApprovedBy);
        Assert.NotNull(plan.ApprovalDate);
    }

    [Fact(DisplayName = "ApproveProductionPlan/UTCID02 – người dùng không có feature duyệt")]
    [Trait("Function", Function)]
    [Trait("UTCID", "ApproveProductionPlan/UTCID02")]
    [Trait("Type", "A")]
    public async Task UTCID02_UserWithoutApprovalFeature_ReturnsError()
    {
        // Arrange
        var db = Database();
        var (start, end) = FuturePeriod;
        var id = ProductionData.AddPlan(db, "KH0001", ProductionPlanStatus.PendingApproval, ProductionData.Fg01, start, end);

        // Act
        var result = await Handler(db, canApprove: false).Handle(new ApproveProductionPlanCommand(id), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Chỉ người có quyền duyệt kế hoạch sản xuất mới được thực hiện thao tác này.", result.Error);
    }

    [Fact(DisplayName = "ApproveProductionPlan/UTCID03 – định mức FG-01 bị ngừng áp dụng sau khi gửi duyệt")]
    [Trait("Function", Function)]
    [Trait("UTCID", "ApproveProductionPlan/UTCID03")]
    [Trait("Type", "A")]
    public async Task UTCID03_BomDeactivatedAfterSubmit_ReturnsError()
    {
        // Arrange
        var db = Database(fg01HasActiveBom: false);
        var (start, end) = FuturePeriod;
        var id = ProductionData.AddPlan(db, "KH0001", ProductionPlanStatus.PendingApproval, ProductionData.Fg01, start, end);

        // Act
        var result = await Handler(db).Handle(new ApproveProductionPlanCommand(id), CancellationToken.None);

        // Assert – Expected theo D.1 đã duyệt
        Assert.False(result.IsSuccess);
        Assert.Equal("Không duyệt được kế hoạch. Thành phẩm chưa có định mức đang áp dụng. Vui lòng thiết lập định mức trước. (FG-01)", result.Error);
        Assert.Equal(ProductionPlanStatus.PendingApproval, (await db.TrxProductionPlans.AsNoTracking().SingleAsync()).Status);
    }

    [Fact(DisplayName = "ApproveProductionPlan/UTCID04 – KH0005 còn DRAFT")]
    [Trait("Function", Function)]
    [Trait("UTCID", "ApproveProductionPlan/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_DraftPlan_ReturnsError()
    {
        // Arrange
        var db = Database();
        var (start, end) = FuturePeriod;
        var id = ProductionData.AddPlan(db, "KH0005", ProductionPlanStatus.Draft, ProductionData.Fg01, start, end);

        // Act
        var result = await Handler(db).Handle(new ApproveProductionPlanCommand(id), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Kế hoạch sản xuất không thể thực hiện thao tác này ở trạng thái hiện tại.", result.Error);
    }
}
