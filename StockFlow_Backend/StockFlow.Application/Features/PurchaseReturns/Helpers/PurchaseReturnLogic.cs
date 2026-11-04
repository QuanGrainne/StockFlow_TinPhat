using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseReturns.DTOs;
using StockFlow.Application.Features.Purchases.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PurchaseReturns.Helpers;

/// <summary>
/// Nghiệp vụ trả hàng nhập (trả hàng cho nhà cung cấp):
/// - Tổng tiền hàng = Σ SL × giá trả lại; NCC cần trả = Tổng tiền hàng − Giảm giá.
/// - Hoàn thành: trừ tồn kho (tính ngược giá vốn BQ theo giá trả lại sau giảm giá),
///   giảm công nợ phải trả NCC = NCC cần trả − tiền NCC đã trả lại, ghi giao dịch SUPPLIER_REFUND nếu NCC trả tiền.
/// - Trả theo phiếu nhập: SL trả mỗi dòng ≤ SL đã nhập − SL đã trả ở các phiếu trả đã hoàn thành khác.
/// </summary>
public static class PurchaseReturnLogic
{
    public const string ReferenceType = "PURCHASE_RETURN";
    public const string RefundTxType = "SUPPLIER_REFUND";
    public const string Draft = "DRAFT";
    public const string Completed = "COMPLETED";
    public const string Cancelled = "CANCELLED";

    /// <summary>
    /// Giá nhập của 1 dòng phiếu nhập = Đơn giá − Giảm giá dòng (giống cột "Giá nhập" trên phiếu nhập).
    /// Dùng làm giá trả mặc định khi trả hàng nhập theo phiếu. Dữ liệu cũ chưa có đơn giá thì lấy giá vốn dòng.
    /// </summary>
    public static decimal GrImportPrice(DtlGoodsReceiptItem item)
    {
        if (!item.UnitPrice.HasValue) return Math.Round(item.UnitLandedCost ?? 0, 0, MidpointRounding.AwayFromZero);
        var pct = Math.Clamp(item.DiscountPercent ?? 0, 0, 100);
        return Math.Round(item.UnitPrice.Value * (1 - pct / 100m), 0, MidpointRounding.AwayFromZero);
    }

    public sealed record Prepared(
        int WarehouseId,
        MstBusinessPartner Partner,
        TrxGoodsReceipt? Receipt,
        List<DtlPurchaseReturnItem> Items,
        Dictionary<int, MstProduct> Products,
        decimal GoodsTotal,
        decimal Discount,
        decimal Total,
        decimal Refund,
        string PaymentMethod,
        string Status);

    public static bool Is(string? status, string expected) =>
        string.Equals(status, expected, StringComparison.OrdinalIgnoreCase);

    public static decimal GoodsTotal(IEnumerable<DtlPurchaseReturnItem> items) =>
        Math.Round(items.Sum(i => i.Quantity * (i.ReturnPrice ?? 0)), 0, MidpointRounding.AwayFromZero);

    /// <summary>SL đã trả theo từng dòng phiếu nhập ở các phiếu trả ĐÃ HOÀN THÀNH (trừ phiếu đang xử lý).</summary>
    public static async Task<Dictionary<int, decimal>> ReturnedQtyByGrItemAsync(
        IStockFlowDbContext context, int grId, int? excludeReturnId, CancellationToken ct)
    {
        return await context.DtlPurchaseReturnItems
            .Where(i => i.GrItemId != null
                        && i.PurchaseReturn.GrId == grId
                        && i.PurchaseReturn.Status == Completed
                        && (excludeReturnId == null || i.PurchaseReturnId != excludeReturnId))
            .GroupBy(i => i.GrItemId!.Value)
            .Select(g => new { g.Key, Qty = g.Sum(i => i.Quantity) })
            .ToDictionaryAsync(x => x.Key, x => x.Qty, ct);
    }

    /// <summary>Mã các phiếu trả hàng nhập chưa hủy của một phiếu nhập (chặn hủy / sửa phiếu nhập gốc).</summary>
    public static async Task<List<string>> ActiveReturnCodesAsync(IStockFlowDbContext context, int grId, CancellationToken ct) =>
        await context.TrxPurchaseReturns
            .Where(r => r.GrId == grId && r.Status != Cancelled)
            .Select(r => r.ReturnCode ?? "THN" + r.PurchaseReturnId)
            .ToListAsync(ct);

