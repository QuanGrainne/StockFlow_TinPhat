using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Features.PriceBooks.Commands;
using StockFlow.Application.Features.Products.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.IntegrationTests.Infrastructure;
using StockFlow.IntegrationTests.Inventory;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.MasterData;

/// <summary>
/// Report 5.2 – sheet "Product Stock Adjustment" (chức năng 1, UC-52, UC-73), "Product Import from Excel" (2, UC-52),
/// "Price Book and Formula Applied" (3, UC-52 bảng giá). User A = it.ops.k001 (GOODS_*, STOCK_*, SALES_CREATE, K001); User B = it.ops.k002.
/// </summary>
public sealed class ProductAndPriceBookTests : InventoryTestBase
{
    public ProductAndPriceBookTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    // ───────── Product Stock Adjustment & Stock Card ─────────

    private async Task<HttpClient> ArrangeStockAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        return await ClientAsync(TestDataSeeder.OpsK001);
    }

    private Task<ApiResult> AdjustAsync(HttpClient a, string mode, decimal qty, int warehouse = K001) =>
        PostAsync(a, $"/api/products/{Ids.PTest}/stock-adjustments", new AdjustProductStockRequest(warehouse, qty, mode));

    private Task<List<TrxInventoryTransaction>> StocktakeRowsAsync() => QueryAsync(db =>
        db.TrxInventoryTransactions.Where(t => t.ReferenceType == "STOCKTAKE" && t.ProductId == Ids.PTest).ToListAsync());

    [Fact(DisplayName = "INT-PRD-01-01 | Add stock from the catalog")]
    public async Task INT_PRD_01_01_AddStock()
    {
        var a = await ArrangeStockAsync();
        var res = await AdjustAsync(a, "ADD", 20m);

        var check = new Checks(Output);
        check.Success(res);
        check.True("Phản hồi có mã phiếu kiểm", !string.IsNullOrEmpty(res.String("stocktakeCode")), res.String("stocktakeCode") ?? "(null)");
        check.Equal("Tồn K001", 120m, await StockAsync(K001, Ids.PTest));
        check.Equal("Giá vốn giữ 10.000", 10_000m, await CostAsync(K001, Ids.PTest));
        var rows = await StocktakeRowsAsync();
        var balanced = await QueryAsync(db => db.TrxStocktakes.Where(s => s.Status == "BALANCED").Select(s => s.StocktakeId).ToListAsync());
        check.True("1 dòng STOCKTAKE_IN +20 gắn phiếu kiểm BALANCED",
            rows.Count == 1 && rows[0].TransactionType == "STOCKTAKE_IN" && rows[0].Quantity == 20m && balanced.Contains(rows[0].ReferenceId ?? 0), Describe(rows));
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRD-01-02 | Set real stock lower")]
    public async Task INT_PRD_01_02_SetLower()
    {
        var a = await ArrangeStockAsync();
        var res = await AdjustAsync(a, "SET", 80m);

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Tồn K001", 80m, await StockAsync(K001, Ids.PTest));
        var rows = await StocktakeRowsAsync();
        check.True("1 dòng STOCKTAKE_OUT -20", rows.Count == 1 && rows[0].TransactionType == "STOCKTAKE_OUT" && rows[0].Quantity == -20m, Describe(rows));
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRD-01-03 | Set the same quantity")]
    public async Task INT_PRD_01_03_SetSame()
    {
        var a = await ArrangeStockAsync();
        var res = await AdjustAsync(a, "SET", 100m);

        var check = new Checks(Output);
        check.Equal("HTTP status", 200, res.StatusCode);
        check.Equal("Không tạo phiếu kiểm", 0, await QueryAsync(db => db.TrxStocktakes.CountAsync()));
        check.Equal("Không ghi thẻ kho", 0, await CountInventoryTransactionsAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRD-01-04 | Negative real stock")]
    public async Task INT_PRD_01_04_Negative()
    {
        var a = await ArrangeStockAsync();
        var res = await AdjustAsync(a, "SET", -1m);

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Tồn kho thực tế không được âm.", res);
        check.Equal("Tồn không đổi", 100m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRD-01-05 | Warehouse not assigned")]
    public async Task INT_PRD_01_05_WarehouseNotAssigned()
    {
        await ArrangeStockAsync();
        var b = await ClientAsync(TestDataSeeder.OpsK002); // STOCK_UPDATE, chỉ K002
        var res = await AdjustAsync(b, "ADD", 20m);

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Bạn không có quyền điều chỉnh tồn kho tại Kho Gia Lâm.", res);
        check.Equal("Không tạo phiếu kiểm", 0, await QueryAsync(db => db.TrxStocktakes.CountAsync()));
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRD-01-06 | Stock card shows the adjustment")]
    public async Task INT_PRD_01_06_StockCard()
    {
        var a = await ArrangeStockAsync();
        var adj = await AdjustAsync(a, "ADD", 20m);
        Assert.True(adj.IsSuccess, adj.Body);
        var code = adj.String("stocktakeCode");

        var res = await GetAsync(a, $"/api/products/{Ids.PTest}/stock-card?warehouseId={K001}");

        var check = new Checks(Output);
        check.Success(res);
        var text = res.Body;
        check.True("Có dòng điều chỉnh với mã phiếu kiểm", code != null && text.Contains(code), code ?? "(null)");
        var balanceNow = await StockAsync(K001, Ids.PTest);
        check.True("Tồn lũy kế trên thẻ kho khớp trx_inventory_balances (120)", text.Contains("120"), $"balance = {balanceNow}");
        check.Assert();
    }

    // ───────── Product Import from Excel ─────────

    private static ImportProductItemRequest Item(string code, string name, decimal price) => new() { Code = code, Name = name, StandardPrice = price, Uom = "Cái" };

    private async Task ArrangeImpProductAsync() => await ArrangeDbAsync(db =>
    {
        db.MstProducts.Add(new MstProduct
        {
            ProductCode = "SP-IMP-01", ProductName = "Đèn lồng đỏ", CategoryId = 1, BaseUnitId = 8, ProductType = "FINISHED",
            StandardPrice = 50_000m, MovingAverageCost = 30_000m, IsActive = true, CreatedAt = VietnamTime.Now,
        });
        return Task.CompletedTask;
    });

    [Fact(DisplayName = "INT-PRD-02-01 | Import new products (phần backend; chọn file trên màn Hàng hóa là E2E)")]
    public async Task INT_PRD_02_01_ImportNew()
    {
        await ArrangeImpProductAsync();
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        var res = await PostAsync(a, "/api/products/import", new ImportProductsRequest
        {
            Products = new() { Item("SP-NEW-01", "Hàng mới 1", 10_000m), Item("SP-NEW-02", "Hàng mới 2", 20_000m), Item("SP-NEW-03", "Hàng mới 3", 30_000m) },
        });

        var check = new Checks(Output);
        check.Success(res);
        Actual("Kết quả import", res.Body);
        var rows = await QueryAsync(db => db.MstProducts.Where(p => p.ProductCode!.StartsWith("SP-NEW-")).ToListAsync());
        check.True("3 dòng mst_products, IsActive = true", rows.Count == 3 && rows.All(p => p.IsActive == true), $"{rows.Count} dòng");
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRD-02-02 | Update an existing product")]
    public async Task INT_PRD_02_02_UpdateExisting()
    {
        await ArrangeImpProductAsync();
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        var res = await PostAsync(a, "/api/products/import", new ImportProductsRequest { Products = new() { Item("SP-IMP-01", "Đèn lồng đỏ", 65_000m) } });

        var check = new Checks(Output);
        check.Success(res);
        Actual("Kết quả import", res.Body);
        var p = await QueryAsync(db => db.MstProducts.SingleAsync(x => x.ProductCode == "SP-IMP-01"));
        check.Equal("Giá SP-IMP-01 đã đổi", 65_000m, p.StandardPrice);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRD-02-03 | Same code, different name")]
    public async Task INT_PRD_02_03_SameCodeDifferentName()
    {
        await ArrangeImpProductAsync();
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        var res = await PostAsync(a, "/api/products/import", new ImportProductsRequest { Products = new() { Item("SP-IMP-01", "Đèn lồng xanh", 65_000m) } });

        var check = new Checks(Output);
        check.True("Có lỗi trùng mã khác tên", res.Body.Contains("Dòng 1: Trùng mã hàng 'SP-IMP-01' nhưng khác tên hàng hóa ('Đèn lồng đỏ' vs 'Đèn lồng xanh')."), res.Body);
        check.Equal("Tên hàng không đổi", "Đèn lồng đỏ", (await QueryAsync(db => db.MstProducts.SingleAsync(x => x.ProductCode == "SP-IMP-01"))).ProductName);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRD-02-04 | Empty file")]
    public async Task INT_PRD_02_04_EmptyFile()
    {
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        var res = await PostAsync(a, "/api/products/import", new ImportProductsRequest());

        var check = new Checks(Output);
        check.Message("Thông báo", "Danh sách sản phẩm import trống.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRD-02-05 | No permission")]
    public async Task INT_PRD_02_05_NoPermission()
    {
        var u = await ClientAsync(TestDataSeeder.StockRead); // không có GOODS_CREATE
        var res = await PostAsync(u, "/api/products/import", new ImportProductsRequest { Products = new() { Item("SP-X-01", "Hàng X", 1_000m) } });

        var check = new Checks(Output);
        check.Equal("HTTP status", 403, res.StatusCode);
        check.Equal("Không tạo hàng", 0, await QueryAsync(db => db.MstProducts.CountAsync(p => p.ProductCode == "SP-X-01")));
        check.Assert();
    }

    // ───────── Price Book & Formula Applied to POS ─────────

    private static CreatePriceBookCommand PriceBook(string name, DateTime? from, DateTime? to,
        string? baseType = null, string? op = null, decimal? value = null, string? unit = null) =>
        new(name, from, to, true, baseType, null, op, value, unit);

    private async Task<int> ArrangePriceBookAsync(HttpClient a, CreatePriceBookCommand cmd)
    {
        var res = await PostAsync(a, "/api/price-books", cmd);
        Assert.True(res.IsSuccess, $"Arrange bảng giá: {res.StatusCode} {res.Body}");
        return await QueryAsync(db => db.MstPriceBooks.Where(p => p.PriceBookName == cmd.PriceBookName).Select(p => p.PriceBookId).SingleAsync());
    }

    private async Task<decimal?> MatrixPriceAsync(HttpClient a, int priceBookId)
    {
        var m = await GetAsync(a, $"/api/price-books/matrix?search=P-TEST&priceBookIds={priceBookId}&allProducts=true&pageSize=50");
        var row = m.Items.FirstOrDefault(i => i?["productCode"]?.GetValue<string>() == "P-TEST");
        var node = row?["prices"]?[priceBookId.ToString()];
        return node == null ? null : node.GetValue<decimal?>();
    }

    [Fact(DisplayName = "INT-PRB-03-01 | Create a price book")]
    public async Task INT_PRB_03_01_Create()
    {
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        var res = await PostAsync(a, "/api/price-books", PriceBook("Giá sỉ", DateTime.UtcNow, DateTime.UtcNow.AddDays(30)));

        var check = new Checks(Output);
        check.Equal("HTTP status", 200, res.StatusCode);
        check.Equal("Dòng bảng giá được tạo", 1, await QueryAsync(db => db.MstPriceBooks.CountAsync(p => p.PriceBookName == "Giá sỉ")));
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRB-03-02 | Start after end")]
    public async Task INT_PRB_03_02_StartAfterEnd()
    {
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        var res = await PostAsync(a, "/api/price-books", PriceBook("Giá sai ngày", DateTime.UtcNow.AddDays(10), DateTime.UtcNow));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Ngày bắt đầu hiệu lực phải trước ngày kết thúc.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRB-03-03 | Apply +10% formula")]
    public async Task INT_PRB_03_03_ApplyFormula()
    {
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        var id = await ArrangePriceBookAsync(a, PriceBook("Giá sỉ", DateTime.UtcNow, DateTime.UtcNow.AddDays(30)));

        // Gửi đúng như bước trong workbook: công thức trong body của apply-formula
        var res = await PostAsync(a, $"/api/price-books/{id}/apply-formula",
            new JsonObject { ["source"] = "general", ["operator"] = "+", ["value"] = 10, ["unit"] = "PERCENT", ["allProducts"] = true });
        var price = await MatrixPriceAsync(a, id);

        var check = new Checks(Output);
        Actual("apply-formula", $"{res.StatusCode} {res.Body}");
        check.Equal("Giá P-TEST trong \"Giá sỉ\"", 110_000m, price);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRB-03-04 | Negative adjustment value")]
    public async Task INT_PRB_03_04_NegativeValue()
    {
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        var id = await ArrangePriceBookAsync(a, PriceBook("Giá sỉ", DateTime.UtcNow, DateTime.UtcNow.AddDays(30)));

        var res = await PostAsync(a, $"/api/price-books/{id}/apply-formula",
            new JsonObject { ["source"] = "general", ["operator"] = "+", ["value"] = -5, ["unit"] = "PERCENT", ["allProducts"] = true });

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Giá trị điều chỉnh không được âm.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRB-03-05 | POS uses the price book (phần backend; chọn bảng giá trên POS là E2E)")]
    public async Task INT_PRB_03_05_PosUsesPriceBook()
    {
        await SetStockAsync(K001, Ids.PTest, 50);
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        // POS (frontend) điền đơn giá theo bảng giá "Giá sỉ" và gắn ghi chú [Bảng giá: Giá sỉ] vào hóa đơn
        var req = Pos(WalkIn, K001, "CASH", 110_000m, new[] { (Ids.PTest, 1m, 110_000m) });
        req.Notes = "[Bảng giá: Giá sỉ]";
        var res = await PostAsync(a, "/api/orders/pos", req);

        var check = new Checks(Output);
        check.Success(res);
        var order = await OrderAsync(res.IsSuccess ? res.Int("orderId") : 0);
        check.Equal("Đơn giá 110.000", 110_000m, order?.DtlOrderItems.Single().UnitPrice);
        check.True("Ghi chú hóa đơn có [Bảng giá: Giá sỉ]", order?.Notes?.Contains("[Bảng giá: Giá sỉ]") == true, order?.Notes ?? "(null)");
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRB-03-06 | Default price book cannot be deleted")]
    public async Task INT_PRB_03_06_DeleteDefault()
    {
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        var id = await QueryAsync(db => db.MstPriceBooks.Where(p => p.IsDefault).Select(p => p.PriceBookId).SingleAsync());

        var res = await SendAsync(a, HttpMethod.Delete, $"/api/price-books/{id}");

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Không thể xóa 'Bảng giá chung' mặc định của hệ thống.", res);
        check.Assert();
    }

    /// <summary>Ca BỔ SUNG cho INT-PRB-03-03: code lưu công thức trên bảng giá (tạo / sửa), apply-formula chỉ tính lại theo công thức đã lưu.</summary>
    [Fact(DisplayName = "INT-PRB-03-S01 | (Bổ sung) Công thức +10% lưu trên bảng giá rồi áp dụng")]
    public async Task INT_PRB_03_S01_FormulaStoredOnPriceBook()
    {
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        var id = await ArrangePriceBookAsync(a, PriceBook("Giá sỉ CT", DateTime.UtcNow, DateTime.UtcNow.AddDays(30), "STANDARD", "+", 10m, "PERCENT"));

        var res = await PostAsync(a, $"/api/price-books/{id}/apply-formula", new JsonObject { ["allProducts"] = true });
        var price = await MatrixPriceAsync(a, id);

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Giá P-TEST = 100.000 + 10%", 110_000m, price);
        check.Assert();
    }

    /// <summary>Ca BỔ SUNG cho INT-PRB-03-04: luật "không âm" nằm ở lúc lưu công thức của bảng giá.</summary>
    [Fact(DisplayName = "INT-PRB-03-S02 | (Bổ sung) Lưu bảng giá với giá trị điều chỉnh âm")]
    public async Task INT_PRB_03_S02_NegativeValueOnSave()
    {
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        var res = await PostAsync(a, "/api/price-books", PriceBook("Giá âm", DateTime.UtcNow, DateTime.UtcNow.AddDays(30), "STANDARD", "+", -5m, "PERCENT"));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Giá trị điều chỉnh không được âm.", res);
        check.Assert();
    }
}
