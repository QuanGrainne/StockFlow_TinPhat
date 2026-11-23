using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Production.Commands;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;
using StockFlow.Infrastructure.Services;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Production.Plans;

/// <summary>
/// Report 5.1 – sheet CreateProductionPlan (chưa có mã SF-FUNC): lập kế hoạch DRAFT gồm tên, kỳ, dòng thành phẩm.
/// Theo D.1 đã duyệt (P-04), mọi ca thêm kho xuất NVL = K001 và kho nhận thành phẩm của dòng = K001 (bắt buộc từ 20/11).
/// UTCID02–07 là luật của SaveProductionPlanRequestValidator → test lớp validator với "hôm nay" cố định 22/11/2026.
/// (Workbook ghi UC-59; Report 3 bản sao là UC-92, UC-93.)
/// </summary>
public class CreateProductionPlanTests
{
    private const string Function = "CreateProductionPlan";
    private static readonly DateOnly Today = new(2026, 11, 22);
    private static readonly DateOnly Start = new(2026, 12, 1);
    private static readonly DateOnly End = new(2026, 12, 31);

    private static SaveProductionPlanRequest Plan(
        string name = "Tết 2027", DateOnly? start = null, DateOnly? end = null, decimal quantity = 100,
        DateOnly? lineStart = null, DateOnly? lineEnd = null, bool withLine = true)
    {
        var items = withLine
            ? new List<SaveProductionPlanItemInput>
            {
                new(ProductionData.Fg01, quantity, lineStart ?? start ?? Start, lineEnd ?? end ?? End, TestData.K001, null),
            }
            : new List<SaveProductionPlanItemInput>();
        return new SaveProductionPlanRequest(name, start ?? Start, end ?? End, null, items, WarehouseId: TestData.K001);
    }

    private static List<string> Validate(SaveProductionPlanRequest request) =>
        new SaveProductionPlanRequestValidator(() => Today).Validate(request).Errors.Select(e => e.ErrorMessage).ToList();

    [Fact(DisplayName = "CreateProductionPlan/UTCID01 – \"Tết 2027\", 01/12–31/12, FG-01 SL 100: kế hoạch DRAFT")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateProductionPlan/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_ValidPlan_CreatesDraft()
    {
        // Arrange
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        ProductionData.SeedProducts(db);
        ProductionData.GrantWarehouse(db, TestData.UserId, TestData.K001);
        var user = CurrentUser.WithWarehouses(TestData.UserId, TestData.K001);
        var permissions = Permissions.WithFeatures(ProductionData.PlanFeature);
        var handler = new CreateProductionPlanCommandHandler(db, user.Object, permissions.Object, new TransactionCodeGenerator(db));

        // Act
        var result = await handler.Handle(new CreateProductionPlanCommand(Plan()), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(ProductionPlanStatus.Draft, result.Value!.Summary.Status);
        var plan = await db.TrxProductionPlans.AsNoTracking().Include(p => p.DtlProductionPlanItems).SingleAsync();
        Assert.Equal(ProductionPlanStatus.Draft, plan.Status);
        Assert.Equal("Tết 2027", plan.PlanName);
        Assert.Equal(TestData.K001, plan.WarehouseId);
        Assert.Equal(100, Assert.Single(plan.DtlProductionPlanItems).PlannedQuantity);
    }

    [Fact(DisplayName = "CreateProductionPlan/UTCID02 – tên kế hoạch rỗng (validator)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateProductionPlan/UTCID02")]
    [Trait("Type", "A")]
    public void UTCID02_EmptyName_ValidatorRejects()
    {
        // Arrange
        var request = Plan(name: "");

        // Act
        var errors = Validate(request);

        // Assert
        Assert.Equal(new[] { "Vui lòng nhập tên kế hoạch." }, errors);
    }

    [Fact(DisplayName = "CreateProductionPlan/UTCID03 – kỳ kết thúc 30/11 trước ngày bắt đầu 01/12 (validator)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateProductionPlan/UTCID03")]
    [Trait("Type", "A")]
    public void UTCID03_PeriodEndBeforeStart_ValidatorRejects()
    {
        // Arrange
        var request = Plan(end: new DateOnly(2026, 11, 30), lineStart: Start, lineEnd: Start);

        // Act
        var errors = Validate(request);

        // Assert – kỳ ngược thì dòng cũng nằm ngoài kỳ, nên có thể kèm thêm thông báo của BR-PP-04
        Assert.Contains("Ngày kết thúc kỳ kế hoạch không được trước ngày bắt đầu.", errors);
        Assert.DoesNotContain("Vui lòng chọn kho xuất nguyên vật liệu.", errors);
    }

    [Fact(DisplayName = "CreateProductionPlan/UTCID04 – kế hoạch không có dòng (validator)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateProductionPlan/UTCID04")]
    [Trait("Type", "A")]
    public void UTCID04_NoLines_ValidatorRejects()
    {
        // Arrange
        var request = Plan(withLine: false);

        // Act
        var errors = Validate(request);

        // Assert
        Assert.Equal(new[] { "Kế hoạch phải có ít nhất một thành phẩm." }, errors);
    }

    [Fact(DisplayName = "CreateProductionPlan/UTCID05 – dòng ngày 05/01/2027 ngoài kỳ (validator)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateProductionPlan/UTCID05")]
    [Trait("Type", "A")]
    public void UTCID05_LineOutsidePeriod_ValidatorRejects()
    {
        // Arrange
        var lineDate = new DateOnly(2027, 1, 5);
        var request = Plan(lineStart: lineDate, lineEnd: lineDate);

        // Act
        var errors = Validate(request);

        // Assert
        Assert.Equal(new[] { "Thời gian của từng dòng phải nằm trong kỳ kế hoạch." }, errors);
    }

    [Fact(DisplayName = "CreateProductionPlan/UTCID06 – FG-01 SL 0,001 (validator)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateProductionPlan/UTCID06")]
    [Trait("Type", "B")]
    public void UTCID06_ThreeDecimalQuantity_ValidatorRejects()
    {
        // Arrange
        var request = Plan(quantity: 0.001m);

        // Act
        var errors = Validate(request);

        // Assert
        Assert.Equal(new[] { "Số lượng kế hoạch phải lớn hơn 0 và có tối đa 2 chữ số thập phân." }, errors);
    }

    [Fact(DisplayName = "CreateProductionPlan/UTCID07 – FG-01 SL 1.000.000.000 (validator)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateProductionPlan/UTCID07")]
    [Trait("Type", "B")]
    public void UTCID07_QuantityAboveMax_ValidatorRejects()
    {
        // Arrange
        var request = Plan(quantity: 1_000_000_000m);

        // Act
        var errors = Validate(request);

        // Assert
        Assert.Equal(new[] { "Số lượng kế hoạch mỗi thành phẩm tối đa 999.999.999,99." }, errors);
    }
}
