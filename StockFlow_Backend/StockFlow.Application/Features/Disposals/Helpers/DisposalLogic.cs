using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Application.Features.Disposals.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Disposals.Helpers;

/// <summary>
/// Nghiệp vụ xuất hủy hàng hóa (hàng lỗi, hỏng, hết hạn...) — bảng trx_inventory_disposals / dtl_inventory_disposal_items:
/// - Lưu tạm (DRAFT): lưu danh sách hàng + số lượng hủy + lý do, CHƯA trừ tồn kho.
/// - Hoàn thành (COMPLETED): kiểm tra đủ tồn, chặn hàng đang kiểm kho (BR-42), trừ tồn kho qua IInventoryLedger
///   theo giá vốn hiện tại (giá vốn bình quân của hàng còn lại không đổi), ghi thẻ kho loại DISPOSAL theo Ngày xuất hủy.
/// - Hủy (CANCELLED): phiếu tạm chỉ đổi trạng thái; phiếu đã hoàn thành được hoàn lại tồn kho đúng vị trí / lô,
///   theo giá vốn lúc hủy, ghi thẻ kho DISPOSAL_CANCEL.
/// - Giá trị hủy = SL hủy × giá vốn: phiếu đã xuất kho lấy giá vốn trên thẻ kho lúc hủy, phiếu tạm lấy giá vốn hiện tại.
/// </summary>
public static class DisposalLogic
{
    /// <summary>Loại giao dịch & loại tham chiếu ghi trên thẻ kho (trx_inventory_transactions)</summary>
    public const string TransactionType = "DISPOSAL";
    public const string CancelTransactionType = "DISPOSAL_CANCEL";
    public const string ReferenceType = "DISPOSAL";

    public const string CodePrefix = "XH";
    private const string SequenceName = "stockflow.seq_disposal_code";

    public static Task<TrxInventoryDisposal?> LoadAsync(IStockFlowDbContext context, int id, CancellationToken ct) =>
        context.TrxInventoryDisposals
            .Include(d => d.Warehouse)
            .Include(d => d.ProcessedByNavigation)
            .Include(d => d.CreatedByNavigation)
            .Include(d => d.DtlInventoryDisposalItems).ThenInclude(i => i.Product).ThenInclude(p => p.BaseUnit)
            .FirstOrDefaultAsync(d => d.DisposalId == id, ct);

    /// <summary>Mã phiếu: dùng mã người dùng nhập (không trùng) hoặc sinh XH000001 từ sequence (bỏ qua mã đã có).</summary>
    public static async Task<Result<string>> ResolveCodeAsync(
        IStockFlowDbContext context, string? requested, int? excludeId, CancellationToken ct)
    {
        var code = requested?.Trim().ToUpperInvariant();
        // Mã "Copy_XH..." (phiếu sao chép) không phải mã thật → tự sinh mã mới
        if (code != null && code.StartsWith("COPY_", StringComparison.Ordinal)) code = null;
        if (!string.IsNullOrEmpty(code))
        {
            if (code.Length > 30) return Result.Failure<string>("Mã phiếu xuất hủy tối đa 30 ký tự.");
            var exists = await context.TrxInventoryDisposals.AnyAsync(
                d => d.DisposalCode == code && (!excludeId.HasValue || d.DisposalId != excludeId.Value), ct);
            return exists
                ? Result.Failure<string>($"Mã phiếu xuất hủy '{code}' đã tồn tại.")
                : Result.Success(code);
        }

        for (var attempt = 0; attempt < 10000; attempt++)
        {
            var seq = await context.GetNextSequenceValueAsync(SequenceName, ct);
            var next = $"{CodePrefix}{seq:D6}";
            if (!await context.TrxInventoryDisposals.AnyAsync(d => d.DisposalCode == next, ct))
                return Result.Success(next);
        }
        return Result.Failure<string>("Không sinh được mã phiếu xuất hủy mới.");
    }

    /// <summary>Ngày xuất hủy: để trống = bây giờ; không được ở tương lai (cho lệch 1 phút do đồng hồ máy khách).</summary>
    public static Result<DateTime> ResolveDate(DateTime? requested)
    {
        var now = VietnamTime.Now;
        if (!requested.HasValue) return Result.Success(now);
        var date = VietnamTime.From(requested);
        return date > now.AddMinutes(1)
            ? Result.Failure<DateTime>("Ngày xuất hủy không được ở tương lai.")
            : Result.Success(date);
    }

    /// <summary>Người xuất hủy phải là tài khoản đang hoạt động và có quyền trên kho của phiếu.</summary>
    public static async Task<string?> ValidateProcessedByAsync(
        IStockFlowDbContext context, int userId, int warehouseId, CancellationToken ct)
    {
        var ok = await context.SecUsers.AsNoTracking().AnyAsync(u => u.UserId == userId && u.IsActive != false
            && u.JncUserWarehouseAccesses.Any(a => a.WarehouseId == warehouseId), ct);
        return ok ? null : "Người xuất hủy không hợp lệ hoặc không có quyền trên kho của phiếu.";
    }

