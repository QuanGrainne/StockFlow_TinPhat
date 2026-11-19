using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseReturns.DTOs;
using StockFlow.Application.Features.PurchaseReturns.Helpers;
using StockFlow.Application.Features.Purchases.Helpers;

namespace StockFlow.Application.Features.PurchaseReturns.Queries;

/// <summary>
/// Danh sách phiếu trả hàng nhập. Statuses: danh sách trạng thái (DRAFT,COMPLETED,CANCELLED), rỗng = tất cả.
/// ReturnType: STOCK | DEFECT, rỗng = tất cả.
/// </summary>
public record GetPurchaseReturnsQuery(
    List<int>? WarehouseIds,
    List<string>? Statuses,
    DateTime? FromDate,
    DateTime? ToDate,
    string? Search,
    int? GrId = null,
    string? ReturnType = null) : IRequest<Result<List<PurchaseReturnListDto>>>;

public record GetPurchaseReturnByIdQuery(int Id) : IRequest<Result<PurchaseReturnDetailDto>>;

/// <summary>
/// Dữ liệu phiếu nhập để lập phiếu trả hàng nhập (kèm SL còn được trả).
/// ReturnType = DEFECT: SL theo SL lỗi của phiếu nhập (lập phiếu trả hàng lỗi).
/// </summary>
public record GetPurchaseReturnSourceQuery(int GrId, int? ExcludeReturnId = null, string? ReturnType = null)
    : IRequest<Result<ReturnSourceDto>>;