    /// <summary>Kiểm tra dữ liệu và dựng các dòng phiếu trả (chưa lưu).</summary>
    public static async Task<Result<Prepared>> PrepareAsync(
        IStockFlowDbContext context,
        ICurrentUserService currentUser,
        SavePurchaseReturnRequest req,
        int? excludeReturnId,
        CancellationToken ct)
    {
        if (req.Items == null || req.Items.Count == 0)
            return Result.Failure<Prepared>("Phiếu trả hàng nhập phải có ít nhất 1 mặt hàng.");
        if (req.Items.Any(i => i.Quantity <= 0))
            return Result.Failure<Prepared>("Số lượng trả của mỗi mặt hàng phải lớn hơn 0.");
        if (req.Items.Any(i => i.ReturnPrice < 0))
            return Result.Failure<Prepared>("Giá trả lại không được âm.");

        // Phiếu nhập gốc (nếu trả theo phiếu nhập)
        TrxGoodsReceipt? receipt = null;
        int warehouseId;
        int partnerId = req.PartnerId;
        if (req.GrId.HasValue)
        {
            receipt = await context.TrxGoodsReceipts
                .Include(r => r.DtlGoodsReceiptItems)
                .FirstOrDefaultAsync(r => r.GrId == req.GrId.Value, ct);
            if (receipt == null)
                return Result.Failure<Prepared>($"Không tìm thấy phiếu nhập #{req.GrId}.");
            if (!Is(receipt.Status, Completed))
                return Result.Failure<Prepared>("Chỉ trả hàng được cho phiếu nhập đã nhập hàng.");
            warehouseId = receipt.WarehouseId;
            partnerId = receipt.PartnerId;
        }
        else if (req.WarehouseId is > 0)
        {
            warehouseId = req.WarehouseId.Value;
        }
        else
        {
            var authorized = await currentUser.GetAuthorizedWarehouseIdsAsync(ct);
            if (authorized.Count == 0)
                return Result.Failure<Prepared>("Bạn chưa được phân quyền kho nào.");
            warehouseId = authorized[0];
        }

        // Cô lập dữ liệu kho: chỉ trả hàng từ kho mình được phân quyền
        if (!await currentUser.HasWarehouseAccessAsync(warehouseId, ct))
            return Result.Failure<Prepared>("Bạn không có quyền trả hàng từ kho này.");

        var partner = await context.MstBusinessPartners.FirstOrDefaultAsync(p => p.PartnerId == partnerId, ct);
        if (partner == null)
            return Result.Failure<Prepared>("Vui lòng chọn nhà cung cấp.");

        var productIds = req.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await context.MstProducts
            .Include(p => p.BaseUnit)
            .Where(p => productIds.Contains(p.ProductId))
            .ToDictionaryAsync(p => p.ProductId, ct);
        if (products.Count != productIds.Count)
            return Result.Failure<Prepared>("Một số mặt hàng không tồn tại trong danh mục.");

        var items = new List<DtlPurchaseReturnItem>();
        if (receipt != null)
        {
            var grItems = receipt.DtlGoodsReceiptItems.ToDictionary(i => i.GrItemId);
            var returned = await ReturnedQtyByGrItemAsync(context, receipt.GrId, excludeReturnId, ct);

            foreach (var group in req.Items.GroupBy(i => i.GrItemId))
            {
                if (group.Key == null || !grItems.TryGetValue(group.Key.Value, out var grItem))
                    return Result.Failure<Prepared>("Mặt hàng trả không thuộc phiếu nhập gốc.");

                var product = products[grItem.ProductId];
                var remaining = PurchaseStockOps.Quantity(grItem) - returned.GetValueOrDefault(grItem.GrItemId);
                var requested = group.Sum(i => i.Quantity);
                if (requested > remaining)
                {
                    return Result.Failure<Prepared>(
                        $"Mặt hàng {product.ProductCode} chỉ còn được trả tối đa {remaining:0.###} (đã nhập {PurchaseStockOps.Quantity(grItem):0.###}).");
                }

                foreach (var line in group)
                {
                    if (line.ProductId != grItem.ProductId)
                        return Result.Failure<Prepared>("Mặt hàng trả không khớp với dòng phiếu nhập gốc.");
                    items.Add(new DtlPurchaseReturnItem
                    {
                        ProductId = grItem.ProductId,
                        GrItemId = grItem.GrItemId,
                        Quantity = line.Quantity,
                        ImportPrice = GrImportPrice(grItem),
                        ReturnPrice = line.ReturnPrice,
                        LotId = grItem.LotId,
                        LocationId = grItem.LocationId,
                    });
                }
            }
        }
        else
        {
            foreach (var line in req.Items)
            {
                // Trả hàng tự do: giá nhập = giá vốn hiện tại tại kho
                var (_, cost) = await PurchaseStockOps.GetBalanceAsync(
                    context, new PurchaseStockOps.StockKey(warehouseId, line.ProductId, null, null), ct);
                var importPrice = cost > 0 ? cost : products[line.ProductId].MovingAverageCost ?? 0;
                items.Add(new DtlPurchaseReturnItem
                {
                    ProductId = line.ProductId,
                    Quantity = line.Quantity,
                    ImportPrice = importPrice,
                    ReturnPrice = line.ReturnPrice,
                });
            }
        }

        var goods = GoodsTotal(items);
        var discount = Math.Clamp(Math.Round(req.DiscountAmount, 0, MidpointRounding.AwayFromZero), 0, goods);
        var total = goods - discount;
        var status = Is(req.Status, Completed) ? Completed : Draft;
        var refund = status == Completed
            ? Math.Clamp(Math.Round(req.RefundAmount, 0, MidpointRounding.AwayFromZero), 0, total)
            : 0;
        var method = string.IsNullOrWhiteSpace(req.PaymentMethod) ? "CASH" : req.PaymentMethod.Trim().ToUpperInvariant();

        return Result.Success(new Prepared(warehouseId, partner, receipt, items, products, goods, discount, total, refund, method, status));
    }