    /// <summary>Nhân viên chọn được làm Người xuất hủy: đang hoạt động, được phân quyền kho của phiếu.</summary>
    public static Task<List<DisposalStaffOptionDto>> StaffOptionsAsync(IStockFlowDbContext context, int warehouseId, CancellationToken ct) =>
        context.SecUsers.AsNoTracking()
            .Where(u => u.IsActive != false && u.JncUserWarehouseAccesses.Any(a => a.WarehouseId == warehouseId))
            .OrderBy(u => u.FullName ?? u.Username)
            .Select(u => new DisposalStaffOptionDto(u.UserId, u.FullName ?? u.Username ?? $"NV{u.UserId}"))
            .ToListAsync(ct);

    /// <summary>Ghi lại danh sách hàng hủy của phiếu (gộp các dòng trùng hàng, cộng dồn số lượng).</summary>
    public static async Task<Result<bool>> ReplaceItemsAsync(
        IStockFlowDbContext context, TrxInventoryDisposal disposal, IEnumerable<DisposalItemRequest> requested, CancellationToken ct)
    {
        var lines = requested
            .Where(i => i.ProductId > 0)
            .GroupBy(i => i.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                Quantity = g.Sum(x => x.Quantity),
                Reason = g.Select(x => x.Reason?.Trim()).LastOrDefault(r => !string.IsNullOrEmpty(r)),
            })
            .ToList();
        if (lines.Count == 0)
            return Result.Failure<bool>("Vui lòng thêm ít nhất 1 hàng hóa cần xuất hủy.");
        if (lines.Any(l => l.Quantity <= 0))
            return Result.Failure<bool>("Số lượng hủy phải lớn hơn 0.");

        var ids = lines.Select(l => l.ProductId).ToList();
        var found = await context.MstProducts.AsNoTracking()
            .Where(p => ids.Contains(p.ProductId))
            .Select(p => p.ProductId)
            .ToListAsync(ct);
        var missing = ids.Except(found).ToList();
        if (missing.Count > 0)
            return Result.Failure<bool>($"Không tìm thấy hàng hóa #{string.Join(", #", missing)}.");

        context.DtlInventoryDisposalItems.RemoveRange(disposal.DtlInventoryDisposalItems);
        disposal.DtlInventoryDisposalItems.Clear();
        foreach (var line in lines)
        {
            disposal.DtlInventoryDisposalItems.Add(new DtlInventoryDisposalItem
            {
                ProductId = line.ProductId,
                Quantity = line.Quantity,
                Reason = line.Reason,
            });
        }
        return Result.Success(true);
    }

    /// <summary>
    /// Hoàn thành phiếu: kiểm tra BR-42 (hàng đang kiểm kho) và đủ tồn, rồi trừ tồn kho + ghi thẻ kho theo Ngày xuất hủy.
    /// Trả về lỗi (chưa đổi dữ liệu kho) nếu không hợp lệ.
    /// </summary>
    public static async Task<Result<bool>> CompleteAsync(
        IStockFlowDbContext context, IInventoryLedger ledger, TrxInventoryDisposal disposal, int userId, CancellationToken ct)
    {
        var lines = disposal.DtlInventoryDisposalItems.ToList();
        var productIds = lines.Select(l => l.ProductId).Distinct().ToList();

        // BR-42: không xuất hủy hàng đang nằm trong phiếu kiểm kho chưa kết thúc của kho này
        var stocktakeError = await StocktakeGuard.CheckAsync(context, disposal.WarehouseId, productIds, ct);
        if (stocktakeError != null) return Result.Failure<bool>(stocktakeError);

        var products = await context.MstProducts.Where(p => productIds.Contains(p.ProductId))
            .ToDictionaryAsync(p => p.ProductId, ct);

        // Không hủy vượt tồn hiện có (hàng không có thật thì không hủy được)
        var available = await ProductionStockOps.AvailableAsync(context, disposal.WarehouseId, productIds, ct);
        foreach (var line in lines)
        {
            var qty = line.Quantity ?? 0;
            var stock = available.GetValueOrDefault(line.ProductId);
            if (qty > stock)
            {
                var p = products[line.ProductId];
                return Result.Failure<bool>(
                    $"Hàng {p.ProductCode} - {p.ProductName} chỉ còn {stock:N0} trong kho, không thể hủy {qty:N0}.");
            }
        }

        var date = disposal.DisposalDate ?? VietnamTime.Now;
        var reference = new StockRef(TransactionType, ReferenceType, disposal.DisposalId, userId);
        foreach (var line in lines)
        {
            // Trừ lần lượt các dòng tồn (vị trí / lô) theo giá vốn của dòng → giá vốn bình quân hàng còn lại giữ nguyên
            await ProductionStockOps.IssueAsync(
                context, ledger, disposal.WarehouseId, products[line.ProductId], line.Quantity ?? 0, reference, date, ct);
        }

        disposal.DisposalDate = date;
        disposal.MarkCompleted();
        return Result.Success(true);
    }

