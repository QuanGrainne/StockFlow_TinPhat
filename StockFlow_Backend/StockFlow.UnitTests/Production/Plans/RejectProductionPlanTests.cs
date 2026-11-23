using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Production.Commands;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;
using static StockFlow.UnitTests.Production.Plans.PlanTestBase;

namespace StockFlow.UnitTests.Production.Plans;

/// <summary>
/// Report 5.1 – sheet RejectProductionPlan (chưa có mã SF-FUNC): người duyệt từ chối kế hoạch PENDING_APPROVAL kèm lý do;
/// lý do được nối vào ghi chú kế hoạch.
/// </summary>
public class RejectProductionPlanTests
{
    private const string Function = "RejectProductionPlan";

    private static RejectProductionPlanCommandHandler Handler(TestStockFlowDbContext db, bool canApprove = true) =>
        new(db, CurrentUser.WithWarehouses(TestData.UserId, TestData.K001).Object,
            (canApprove ? Permissions.WithFeatures(ProductionData.ApprovalFeature) : Permissions.WithFeatures(ProductionData.PlanFeature)).Object);

    [Fact(DisplayName = "RejectProductionPlan/UTCID01 – từ chối KH0001, lý do \"Thiếu NVL\": REJECTED, ghi chú có dòng Từ chối")]
    [Trait("Function", Function)]
    [Trait("UTCID", "RejectProductionPlan/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_PendingPlan_RejectsAndAppendsReason()
    {
        // Arrange
        var db = Database();
        var (start, end) = FuturePeriod;
        var id = ProductionData.AddPlan(db, "KH0001", ProductionPlanStatus.PendingApproval, ProductionData.Fg01, start, end);

        // Act
        var result = await Handler(db).Handle(new RejectProductionPlanCommand(id, new ProductionPlanReasonRequest("Thiếu NVL")), CancellationToken.None);

        // Assert – Expected theo D.1 đã duyệt: Notes nối "[Từ chối <thời gian> - <người duyệt>] Thiếu NVL", không có ApprovedBy
        Assert.True(result.IsSuccess, result.Error);
        var plan = await db.TrxProductionPlans.AsNoTracking().SingleAsync();
        Assert.Equal(ProductionPlanStatus.Rejected, plan.Status);
        Assert.StartsWith("[Từ chối ", plan.Notes);
        Assert.Contains("- Nhân viên kho 01] Thiếu NVL", plan.Notes);
        Assert.Null(plan.ApprovedBy);
    }

    [Fact(DisplayName = "RejectProductionPlan/UTCID02 – lý do rỗng")]
    [Trait("Function", Function)]
    [Trait("UTCID", "RejectProductionPlan/UTCID02")]
    [Trait("Type", "A")]
    public async Task UTCID02_EmptyReason_ReturnsError()
    {
        // Arrange
        var db = Database();
        var (start, end) = FuturePeriod;
        var id = ProductionData.AddPlan(db, "KH0001", ProductionPlanStatus.PendingApproval, ProductionData.Fg01, start, end);

        // Act
        var result = await Handler(db).Handle(new RejectProductionPlanCommand(id, new ProductionPlanReasonRequest("")), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Vui lòng nhập lý do.", result.Error);
    }

    [Fact(DisplayName = "RejectProductionPlan/UTCID03 – người dùng không có feature duyệt")]
    [Trait("Function", Function)]
    [Trait("UTCID", "RejectProductionPlan/UTCID03")]
    [Trait("Type", "A")]
    public async Task UTCID03_UserWithoutApprovalFeature_ReturnsError()
    {
        // Arrange
        var db = Database();
        var (start, end) = FuturePeriod;
        var id = ProductionData.AddPlan(db, "KH0001", ProductionPlanStatus.PendingApproval, ProductionData.Fg01, start, end);

        // Act
        var result = await Handler(db, canApprove: false).Handle(new RejectProductionPlanCommand(id, new ProductionPlanReasonRequest("x")), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Chỉ người có quyền duyệt kế hoạch sản xuất mới được thực hiện thao tác này.", result.Error);
    }

    [Fact(DisplayName = "RejectProductionPlan/UTCID04 – KH0006 đã APPROVED")]
    [Trait("Function", Function)]
    [Trait("UTCID", "RejectProductionPlan/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_ApprovedPlan_ReturnsError()
    {
        // Arrange
        var db = Database();
        var (start, end) = FuturePeriod;
        var id = ProductionData.AddPlan(db, "KH0006", ProductionPlanStatus.Approved, ProductionData.Fg01, start, end);

        // Act
        var result = await Handler(db).Handle(new RejectProductionPlanCommand(id, new ProductionPlanReasonRequest("x")), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Kế hoạch sản xuất không thể thực hiện thao tác này ở trạng thái hiện tại.", result.Error);
    }
}