    /// <summary>Sinh mã THN000001... hoặc dùng mã người dùng nhập (kiểm tra trùng).</summary>
    public static async Task<Result<string>> ResolveCodeAsync(
        IStockFlowDbContext context, string? requested, int? excludeReturnId, CancellationToken ct)
    {
        var code = requested?.Trim();
        if (!string.IsNullOrEmpty(code) && !code.StartsWith("Copy_", StringComparison.OrdinalIgnoreCase))
        {
            code = code.ToUpperInvariant();
            var exists = await context.TrxPurchaseReturns
                .AnyAsync(r => r.ReturnCode == code && r.PurchaseReturnId != excludeReturnId, ct);
            return exists
                ? Result.Failure<string>($"Mã phiếu trả hàng nhập '{code}' đã tồn tại.")
                : Result.Success(code);
        }

        // Sequence có thể trùng với mã người dùng tự đặt trước đó → bỏ qua mã đã dùng
        while (true)
        {
            var next = $"THN{await context.GetNextSequenceValueAsync("stockflow.seq_purchase_return", ct):D6}";
            if (!await context.TrxPurchaseReturns.AnyAsync(r => r.ReturnCode == next, ct))
                return Result.Success(next);
        }
    }

    private static decimal NetFactor(TrxPurchaseReturn ret, IReadOnlyCollection<DtlPurchaseReturnItem> items)
    {
        var goods = GoodsTotal(items);
        return goods > 0 ? (ret.TotalAmount ?? goods) / goods : 1m;
    }

