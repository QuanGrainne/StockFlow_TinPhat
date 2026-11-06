using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseOrders.DTOs;
using StockFlow.Application.Features.PurchaseOrders.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PurchaseOrders.Commands;

public record CreatePurchaseOrderCommand(CreatePurchaseOrderRequest Request) : IRequest<Result<int>>;
public record UpdatePurchaseOrderCommand(int PoId, UpdatePurchaseOrderRequest Request) : IRequest<Result<int>>;
public record CancelPurchaseOrderCommand(int PoId) : IRequest<Result<bool>>;
/// <summary>Kết thúc phiếu đang nhập một phần: không nhập thêm phần còn thiếu.</summary>
public record FinishPurchaseOrderCommand(int PoId) : IRequest<Result<bool>>;

public record UpdatePurchaseOrderNotesCommand(int PoId, string? Notes) : IRequest<Result<bool>>;
/// <summary>Gộp các phiếu chưa nhập hàng, cùng NCC và cùng kho thành 1 phiếu mới; trả về PoId phiếu mới.</summary>
public record MergePurchaseOrdersCommand(List<int> PoIds) : IRequest<Result<int>>;

public class PurchaseOrderCommandHandler :
    IRequestHandler<CreatePurchaseOrderCommand, Result<int>>,
    IRequestHandler<UpdatePurchaseOrderCommand, Result<int>>,
    IRequestHandler<CancelPurchaseOrderCommand, Result<bool>>,
    IRequestHandler<FinishPurchaseOrderCommand, Result<bool>>,
    IRequestHandler<UpdatePurchaseOrderNotesCommand, Result<bool>>,
    IRequestHandler<MergePurchaseOrdersCommand, Result<int>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public PurchaseOrderCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    private static string NormalizeStatus(string? status) =>
        string.Equals(status?.Trim(), PurchaseOrderHelper.Ordered, StringComparison.OrdinalIgnoreCase)
            ? PurchaseOrderHelper.Ordered
            : PurchaseOrderHelper.Draft;

    private async Task<string?> ValidateReferencesAsync(int partnerId, List<PurchaseOrderItemRequest> items, CancellationToken ct)
    {
        var partner = await _context.MstBusinessPartners.AsNoTracking()
            .FirstOrDefaultAsync(p => p.PartnerId == partnerId, ct);
        if (partner == null || partner.PartnerType == null ||
            !(partner.PartnerType.Equals("SUPPLIER", StringComparison.OrdinalIgnoreCase) ||
              partner.PartnerType.Equals("BOTH", StringComparison.OrdinalIgnoreCase)))
            return "Không tìm thấy nhà cung cấp.";

        var productIds = items.Select(i => i.ProductId).Distinct().ToList();
        var found = await _context.MstProducts.CountAsync(p => productIds.Contains(p.ProductId), ct);
        return found == productIds.Count ? null : "Một số hàng hóa trong phiếu không tồn tại trong danh mục.";
    }

    public async Task<Result<int>> Handle(CreatePurchaseOrderCommand command, CancellationToken ct)
    {
        var req = command.Request;
        if (!_currentUser.UserId.HasValue) return Result.Failure<int>("Không xác định được người dùng đăng nhập.");

        var itemError = PurchaseOrderHelper.ValidateItems(req.Items);
        if (itemError != null) return Result.Failure<int>(itemError);

        int warehouseId;
        if (req.WarehouseId is > 0)
        {
            warehouseId = req.WarehouseId.Value;
        }
        else
        {
            var authorized = await _currentUser.GetAuthorizedWarehouseIdsAsync(ct);
            if (authorized.Count == 0) return Result.Failure<int>("Bạn chưa được phân quyền kho nào.");
            warehouseId = authorized[0];
        }
        if (!await _currentUser.HasWarehouseAccessAsync(warehouseId, ct))
            return Result.Failure<int>("Bạn không có quyền đặt hàng cho kho này.");
        if (!await _context.MstWarehouses.AnyAsync(w => w.WarehouseId == warehouseId, ct))
            return Result.Failure<int>($"Không tìm thấy kho hàng ID #{warehouseId}.");

        var refError = await ValidateReferencesAsync(req.PartnerId, req.Items, ct);
        if (refError != null) return Result.Failure<int>(refError);

        string code;
        if (string.IsNullOrWhiteSpace(req.PoCode))
        {
            code = await PurchaseOrderHelper.NextCodeAsync(_context, ct);
        }
        else
        {
            code = req.PoCode.Trim().ToUpperInvariant();
            if (await _context.TrxPurchaseOrders.AnyAsync(p => p.PoCode == code, ct))
                return Result.Failure<int>($"Mã phiếu đặt hàng nhập '{code}' đã tồn tại.");
        }

        var (discount, total) = PurchaseOrderHelper.ComputeTotal(req.Items, req.DiscountAmount);
        var po = new TrxPurchaseOrder
        {
            PoCode = code,
            PartnerId = req.PartnerId,
            WarehouseId = warehouseId,
            Status = NormalizeStatus(req.Status),
            OrderDate = VietnamTime.From(req.OrderDate),
            DiscountAmount = discount,
            TotalAmount = total,
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            CreatedBy = _currentUser.UserId.Value,
        };
        PurchaseOrderHelper.ReplaceItems(_context, po, req.Items);
        _context.TrxPurchaseOrders.Add(po);
        await _context.SaveChangesAsync(ct);
        return Result.Success(po.PoId);
    }

    private async Task<(TrxPurchaseOrder? Po, string? Error)> LoadAsync(int poId, CancellationToken ct)
    {
        var po = await _context.TrxPurchaseOrders
            .Include(p => p.DtlPurchaseOrderItems)
            .FirstOrDefaultAsync(p => p.PoId == poId, ct);
        if (po == null) return (null, "Không tìm thấy phiếu đặt hàng nhập.");
        if (!await _currentUser.HasWarehouseAccessAsync(po.WarehouseId, ct))
            return (null, "Bạn không có quyền thao tác trên kho của phiếu này.");
        return (po, null);
    }

    private Task<bool> HasActiveReceiptsAsync(int poId, CancellationToken ct) =>
        _context.TrxGoodsReceipts.AnyAsync(r => r.PurchaseOrderId == poId && r.Status != "CANCELLED", ct);

    public async Task<Result<int>> Handle(UpdatePurchaseOrderCommand command, CancellationToken ct)
    {
        var req = command.Request;
        var (po, error) = await LoadAsync(command.PoId, ct);
        if (po == null) return Result.Failure<int>(error!);

        if (po.Status != PurchaseOrderHelper.Draft && po.Status != PurchaseOrderHelper.Ordered)
            return Result.Failure<int>("Chỉ sửa được phiếu tạm hoặc phiếu đã đặt hàng chưa nhập.");
        if (await HasActiveReceiptsAsync(po.PoId, ct))
            return Result.Failure<int>("Phiếu đã có phiếu nhập liên kết, không thể sửa.");

        var itemError = PurchaseOrderHelper.ValidateItems(req.Items);
        if (itemError != null) return Result.Failure<int>(itemError);
        var refError = await ValidateReferencesAsync(req.PartnerId, req.Items, ct);
        if (refError != null) return Result.Failure<int>(refError);

        var (discount, total) = PurchaseOrderHelper.ComputeTotal(req.Items, req.DiscountAmount);
        po.PartnerId = req.PartnerId;
        po.OrderDate = VietnamTime.From(req.OrderDate);
        po.Status = NormalizeStatus(req.Status);
        po.DiscountAmount = discount;
        po.TotalAmount = total;
        po.Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
        po.UpdatedAt = VietnamTime.Now;
        po.UpdatedBy = _currentUser.UserId;
        PurchaseOrderHelper.ReplaceItems(_context, po, req.Items);
        await _context.SaveChangesAsync(ct);
        return Result.Success(po.PoId);
    }

    public async Task<Result<bool>> Handle(CancelPurchaseOrderCommand command, CancellationToken ct)
    {
        var (po, error) = await LoadAsync(command.PoId, ct);
        if (po == null) return Result.Failure<bool>(error!);

        if (po.Status == PurchaseOrderHelper.Cancelled) return Result.Failure<bool>("Phiếu đã hủy trước đó.");
        if (await HasActiveReceiptsAsync(po.PoId, ct))
            return Result.Failure<bool>("Phiếu đã có phiếu nhập liên kết. Hãy hủy các phiếu nhập đó trước.");

        po.Status = PurchaseOrderHelper.Cancelled;
        po.UpdatedAt = VietnamTime.Now;
        po.UpdatedBy = _currentUser.UserId;
        await _context.SaveChangesAsync(ct);
        return Result.Success(true);
    }

    public async Task<Result<bool>> Handle(FinishPurchaseOrderCommand command, CancellationToken ct)
    {
        var (po, error) = await LoadAsync(command.PoId, ct);
        if (po == null) return Result.Failure<bool>(error!);

        if (po.Status != PurchaseOrderHelper.Partial)
            return Result.Failure<bool>("Chỉ kết thúc được phiếu đang nhập một phần.");

        po.Status = PurchaseOrderHelper.Completed;
        po.UpdatedAt = VietnamTime.Now;
        po.UpdatedBy = _currentUser.UserId;
        await _context.SaveChangesAsync(ct);
        return Result.Success(true);
    }

    public async Task<Result<bool>> Handle(UpdatePurchaseOrderNotesCommand command, CancellationToken ct)
    {
        var (po, error) = await LoadAsync(command.PoId, ct);
        if (po == null) return Result.Failure<bool>(error!);
        if (po.Status == PurchaseOrderHelper.Cancelled) return Result.Failure<bool>("Phiếu đã hủy, không thể sửa.");

        po.Notes = string.IsNullOrWhiteSpace(command.Notes) ? null : command.Notes.Trim();
        po.UpdatedAt = VietnamTime.Now;
        po.UpdatedBy = _currentUser.UserId;
        await _context.SaveChangesAsync(ct);
        return Result.Success(true);
    }

    public async Task<Result<int>> Handle(MergePurchaseOrdersCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue) return Result.Failure<int>("Không xác định được người dùng đăng nhập.");

        var ids = (command.PoIds ?? new List<int>()).Distinct().ToList();
        if (ids.Count < 2) return Result.Failure<int>("Cần chọn ít nhất 2 phiếu để gộp.");

        var sources = await _context.TrxPurchaseOrders
            .Include(p => p.DtlPurchaseOrderItems)
            .Where(p => ids.Contains(p.PoId))
            .OrderBy(p => p.PoId)
            .ToListAsync(ct);
        if (sources.Count != ids.Count) return Result.Failure<int>("Không tìm thấy một số phiếu đã chọn.");

        foreach (var po in sources)
        {
            if (!await _currentUser.HasWarehouseAccessAsync(po.WarehouseId, ct))
                return Result.Failure<int>($"Bạn không có quyền thao tác trên kho của phiếu {po.PoCode}.");
            if (po.Status != PurchaseOrderHelper.Draft && po.Status != PurchaseOrderHelper.Ordered)
                return Result.Failure<int>($"Phiếu {po.PoCode} không gộp được: chỉ gộp phiếu tạm hoặc phiếu đã đặt hàng chưa nhập.");
            if (await HasActiveReceiptsAsync(po.PoId, ct))
                return Result.Failure<int>($"Phiếu {po.PoCode} đã có phiếu nhập liên kết, không gộp được.");
        }
        if (sources.Select(p => p.PartnerId).Distinct().Count() > 1)
            return Result.Failure<int>("Chỉ gộp được các phiếu cùng nhà cung cấp.");
        if (sources.Select(p => p.WarehouseId).Distinct().Count() > 1)
            return Result.Failure<int>("Chỉ gộp được các phiếu cùng chi nhánh nhận hàng.");

        // Cộng số lượng theo hàng hóa. Cùng giá giữ nguyên; khác giá thì lấy đơn giá bình quân theo số lượng (sau giảm giá dòng)
        var items = sources.SelectMany(p => p.DtlPurchaseOrderItems)
            .GroupBy(i => i.ProductId)
            .Select(g =>
            {
                var qty = g.Sum(i => i.OrderedQty);
                var first = g.First();
                var samePrice = g.All(i => i.UnitPrice == first.UnitPrice && i.DiscountPercent == first.DiscountPercent);
                return samePrice
                    ? new PurchaseOrderItemRequest(g.Key, qty, first.UnitPrice, first.DiscountPercent)
                    : new PurchaseOrderItemRequest(g.Key, qty,
                        Math.Round(g.Sum(i => i.OrderedQty * i.UnitPrice * (1 - i.DiscountPercent / 100m)) / qty, 4), 0);
            })
            .ToList();

        var (discount, total) = PurchaseOrderHelper.ComputeTotal(items, sources.Sum(p => p.DiscountAmount));
        var userNotes = sources.Select(p => p.Notes).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList();
        var notes = userNotes.Count == 0 ? null : string.Join("; ", userNotes);
        if (notes is { Length: > 500 }) notes = notes[..500];

        var dbContext = _context as DbContext;
        using var transaction = dbContext != null ? await dbContext.Database.BeginTransactionAsync(ct) : null;
        try
        {
            var merged = new TrxPurchaseOrder
            {
                PoCode = await PurchaseOrderHelper.NextCodeAsync(_context, ct),
                PartnerId = sources[0].PartnerId,
                WarehouseId = sources[0].WarehouseId,
                Status = sources.Any(p => p.Status == PurchaseOrderHelper.Ordered) ? PurchaseOrderHelper.Ordered : PurchaseOrderHelper.Draft,
                OrderDate = VietnamTime.Now,
                DiscountAmount = discount,
                TotalAmount = total,
                Notes = notes,
                CreatedBy = _currentUser.UserId.Value,
            };
            PurchaseOrderHelper.ReplaceItems(_context, merged, items);
            _context.TrxPurchaseOrders.Add(merged);
            await _context.SaveChangesAsync(ct);

            foreach (var po in sources)
            {
                po.Status = PurchaseOrderHelper.Cancelled;
                po.MergedIntoPoId = merged.PoId;
                po.UpdatedAt = VietnamTime.Now;
                po.UpdatedBy = _currentUser.UserId;
            }
            await _context.SaveChangesAsync(ct);
            if (transaction != null) await transaction.CommitAsync(ct);
            return Result.Success(merged.PoId);
        }
        catch (Exception ex)
        {
            if (transaction != null) await transaction.RollbackAsync(ct);
            return Result.Failure<int>($"Lỗi khi gộp phiếu: {ex.Message}");
        }
    }
}