public class PurchaseReturnQueryHandler :
    IRequestHandler<GetPurchaseReturnsQuery, Result<List<PurchaseReturnListDto>>>,
    IRequestHandler<GetPurchaseReturnByIdQuery, Result<PurchaseReturnDetailDto>>,
    IRequestHandler<GetPurchaseReturnSourceQuery, Result<ReturnSourceDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public PurchaseReturnQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<PurchaseReturnListDto>>> Handle(GetPurchaseReturnsQuery request, CancellationToken ct)
    {
        // Cô lập dữ liệu kho: chỉ thấy phiếu của kho được phân quyền (Admin thấy tất cả kho đang hoạt động)
        var authorized = await _currentUser.GetAuthorizedWarehouseIdsAsync(ct);
        var query = _context.TrxPurchaseReturns
            .AsNoTracking()
            .Include(r => r.Warehouse)
            .Include(r => r.Partner)
            .Include(r => r.Gr)
            .Include(r => r.CreatedByNavigation)
            .Include(r => r.DtlPurchaseReturnItems).ThenInclude(i => i.Product)
            .Where(r => authorized.Contains(r.WarehouseId));

        if (request.WarehouseIds is { Count: > 0 })
            query = query.Where(r => request.WarehouseIds.Contains(r.WarehouseId));

        if (request.Statuses is { Count: > 0 })
        {
            var statuses = request.Statuses.Select(s => s.Trim().ToUpperInvariant()).ToList();
            query = query.Where(r => r.Status != null && statuses.Contains(r.Status));
        }

        if (request.GrId.HasValue)
            query = query.Where(r => r.GrId == request.GrId.Value);

        if (!string.IsNullOrWhiteSpace(request.ReturnType))
        {
            var type = PurchaseReturnLogic.NormalizeType(request.ReturnType);
            query = query.Where(r => r.ReturnType == type);
        }

        if (request.FromDate.HasValue)
            query = query.Where(r => r.ReturnDate >= request.FromDate.Value);
        if (request.ToDate.HasValue)
        {
            var to = request.ToDate.Value.TimeOfDay == TimeSpan.Zero
                ? request.ToDate.Value.Date.AddDays(1).AddTicks(-1)
                : request.ToDate.Value;
            query = query.Where(r => r.ReturnDate <= to);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(r =>
                (r.ReturnCode != null && r.ReturnCode.ToLower().Contains(term)) ||
                (r.Gr != null && r.Gr.GrCode != null && r.Gr.GrCode.ToLower().Contains(term)) ||
                (r.Partner.PartnerName != null && r.Partner.PartnerName.ToLower().Contains(term)) ||
                (r.Partner.PartnerCode != null && r.Partner.PartnerCode.ToLower().Contains(term)) ||
                r.DtlPurchaseReturnItems.Any(i =>
                    (i.Product.ProductName != null && i.Product.ProductName.ToLower().Contains(term)) ||
                    (i.Product.ProductCode != null && i.Product.ProductCode.ToLower().Contains(term))));
        }

        var rows = await query
            .OrderByDescending(r => r.ReturnDate)
            .ThenByDescending(r => r.PurchaseReturnId)
            .ToListAsync(ct);

        // Phần tính vào công nợ đã trừ vào phiếu nhập gốc (để tính NCC còn cần trả của từng phiếu trả)
        var offsets = await ReturnOffsetCalculator.ComputeForReceiptsAsync(
            _context, rows.Where(r => r.GrId.HasValue).Select(r => r.GrId!.Value), ct);

        return Result.Success(rows.Select(r => new PurchaseReturnListDto(
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
            PurchaseReturnLogic.GoodsTotal(r.DtlPurchaseReturnItems),
            r.DiscountAmount ?? 0,
            r.TotalAmount ?? 0,
            r.RefundAmount ?? 0,
            r.Status ?? PurchaseReturnLogic.Draft,
            r.CreatedByNavigation?.FullName ?? r.CreatedByNavigation?.Username ?? $"NV #{r.CreatedBy}",
            r.Notes,
            offsets.OffsetByReturn.GetValueOrDefault(r.PurchaseReturnId),
            PurchaseReturnLogic.NormalizeType(r.ReturnType))).ToList());
    }

    public async Task<Result<PurchaseReturnDetailDto>> Handle(GetPurchaseReturnByIdQuery request, CancellationToken ct)
    {
        var ret = await PurchaseReturnLogic.LoadAsync(_context, request.Id, ct);
        if (ret == null)
            return Result.Failure<PurchaseReturnDetailDto>($"Không tìm thấy phiếu trả hàng nhập #{request.Id}.");
        if (!await _currentUser.HasWarehouseAccessAsync(ret.WarehouseId, ct))
            return Result.Failure<PurchaseReturnDetailDto>("Bạn không có quyền truy cập phiếu trả hàng của kho này.");
        var payments = await PurchaseReturnLogic.LoadPaymentsAsync(_context, ret, ct);
        return Result.Success(await PurchaseReturnLogic.WithOffsetAsync(_context, PurchaseReturnLogic.ToDetail(ret, payments), ct));
    }

    public async Task<Result<ReturnSourceDto>> Handle(GetPurchaseReturnSourceQuery request, CancellationToken ct)
    {
        var receipt = await _context.TrxGoodsReceipts
            .AsNoTracking()
            .Include(r => r.Warehouse)
            .Include(r => r.Partner)
            .Include(r => r.DtlGoodsReceiptItems).ThenInclude(i => i.Product).ThenInclude(p => p.BaseUnit)
            .FirstOrDefaultAsync(r => r.GrId == request.GrId, ct);
        if (receipt == null)
            return Result.Failure<ReturnSourceDto>($"Không tìm thấy phiếu nhập #{request.GrId}.");
        if (!await _currentUser.HasWarehouseAccessAsync(receipt.WarehouseId, ct))
            return Result.Failure<ReturnSourceDto>("Bạn không có quyền truy cập phiếu nhập của kho này.");
        if (!PurchaseReturnLogic.Is(receipt.Status, PurchaseReturnLogic.Completed))
            return Result.Failure<ReturnSourceDto>("Chỉ trả hàng được cho phiếu nhập đã nhập hàng.");

        var returnType = PurchaseReturnLogic.NormalizeType(request.ReturnType);
        var returned = await PurchaseReturnLogic.ReturnedQtyByGrItemAsync(
            _context, receipt.GrId, request.ExcludeReturnId, ct, returnType);

        var productIds = receipt.DtlGoodsReceiptItems.Select(i => i.ProductId).Distinct().ToList();
        var stocks = await _context.TrxInventoryBalances
            .AsNoTracking()
            .Where(b => b.WarehouseId == receipt.WarehouseId && productIds.Contains(b.ProductId))
            .GroupBy(b => b.ProductId)
            .Select(g => new { g.Key, Qty = g.Sum(b => b.Quantity ?? 0) })
            .ToDictionaryAsync(x => x.Key, x => x.Qty, ct);

        var items = receipt.DtlGoodsReceiptItems
            .OrderBy(i => i.GrItemId)
            .Select(i =>
            {
                // Trả hàng lỗi: "đã nhập" = SL lỗi; trả hàng thường: SL đạt
                var received = PurchaseReturnLogic.ReturnableQty(i, returnType);
                var done = returned.GetValueOrDefault(i.GrItemId);
                return new ReturnSourceItemDto(
                    i.GrItemId,
                    i.ProductId,
                    i.Product?.ProductCode ?? $"SP{i.ProductId}",
                    i.Product?.ProductName ?? "Sản phẩm",
                    i.Product?.BaseUnit?.UnitName ?? "Cái",
                    i.Product?.ImageUrl,
                    received,
                    done,
                    Math.Max(0, received - done),
                    PurchaseReturnLogic.GrImportPrice(i),
                    stocks.GetValueOrDefault(i.ProductId),
                    i.UnitLandedCost ?? PurchaseReturnLogic.GrImportPrice(i));
            })
            .ToList();

        return Result.Success(new ReturnSourceDto(
            receipt.GrId,
            receipt.GrCode ?? $"PN{receipt.GrId:D6}",
            receipt.WarehouseId,
            receipt.Warehouse?.WarehouseName ?? $"Kho #{receipt.WarehouseId}",
            receipt.PartnerId,
            receipt.Partner?.PartnerCode ?? $"NCC{receipt.PartnerId}",
            receipt.Partner?.PartnerName ?? "Nhà cung cấp",
            receipt.Partner?.CurrentPayable ?? 0,
            // Trả hàng lỗi chỉ lấy dòng có hàng lỗi
            returnType == PurchaseReturnLogic.TypeDefect ? items.Where(i => i.ReceivedQty > 0).ToList() : items,
            returnType));
    }
}