    /// <summary>Hoàn thành phiếu trả: xuất kho, giảm công nợ NCC, ghi khoản NCC trả lại (phiếu đã có Id).</summary>
    public static async Task ApplyCompletionAsync(
        IStockFlowDbContext context,
        TrxPurchaseReturn ret,
        IReadOnlyCollection<DtlPurchaseReturnItem> items,
        IReadOnlyDictionary<int, MstProduct> products,
        MstBusinessPartner partner,
        int userId,
        CancellationToken ct)
    {
        var factor = NetFactor(ret, items);
        var reference = new PurchaseStockOps.StockRef("OUTBOUND_PURCHASE_RETURN", ReferenceType, ret.PurchaseReturnId, userId);
        foreach (var item in items)
        {
            await PurchaseStockOps.OutboundAsync(
                context,
                new PurchaseStockOps.StockKey(ret.WarehouseId, item.ProductId, item.LocationId, item.LotId),
                item.Quantity,
                (item.ReturnPrice ?? 0) * factor,
                products,
                reference,
                ct,
                item.ReturnPrice ?? 0); // Giá GD = giá trả trên phiếu
        }

        var total = ret.TotalAmount ?? 0;
        var refund = ret.RefundAmount ?? 0;
        partner.CurrentPayable = (partner.CurrentPayable ?? 0) - (total - refund);

        if (refund > 0)
        {
            context.TrxFinancialTransactions.Add(new TrxFinancialTransaction
            {
                PartnerId = partner.PartnerId,
                TxType = RefundTxType,
                Amount = refund,
                PaymentMethod = ret.PaymentMethod ?? "CASH",
                ReferenceType = ReferenceType,
                ReferenceId = ret.PurchaseReturnId,
                TransactionDate = ret.ReturnDate ?? VietnamTime.Now,
                CreatedBy = userId,
                Status = Completed,
                Description = $"Nhà cung cấp trả tiền phiếu trả hàng nhập {ret.ReturnCode}",
            });
        }
    }

    /// <summary>Hủy phiếu trả đã hoàn thành: nhập lại kho, cộng lại công nợ, hủy khoản NCC đã trả lại.</summary>
    public static async Task ReverseCompletionAsync(
        IStockFlowDbContext context,
        TrxPurchaseReturn ret,
        int userId,
        CancellationToken ct)
    {
        var items = ret.DtlPurchaseReturnItems.ToList();
        var productIds = items.Select(i => i.ProductId).Distinct().ToList();
        var products = await context.MstProducts
            .Where(p => productIds.Contains(p.ProductId))
            .ToDictionaryAsync(p => p.ProductId, ct);

        var factor = NetFactor(ret, items);
        var reference = new PurchaseStockOps.StockRef("PURCHASE_RETURN_CANCEL", ReferenceType, ret.PurchaseReturnId, userId);
        foreach (var item in items)
        {
            await PurchaseStockOps.InboundAsync(
                context,
                new PurchaseStockOps.StockKey(ret.WarehouseId, item.ProductId, item.LocationId, item.LotId),
                item.Quantity,
                (item.ReturnPrice ?? 0) * factor,
                products,
                reference,
                ct,
                item.ReturnPrice ?? 0); // Giá GD = giá trả trên phiếu
        }

        var refunds = await context.TrxFinancialTransactions
            .Where(t => t.TxType == RefundTxType && t.ReferenceType == ReferenceType
                        && t.ReferenceId == ret.PurchaseReturnId && t.Status != Cancelled)
            .ToListAsync(ct);
        foreach (var t in refunds) t.Status = Cancelled;

        var partner = await context.MstBusinessPartners.FirstOrDefaultAsync(p => p.PartnerId == ret.PartnerId, ct);
        if (partner != null)
        {
            partner.CurrentPayable = (partner.CurrentPayable ?? 0) + ((ret.TotalAmount ?? 0) - (ret.RefundAmount ?? 0));
        }
    }

    /// <summary>Tải chi tiết phiếu trả hàng nhập (đã kiểm tra quyền kho ở handler).</summary>
    public static async Task<TrxPurchaseReturn?> LoadAsync(IStockFlowDbContext context, int id, CancellationToken ct) =>
        await context.TrxPurchaseReturns
            .AsNoTracking()
            .Include(r => r.Warehouse)
            .Include(r => r.Partner)
            .Include(r => r.Gr)
            .Include(r => r.CreatedByNavigation)
            .Include(r => r.DtlPurchaseReturnItems).ThenInclude(i => i.Product).ThenInclude(p => p.BaseUnit)
            .FirstOrDefaultAsync(r => r.PurchaseReturnId == id, ct);

