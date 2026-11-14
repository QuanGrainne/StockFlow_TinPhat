using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// BR-51 / BR-52 (nhóm chốt 13/11/2026, chưa có trong Report 3): Manager điều chỉnh định mức ngay trên lệnh
/// (sửa định mức / hao hụt, thêm hoặc bỏ dòng NVL), bắt buộc có lý do. Chỉ áp cho lệnh này, BOM gốc không đổi.
/// - Nhu cầu mới không được thấp hơn số đã xuất; không bỏ được NVL đã xuất.
/// - Mỗi dòng thay đổi lưu người, thời điểm và lý do kèm giá trị trước → sau (chưa có bảng audit trail chung).
/// </summary>
public record AdjustMaterialNormCommand(int ProductionOrderId, AdjustMaterialNormRequest Request)
    : IRequest<Result<ProductionOrderDetailDto>>;

public class AdjustMaterialNormCommandValidator : AbstractValidator<AdjustMaterialNormCommand>
{
    public AdjustMaterialNormCommandValidator()
    {
        RuleFor(x => x.Request.Reason)
            .NotEmpty().WithMessage(ProductionMessages.NormReasonRequired)
            .MaximumLength(300).WithMessage("Lý do tối đa 300 ký tự.");
        RuleFor(x => x.Request.Lines).NotEmpty().WithMessage("Không có thay đổi định mức nào.");
    }
}

public class AdjustMaterialNormCommandHandler : IRequestHandler<AdjustMaterialNormCommand, Result<ProductionOrderDetailDto>>
{
    private const int ReasonMaxLength = 500;

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public AdjustMaterialNormCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<ProductionOrderDetailDto>> Handle(AdjustMaterialNormCommand command, CancellationToken ct)
    {
        var req = command.Request;
        if (_currentUser.UserId is not int userId)
            return Result.Failure<ProductionOrderDetailDto>("Không xác định được người dùng đăng nhập.");

        var order = await _context.TrxProductionOrders
            .Include(o => o.DtlProductionOrderItems)
            .Include(o => o.TrxProductionMaterialRequirements).ThenInclude(r => r.Material)
            .FirstOrDefaultAsync(o => o.ProductionOrderId == command.ProductionOrderId, ct);
        if (order == null) return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.OrderNotFound);
        if (!order.CanAdjustNorm()) return Result.Failure<ProductionOrderDetailDto>(ProductionMessages.StatusNotAllowed);

        var orderItems = order.DtlProductionOrderItems.ToDictionary(i => i.ProductionOrderItemId);
        var defaultOrderItem = order.DtlProductionOrderItems.OrderBy(i => i.ProductionOrderItemId).FirstOrDefault();
        var planned = order.PlannedQuantity ?? 0;
        var reason = req.Reason!.Trim();
        var now = VietnamTime.Now;
        var requirements = order.TrxProductionMaterialRequirements.ToDictionary(r => r.RequirementId);
        var removedIds = new HashSet<int>();
        var addedMaterialKeys = new HashSet<(int? OrderItemId, int MaterialId)>();
        var changed = 0;

