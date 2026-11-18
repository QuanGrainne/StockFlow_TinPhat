using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Helpers;

/// <summary>Luật nhập thành phẩm dùng chung cho bước kiểm tra và bước ghi nhận (UC-49, BR-35, BR-37).</summary>
public static class FinishedGoodsRules
{
    // Vị trí lưu kho chọn từ trường "Vị trí" của danh mục Hàng hóa (mst_products.location_name, chuỗi tự do).
    // Bảng phiếu nhập thành phẩm chỉ có location_id (danh mục vị trí kho) → lưu vị trí dạng thẻ ở đầu ghi chú phiếu,
    // khi đọc tách ra lại thành cột Vị trí (không cần migration).
    private const string LocationTagPrefix = "[Vị trí: ";

    /// <summary>Gắn thẻ vị trí vào đầu ghi chú phiếu nhập (vị trí trống → giữ nguyên ghi chú).</summary>
    public static string? WithLocationTag(string? locationName, string? notes)
    {
        var loc = string.IsNullOrWhiteSpace(locationName) ? null : locationName.Trim().Replace("]", ")");
        var text = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        if (loc == null) return text;
        return text == null ? $"{LocationTagPrefix}{loc}]" : $"{LocationTagPrefix}{loc}] {text}";
    }

    /// <summary>Tách thẻ vị trí khỏi ghi chú phiếu nhập: (vị trí, ghi chú còn lại).</summary>
    public static (string? Location, string? Notes) SplitLocationTag(string? notes)
    {
        if (string.IsNullOrEmpty(notes) || !notes.StartsWith(LocationTagPrefix, StringComparison.Ordinal)) return (null, notes);
        var end = notes.IndexOf(']', LocationTagPrefix.Length);
        if (end < 0) return (null, notes);
        var rest = notes[(end + 1)..].Trim();
        return (notes[LocationTagPrefix.Length..end], rest.Length == 0 ? null : rest);
    }

    /// <summary>Số thành phẩm đã sản xuất luỹ kế của lệnh hoặc dòng thành phẩm (đạt + lỗi) theo các báo cáo đã ghi.</summary>
    public static async Task<(decimal Accepted, decimal Defect)> ProducedSoFarAsync(
        IStockFlowDbContext context, int productionOrderId, CancellationToken ct, int? productionOrderItemId = null)
    {
        if (productionOrderItemId.HasValue)
        {
            var itemRows = await context.TrxFinishedGoodsReceipts.AsNoTracking()
                .Where(f => f.ProductionOrderId == productionOrderId && f.ProductionOrderItemId == productionOrderItemId.Value)
                .Select(f => new { Accepted = f.Quantity ?? 0, Defect = f.Report.DefectQty ?? 0 })
                .ToListAsync(ct);
            return (itemRows.Sum(r => r.Accepted), itemRows.Sum(r => r.Defect));
        }

        var rows = await context.TrxProductionReports.AsNoTracking()
            .Where(r => r.ProductionOrderId == productionOrderId)
            .Select(r => new { Accepted = r.ProducedQty ?? 0, Defect = r.DefectQty ?? 0 })
            .ToListAsync(ct);
        return (rows.Sum(r => r.Accepted), rows.Sum(r => r.Defect));
    }