    /// <summary>
    /// Hủy phiếu: phiếu đã hoàn thành → hoàn lại tồn kho theo từng dòng thẻ kho DISPOSAL (đúng vị trí / lô, giá vốn lúc hủy).
    /// </summary>
    public static async Task<Result<bool>> CancelAsync(
        IStockFlowDbContext context, IInventoryLedger ledger, TrxInventoryDisposal disposal, int userId, CancellationToken ct)
    {
        if (disposal.IsCompleted())
        {
            var issued = await context.TrxInventoryTransactions.AsNoTracking()
                .Where(t => t.ReferenceType == ReferenceType && t.ReferenceId == disposal.DisposalId
                            && t.TransactionType == TransactionType)
                .ToListAsync(ct);
            var productIds = issued.Select(t => t.ProductId).Distinct().ToList();

            // BR-42: hoàn lại tồn cũng là một biến động kho → chặn khi hàng đang kiểm kho
            var stocktakeError = await StocktakeGuard.CheckAsync(context, disposal.WarehouseId, productIds, ct);
            if (stocktakeError != null) return Result.Failure<bool>(stocktakeError);

            var products = await context.MstProducts.Where(p => productIds.Contains(p.ProductId))
                .ToDictionaryAsync(p => p.ProductId, ct);
            var reference = new StockRef(CancelTransactionType, ReferenceType, disposal.DisposalId, userId);
            var now = VietnamTime.Now;
            foreach (var t in issued)
            {
                var qty = -(t.Quantity ?? 0);
                if (qty <= 0) continue;
                await ledger.InboundAsync(
                    new StockKey(t.WarehouseId, t.ProductId, t.LocationId, t.LotId),
                    qty, t.UnitCost ?? 0, products, reference, ct, transactionDate: now);
            }
        }

        disposal.MarkCancelled();
        return Result.Success(true);
    }

    /// <summary>
    /// Đơn giá vốn của từng dòng hủy, khóa (DisposalId, ProductId).
    /// Phiếu đã xuất kho (kể cả đã hủy sau đó): bình quân theo các dòng thẻ kho DISPOSAL của phiếu;
    /// phiếu chưa xuất kho: giá vốn hiện tại của kho.
    /// </summary>
    public static async Task<Dictionary<(int DisposalId, int ProductId), decimal>> UnitCostsAsync(
        IStockFlowDbContext context, IReadOnlyCollection<TrxInventoryDisposal> disposals, CancellationToken ct)
    {
        var result = new Dictionary<(int, int), decimal>();
        if (disposals.Count == 0) return result;

        var ids = disposals.Select(d => d.DisposalId).ToList();
        var issued = await context.TrxInventoryTransactions.AsNoTracking()
            .Where(t => t.ReferenceType == ReferenceType && t.TransactionType == TransactionType
                        && t.ReferenceId.HasValue && ids.Contains(t.ReferenceId.Value))
            .Select(t => new { DisposalId = t.ReferenceId!.Value, t.ProductId, Qty = -(t.Quantity ?? 0), Cost = t.UnitCost ?? 0 })
            .ToListAsync(ct);
        foreach (var g in issued.GroupBy(x => (x.DisposalId, x.ProductId)))
        {
            var qty = g.Sum(x => x.Qty);
            result[g.Key] = qty > 0 ? CostingPolicy.RoundCost(g.Sum(x => x.Qty * x.Cost) / qty) : 0;
        }

        // Dòng chưa có trên thẻ kho (phiếu tạm / phiếu tạm đã hủy) → giá vốn hiện tại của kho
        var pending = disposals
            .SelectMany(d => d.DtlInventoryDisposalItems.Select(i => (d.DisposalId, d.WarehouseId, i.ProductId)))
            .Where(x => !result.ContainsKey((x.DisposalId, x.ProductId)))
            .ToList();
        if (pending.Count == 0) return result;

        var warehouseIds = pending.Select(x => x.WarehouseId).Distinct().ToList();
        var productIds = pending.Select(x => x.ProductId).Distinct().ToList();
        var balances = await context.TrxInventoryBalances.AsNoTracking()
            .Where(b => warehouseIds.Contains(b.WarehouseId) && productIds.Contains(b.ProductId) && (b.Quantity ?? 0) > 0)
            .Select(b => new { b.WarehouseId, b.ProductId, Qty = b.Quantity ?? 0, Cost = b.UnitCost ?? 0 })
            .ToListAsync(ct);
        var costByStock = balances
            .GroupBy(b => (b.WarehouseId, b.ProductId))
            .ToDictionary(g => g.Key, g => CostingPolicy.RoundCost(g.Sum(x => x.Qty * x.Cost) / g.Sum(x => x.Qty)));
        var fallback = await context.MstProducts.AsNoTracking()
            .Where(p => productIds.Contains(p.ProductId))
            .ToDictionaryAsync(p => p.ProductId, p => p.MovingAverageCost ?? 0, ct);

        foreach (var (disposalId, warehouseId, productId) in pending)
        {
            result[(disposalId, productId)] = costByStock.TryGetValue((warehouseId, productId), out var c)
                ? c
                : fallback.GetValueOrDefault(productId);
        }
        return result;
    }