        foreach (var line in req.Lines)
        {
            if (!line.Remove)
            {
                if (line.NormPerUnit <= 0 || !ProductionHelper.HasMaxScale(line.NormPerUnit, BomRules.QuantityScale))
                    return Result.Failure<ProductionOrderDetailDto>(
                        $"Định mức phải lớn hơn 0 và có tối đa {BomRules.QuantityScale} chữ số thập phân.");
                if (line.WastageRate < 0 || line.WastageRate > 100 || !ProductionHelper.HasMaxScale(line.WastageRate, BomRules.WastageScale))
                    return Result.Failure<ProductionOrderDetailDto>("Tỷ lệ hao hụt phải từ 0 đến 100%.");
            }

            if (line.RequirementId is int reqId)
            {
                if (!requirements.TryGetValue(reqId, out var r))
                    return Result.Failure<ProductionOrderDetailDto>("Không tìm thấy dòng nguyên vật liệu của lệnh.");
                var issued = r.IssuedQty ?? 0;
                var code = r.Material.ProductCode;

                if (line.Remove)
                {
                    if (issued > 0)
                        return Result.Failure<ProductionOrderDetailDto>($"Không bỏ được {code} vì đã xuất nguyên vật liệu này.");
                    _context.TrxProductionMaterialRequirements.Remove(r);
                    removedIds.Add(reqId);
                    changed++;
                    continue;
                }

                var oldNorm = r.NormPerUnit ?? 0;
                var oldRate = r.WastageRate ?? 0;
                if (oldNorm == line.NormPerUnit && oldRate == line.WastageRate) continue;

                var itemPlanned = r.ProductionOrderItemId.HasValue && orderItems.TryGetValue(r.ProductionOrderItemId.Value, out var oi)
                    ? oi.PlannedQuantity
                    : planned;
                var required = ProductionPolicy.CalculateRequirement(itemPlanned, line.NormPerUnit, line.WastageRate);
                if (required < issued)
                    return Result.Failure<ProductionOrderDetailDto>($"{ProductionMessages.RequirementBelowIssued} ({code})");

                r.NormPerUnit = line.NormPerUnit;
                r.WastageRate = line.WastageRate;
                r.RequiredQty = required;
                r.ShortageQty = ProductionPolicy.CalculateShortage(required, issued);
                MarkAdjusted(r, userId, now, $"{reason} (định mức {oldNorm:0.####} → {line.NormPerUnit:0.####}, hao hụt {oldRate:0.##}% → {line.WastageRate:0.##}%)");
                changed++;
            }
            else if (!line.Remove)
            {
                // Thêm NVL mới vào lệnh (gắn theo dòng thành phẩm đang chọn)
                var targetItem = line.ProductionOrderItemId.HasValue && orderItems.TryGetValue(line.ProductionOrderItemId.Value, out var ti)
                    ? ti
                    : defaultOrderItem;
                var targetItemId = targetItem?.ProductionOrderItemId;
                var targetProductId = targetItem?.ProductId ?? order.ProductId;
                var itemPlanned = targetItem?.PlannedQuantity ?? planned;

                if (line.MaterialId == targetProductId)
                    return Result.Failure<ProductionOrderDetailDto>("Thành phẩm không được là nguyên vật liệu của chính nó.");
                if (addedMaterialKeys.Contains((targetItemId, line.MaterialId))
                    || requirements.Values.Any(r => r.ProductionOrderItemId == targetItemId && r.MaterialId == line.MaterialId && !removedIds.Contains(r.RequirementId)))
                    return Result.Failure<ProductionOrderDetailDto>("Nguyên vật liệu đã có trong định mức của thành phẩm này.");

                var material = await _context.MstProducts.FirstOrDefaultAsync(p => p.ProductId == line.MaterialId, ct);
                if (material == null || material.IsActive == false)
                    return Result.Failure<ProductionOrderDetailDto>("Nguyên vật liệu không tồn tại hoặc đã ngừng kinh doanh.");

                var required = ProductionPolicy.CalculateRequirement(itemPlanned, line.NormPerUnit, line.WastageRate);
                var added = new TrxProductionMaterialRequirement
                {
                    ProductionOrder = order,
                    ProductionOrderItemId = targetItemId,
                    MaterialId = material.ProductId,
                    UnitId = material.BaseUnitId,
                    SourceBomItemId = null,
                    NormPerUnit = line.NormPerUnit,
                    WastageRate = line.WastageRate,
                    RequiredQty = required,
                    IssuedQty = 0,
                    ShortageQty = required,
                };
                MarkAdjusted(added, userId, now, $"{reason} (thêm NVL ngoài BOM)");
                _context.TrxProductionMaterialRequirements.Add(added);
                addedMaterialKeys.Add((targetItemId, material.ProductId));
                changed++;
            }
        }

        if (changed == 0) return Result.Failure<ProductionOrderDetailDto>("Không có thay đổi định mức nào.");

        if (requirements.Count - removedIds.Count + addedMaterialKeys.Count == 0)
            return Result.Failure<ProductionOrderDetailDto>("Lệnh sản xuất phải còn ít nhất một nguyên vật liệu.");

        await _context.SaveChangesAsync(ct);

        var detail = await ProductionReader.OrderDetailAsync(_context, _currentUser, order.ProductionOrderId, null, ct);
        return Result.Success(detail!);
    }

    private static void MarkAdjusted(TrxProductionMaterialRequirement r, int userId, DateTime at, string reason)
    {
        r.IsAdjusted = true;
        r.AdjustedBy = userId;
        r.AdjustedAt = at;
        r.AdjustReason = reason.Length > ReasonMaxLength ? reason[..ReasonMaxLength] : reason;
    }
}