    /// <summary>
    /// BR-37: với số thành phẩm sản xuất luỹ kế sau phiếu này (đạt + lỗi), NVL nào cần nhiều hơn số đã xuất thì cảnh báo.
    /// Lượng cần = Nhu cầu của lệnh × SL sản xuất luỹ kế / SL kế hoạch.
    /// </summary>
    public static async Task<List<MaterialUsageWarningDto>> MaterialWarningsAsync(
        IStockFlowDbContext context, TrxProductionOrder order, decimal producedAfter, CancellationToken ct,
        int? productionOrderItemId = null, decimal? itemPlannedQty = null)
    {
        var planned = itemPlannedQty ?? order.PlannedQuantity ?? 0;
        var q = context.TrxProductionMaterialRequirements.AsNoTracking()
            .Where(r => r.ProductionOrderId == order.ProductionOrderId);
        if (productionOrderItemId.HasValue)
            q = q.Where(r => r.ProductionOrderItemId == productionOrderItemId.Value || r.ProductionOrderItemId == null);

        var reqs = await q
            .Select(r => new
            {
                Code = r.Material.ProductCode ?? "",
                Name = r.Material.ProductName ?? "",
                Unit = r.Unit.UnitName ?? "",
                Required = r.RequiredQty ?? 0,
                Issued = r.IssuedQty ?? 0,
            })
            .ToListAsync(ct);

        return reqs
            .Select(r => new { r, Needed = ProductionPolicy.MaterialNeededFor(r.Required, planned, producedAfter) })
            .Where(x => x.Needed > x.r.Issued)
            .Select(x => new MaterialUsageWarningDto(x.r.Code, x.r.Name, x.r.Unit, x.Needed, x.r.Issued))
            .ToList();
    }

    /// <summary>
    /// Số thành phẩm tối đa sản xuất được từ NVL ĐÃ XUẤT cho lệnh / dòng thành phẩm:
    /// nhỏ nhất của (SL kế hoạch × đã xuất ÷ nhu cầu) trên các NVL của thành phẩm (NVL dùng chung của lệnh cũng tính).
    /// Null = thành phẩm không có dòng nhu cầu NVL nào (không giới hạn).
    /// </summary>
    public static async Task<decimal?> ProducibleAsync(
        IStockFlowDbContext context, TrxProductionOrder order, CancellationToken ct,
        int? productionOrderItemId = null, decimal? itemPlannedQty = null)
    {
        var planned = itemPlannedQty ?? order.PlannedQuantity ?? 0;
        var q = context.TrxProductionMaterialRequirements.AsNoTracking()
            .Where(r => r.ProductionOrderId == order.ProductionOrderId);
        if (productionOrderItemId.HasValue)
            q = q.Where(r => r.ProductionOrderItemId == productionOrderItemId.Value || r.ProductionOrderItemId == null);

        var reqs = await q.Select(r => new { Required = r.RequiredQty ?? 0, Issued = r.IssuedQty ?? 0 }).ToListAsync(ct);
        var relevant = reqs.Where(r => r.Required > 0).ToList();
        if (relevant.Count == 0) return null;
        return relevant.Min(r => ProductionPolicy.ProducibleFromIssued(r.Required, r.Issued, planned));
    }

    /// <summary>Thông tin 1 lần nhập thành phẩm (dùng chung cho nhập thủ công và Duyệt hoàn thành).</summary>
    public sealed record ReceiveInput(
        TrxProductionOrder Order,
        DtlProductionOrderItem? Item,
        MstProduct Product,
        int WarehouseId,
        int? LocationId,
        string LotNumber,
        DateOnly? ProductionDate,
        decimal AcceptedQuantity,
        decimal DefectQuantity,
        string? DefectReason,
        string? Notes,
        bool NeedsReview,
        string? ReviewNote);