    /// <summary>Lịch sử tiền NCC trả lại cho phiếu trả (trả ngay lúc trả hàng + các phiếu thu PT...).</summary>
    public static async Task<List<PurchaseReturnPaymentDto>> LoadPaymentsAsync(
        IStockFlowDbContext context, TrxPurchaseReturn ret, CancellationToken ct)
    {
        var txs = await context.TrxFinancialTransactions
            .AsNoTracking()
            .Include(t => t.CreatedByNavigation)
            .Where(t => t.TxType == RefundTxType && t.ReferenceType == ReferenceType && t.ReferenceId == ret.PurchaseReturnId)
            .OrderBy(t => t.TransactionDate)
            .ThenBy(t => t.TxId)
            .ToListAsync(ct);
        var code = ret.ReturnCode ?? $"THN{ret.PurchaseReturnId:D6}";
        return txs.Select(t => new PurchaseReturnPaymentDto(
            string.IsNullOrEmpty(t.TxCode) ? $"TT{code}" : t.TxCode!,
            t.TransactionDate,
            t.CreatedByNavigation?.FullName ?? t.CreatedByNavigation?.Username ?? $"NV #{t.CreatedBy}",
            t.PaymentMethod ?? "CASH",
            t.Status ?? Completed,
            t.Amount ?? 0)).ToList();
    }

    /// <summary>Gắn phần đã bù trừ vào phiếu nhập gốc (OffsetAmount) cho chi tiết phiếu trả.</summary>
    public static async Task<PurchaseReturnDetailDto> WithOffsetAsync(
        IStockFlowDbContext context, PurchaseReturnDetailDto dto, CancellationToken ct)
    {
        if (dto.GrId == null || !Is(dto.Status, Completed)) return dto;
        var alloc = await ReturnOffsetCalculator.ComputeForReceiptsAsync(context, new[] { dto.GrId.Value }, ct);
        return dto with { OffsetAmount = alloc.OffsetByReturn.GetValueOrDefault(dto.PurchaseReturnId) };
    }

    /// <summary>NCC còn phải trả mình cho phiếu trả = Tổng cộng − NCC đã trả − phần đã bù trừ vào phiếu nhập.</summary>
    public static async Task<decimal> RemainingAsync(IStockFlowDbContext context, TrxPurchaseReturn r, CancellationToken ct)
    {
        var offset = 0m;
        if (r.GrId.HasValue && Is(r.Status, Completed))
        {
            var alloc = await ReturnOffsetCalculator.ComputeForReceiptsAsync(context, new[] { r.GrId.Value }, ct);
            offset = alloc.OffsetByReturn.GetValueOrDefault(r.PurchaseReturnId);
        }
        return Math.Max(0, (r.TotalAmount ?? 0) - (r.RefundAmount ?? 0) - offset);
    }

    public static PurchaseReturnDetailDto ToDetail(TrxPurchaseReturn r, List<PurchaseReturnPaymentDto>? payments = null)
    {
        var items = r.DtlPurchaseReturnItems
            .OrderBy(i => i.PrItemId)
            .Select(i => new PurchaseReturnItemDto(
                i.PrItemId,
                i.ProductId,
                i.Product?.ProductCode ?? $"SP{i.ProductId}",
                i.Product?.ProductName ?? "Sản phẩm",
                i.Product?.BaseUnit?.UnitName ?? "Cái",
                i.Quantity,
                i.ImportPrice ?? 0,
                i.ReturnPrice ?? 0,
                Math.Round(i.Quantity * (i.ReturnPrice ?? 0), 0, MidpointRounding.AwayFromZero),
                i.GrItemId))
            .ToList();

        return new PurchaseReturnDetailDto(
            r.PurchaseReturnId,
            r.ReturnCode ?? $"THN{r.PurchaseReturnId:D6}",
            r.ReturnDate,
            r.GrId,
            r.Gr?.GrCode,
            r.WarehouseId,
            r.Warehouse?.WarehouseName ?? $"Kho #{r.WarehouseId}",
            r.PartnerId,
            r.Partner?.PartnerCode ?? $"NCC{r.PartnerId}",
            r.Partner?.PartnerName ?? "Nhà cung cấp",
            r.Partner?.Phone,
            r.Partner?.Address,
            r.Partner?.CurrentPayable ?? 0,
            GoodsTotal(r.DtlPurchaseReturnItems),
            r.DiscountAmount ?? 0,
            r.TotalAmount ?? 0,
            r.RefundAmount ?? 0,
            r.PaymentMethod,
            r.Status ?? Draft,
            r.CreatedBy,
            r.CreatedByNavigation?.FullName ?? r.CreatedByNavigation?.Username ?? $"NV #{r.CreatedBy}",
            r.Notes,
            items,
            payments);
    }
}
