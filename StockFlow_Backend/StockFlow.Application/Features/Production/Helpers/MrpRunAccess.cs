using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Production.Helpers;

/// <summary>
/// Đọc một lần chạy MRP và kiểm quyền kho: người xem phải có quyền với MỌI kho của lần chạy
/// (cô lập dữ liệu theo kho, specs/mrp/review/07_MRP_API_DESIGN.md mục 1).
/// </summary>
public static class MrpRunAccess
{
    public const string NotFound = "Không tìm thấy lần chạy MRP này.";
    public const string NoAccess = "Bạn không có quyền xem lần chạy MRP của kho này.";

    public static List<int> WarehouseIds(TrxMrpRun run) =>
        run.WarehouseIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => int.TryParse(s, out var id) ? id : 0)
            .Where(id => id > 0)
            .Distinct()
            .ToList();

    public static async Task<bool> CanViewAsync(ICurrentUserService currentUser, IEnumerable<int> warehouseIds, CancellationToken ct)
    {
        foreach (var id in warehouseIds)
        {
            if (!await currentUser.HasWarehouseAccessAsync(id, ct)) return false;
        }
        return true;
    }

    public static async Task<(TrxMrpRun? Run, List<int> WarehouseIds, string? Error)> LoadAsync(
        IStockFlowDbContext context, ICurrentUserService currentUser, int mrpRunId, CancellationToken ct)
    {
        var run = await context.TrxMrpRuns.AsNoTracking()
            .Include(r => r.RunByNavigation)
            .FirstOrDefaultAsync(r => r.MrpRunId == mrpRunId, ct);
        if (run == null) return (null, new List<int>(), NotFound);

        var whIds = WarehouseIds(run);
        return await CanViewAsync(currentUser, whIds, ct) ? (run, whIds, null) : (null, whIds, NoAccess);
    }

    /// <summary>Tiền tố ghi chú lần chạy liệt kê thành phẩm thiếu BOM (do RunMrpCommand ghi), dùng để đọc lại đúng danh sách lúc chạy.</summary>
    public const string MissingBomNotePrefix = "Thiếu BOM đang áp dụng, không tính: ";

    public static string? MissingBomNote(IEnumerable<string> productCodes)
    {
        var codes = productCodes.ToList();
        if (codes.Count == 0) return null;
        var note = MissingBomNotePrefix + string.Join(", ", codes);
        return note.Length <= 500 ? note : note[..497] + "...";
    }

    /// <summary>Thành phẩm bị bỏ khỏi phép tính vì thiếu BOM, theo đúng lúc chạy (đọc từ ghi chú lần chạy).</summary>
    public static async Task<List<MrpProductLookupDto>> ProductsWithoutBomAsync(
        IStockFlowDbContext context, TrxMrpRun run, CancellationToken ct)
    {
        if (run.Notes is not { } notes || !notes.StartsWith(MissingBomNotePrefix, StringComparison.Ordinal))
            return new List<MrpProductLookupDto>();
        var codes = notes[MissingBomNotePrefix.Length..].TrimEnd('.')
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
        return await context.MstProducts.AsNoTracking()
            .Where(p => p.ProductCode != null && codes.Contains(p.ProductCode))
            .OrderBy(p => p.ProductCode)
            .Select(p => new MrpProductLookupDto(p.ProductId, p.ProductCode!, p.ProductName ?? ""))
            .ToListAsync(ct);
    }

    /// <summary>Tồn đầu kỳ của NVL = tồn dự phóng + nhu cầu − hàng về của dòng ngày chạy (MrpPolicy luôn có dòng này).</summary>
    public static decimal OpeningBalance(IEnumerable<DtlMrpRunLine> materialLines, DateOnly runDate) =>
        materialLines.FirstOrDefault(l => l.BucketDate == runDate) is { } first
            ? first.ProjectedBalance + first.GrossRequirement - first.ScheduledReceipt
            : 0;
}