    private static string FormatUser(SecUser? u) => u?.FullName ?? u?.Username ?? "";

    private static string FormatUserWithPhone(SecUser? u)
    {
        if (u == null) return "";
        var name = !string.IsNullOrWhiteSpace(u.FullName)
            ? u.FullName.Trim()
            : (!string.IsNullOrWhiteSpace(u.Username) ? u.Username.Trim() : $"NV#{u.UserId}");
        return !string.IsNullOrWhiteSpace(u.Phone)
            ? $"{name} - {u.Phone.Trim()}"
            : name;
    }

    public static DisposalSummaryDto ToSummary(
        TrxInventoryDisposal d, IReadOnlyDictionary<(int DisposalId, int ProductId), decimal> costs)
    {
        var items = d.DtlInventoryDisposalItems;
        var totalValue = items.Sum(i => Math.Round((i.Quantity ?? 0) * costs.GetValueOrDefault((d.DisposalId, i.ProductId)), 0, MidpointRounding.AwayFromZero));
        var creator = d.CreatedByNavigation ?? d.ProcessedByNavigation;
        var createdByName = FormatUserWithPhone(creator);
        if (string.IsNullOrWhiteSpace(createdByName))
        {
            createdByName = d.CreatedBy.HasValue
                ? $"NV#{d.CreatedBy.Value}"
                : (d.ProcessedBy > 0 ? $"NV#{d.ProcessedBy}" : "Quản trị viên Hệ thống");
        }
        var createdByPhone = creator?.Phone;

        var processor = d.ProcessedByNavigation;
        var processedByName = FormatUser(processor);
        if (string.IsNullOrWhiteSpace(processedByName))
            processedByName = d.ProcessedBy > 0 ? $"NV#{d.ProcessedBy}" : "";
        var processedByPhone = processor?.Phone;

        return new DisposalSummaryDto(
            DisposalId: d.DisposalId,
            DisposalCode: d.DisposalCode ?? $"{CodePrefix}{d.DisposalId:D6}",
            WarehouseId: d.WarehouseId,
            WarehouseName: d.Warehouse?.WarehouseName ?? $"Kho #{d.WarehouseId}",
            DisposalDate: d.DisposalDate,
            Status: d.Status ?? DisposalStatus.Draft,
            Reason: d.Reason,
            CreatedBy: d.CreatedBy ?? d.ProcessedBy,
            CreatedByName: createdByName,
            ProcessedBy: d.ProcessedBy,
            ProcessedByName: processedByName,
            ItemCount: items.Count,
            TotalQuantity: items.Sum(i => i.Quantity ?? 0),
            TotalValue: totalValue,
            CreatedByPhone: createdByPhone,
            ProcessedByPhone: processedByPhone);
    }

    public static async Task<DisposalDetailDto> ToDetailAsync(IStockFlowDbContext context, TrxInventoryDisposal d, CancellationToken ct)
    {
        var costs = await UnitCostsAsync(context, new[] { d }, ct);
        var items = d.DtlInventoryDisposalItems
            .OrderBy(i => i.DisposalItemId)
            .Select(i =>
            {
                var qty = i.Quantity ?? 0;
                var cost = costs.GetValueOrDefault((d.DisposalId, i.ProductId));
                return new DisposalItemDto(
                    DisposalItemId: i.DisposalItemId,
                    ProductId: i.ProductId,
                    ProductCode: i.Product?.ProductCode ?? "",
                    ProductName: i.Product?.ProductName ?? "",
                    Unit: i.Product?.BaseUnit?.UnitName ?? "Cái",
                    Quantity: qty,
                    UnitCost: cost,
                    Value: Math.Round(qty * cost, 0, MidpointRounding.AwayFromZero),
                    Reason: i.Reason);
            })
            .ToList();
        return new DisposalDetailDto(ToSummary(d, costs), items);
    }
}