    /// <summary>
    /// Ghi nhận 1 phiếu nhập thành phẩm (UC-49): lô, báo cáo sản xuất (SL đạt / lỗi), phiếu nhập,
    /// cộng tồn kho SL đạt theo giá vốn đang có của thành phẩm (không tính lại giá vốn) và cộng luỹ kế SL thực tế của lệnh / dòng.
    /// Không đổi trạng thái lệnh và không mở transaction — handler gọi tự quyết định.
    /// </summary>
    public static async Task<TrxFinishedGoodsReceipt> ReceiveAsync(
        IStockFlowDbContext context, ITransactionCodeGenerator codeGenerator, IInventoryLedger ledger,
        ReceiveInput input, int userId, DateTime now, CancellationToken ct)
    {
        var order = input.Order;
        var item = input.Item;
        var product = input.Product;
        var lotNumber = input.LotNumber.Trim();

        // Lô thành phẩm: dùng lại lô cùng số của sản phẩm nếu đã có
        var lot = await context.MstInventoryLots.FirstOrDefaultAsync(l => l.ProductId == product.ProductId && l.LotNumber == lotNumber, ct)
                  ?? context.MstInventoryLots.Local.FirstOrDefault(l => l.ProductId == product.ProductId && l.LotNumber == lotNumber);
        if (lot == null)
        {
            lot = new MstInventoryLot
            {
                ProductId = product.ProductId,
                LotNumber = lotNumber,
                MfgDate = input.ProductionDate ?? DateOnly.FromDateTime(now),
            };
            context.MstInventoryLots.Add(lot);
        }

        var report = new TrxProductionReport
        {
            ProductionOrderId = order.ProductionOrderId,
            ReportedBy = userId,
            BatchNo = lotNumber,
            ProducedQty = input.AcceptedQuantity,
            DefectQty = input.DefectQuantity,
            WastageQty = 0,
            ReportDate = now,
            Notes = input.DefectQuantity > 0 && !string.IsNullOrWhiteSpace(input.DefectReason) ? input.DefectReason.Trim() : null,
        };
        context.TrxProductionReports.Add(report);

        var code = await ProductionHelper.NextCodeAsync(context, codeGenerator, "FINISHED_GOODS_RECEIPT",
            (c, token) => context.TrxFinishedGoodsReceipts.AnyAsync(f => f.FgrCode == c, token), ct);

        var receipt = new TrxFinishedGoodsReceipt
        {
            FgrCode = code,
            ProductionOrderId = order.ProductionOrderId,
            ProductionOrderItemId = item?.ProductionOrderItemId,
            Report = report,
            WarehouseId = input.WarehouseId,
            LocationId = input.LocationId,
            ProductId = product.ProductId,
            Lot = lot,
            Quantity = input.AcceptedQuantity,
            ReceivedBy = userId,
            ReceivedDate = now,
            Status = "COMPLETED",
            Notes = string.IsNullOrWhiteSpace(input.Notes) ? null : input.Notes.Trim(),
            NeedsReview = input.NeedsReview,
            ReviewNote = input.NeedsReview ? input.ReviewNote : null,
        };
        context.TrxFinishedGoodsReceipts.Add(receipt);
        await context.SaveChangesAsync(ct);

        // BR-36: chỉ SL đạt vào tồn kho.
        // Giá vốn: nhập thành phẩm KHÔNG tính lại giá vốn (quyết định nhóm 18/11/2026, thay cách tính theo NVL đã xuất
        // ngày 13/11). Nhập theo giá vốn đang có: giá vốn tại vị trí/lô này nếu còn tồn, nếu không thì giá vốn của hàng
        // hóa (đặt trong danh mục hoặc từ lần nhập mua gần nhất). Giá vốn chỉ đổi khi nhập hàng mua từ nhà cung cấp.
        var (balanceQty, balanceCost) = await ledger.GetBalanceAsync(
            new StockKey(input.WarehouseId, product.ProductId, input.LocationId, lot.LotId), ct);
        var unitCost = balanceQty > 0 && balanceCost > 0 ? balanceCost : product.MovingAverageCost ?? 0;
        await ProductionStockOps.ReceiveAsync(ledger, input.WarehouseId, input.LocationId, lot.LotId, product,
            input.AcceptedQuantity, unitCost,
            new StockRef(ProductionStockOps.ReceiptTransactionType, ProductionStockOps.ReceiptReferenceType, receipt.FgrId, userId),
            now, ct);

        // Luỹ kế SL thực tế của dòng / lệnh
        if (item != null)
        {
            item.ActualQuantity += input.AcceptedQuantity;
            order.ActualQuantity = order.DtlProductionOrderItems.Sum(i => i.ActualQuantity);
        }
        else
        {
            order.ActualQuantity = (order.ActualQuantity ?? 0) + input.AcceptedQuantity;
        }

        return receipt;
    }
}
