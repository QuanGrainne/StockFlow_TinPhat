using System.Linq.Expressions;
using FluentValidation;
using StockFlow.Application.Features.Boms.DTOs;

namespace StockFlow.Application.Features.Boms.Helpers;

/// <summary>Validator cho từng dòng NVL: kiểm tra định dạng, chưa cần truy cập CSDL.</summary>
public class BomItemRequestValidator : AbstractValidator<BomItemRequest>
{
    public BomItemRequestValidator()
    {
        RuleFor(x => x.MaterialId).GreaterThan(0).WithMessage("Material is required.");
        RuleFor(x => x.UnitId).GreaterThan(0).WithMessage("Unit is required.");

        // MSG68: ≤ 0, vượt 6 chữ số thập phân hoặc vượt giá trị tối đa của cột đều bị TỪ CHỐI (BR-53)
        RuleFor(x => x.Quantity)
            .Must(BomQuantityRules.IsValidQuantity).WithMessage(BomMessages.Msg68InvalidQuantity);

        // MSG69: ngoài khoảng 0–100 hoặc quá 4 chữ số thập phân
        RuleFor(x => x.WastageRate)
            .Must(BomQuantityRules.IsValidWastage).WithMessage(BomMessages.Msg69InvalidWastage);
    }
}

/// <summary>Quy tắc dùng chung cho danh sách dòng NVL của lệnh tạo và lệnh sửa BOM.</summary>
public static class BomItemRules
{
    /// <param name="productId">
    /// Lấy mã thành phẩm từ lệnh (chỉ có khi tạo BOM) để kiểm tra MSG74 ngay trong validator.
    /// Mọi RuleFor trên cùng thuộc tính phải dùng CÙNG kiểu IEnumerable: FluentValidation lưu
    /// bộ truy cập theo thuộc tính, nên trộn List và IEnumerable sẽ gây InvalidCastException.
    /// </param>
    public static void AddItemListRules<T>(
        AbstractValidator<T> validator,
        Expression<Func<T, IEnumerable<BomItemRequest>>> items,
        Func<T, int>? productId = null)
    {
        // MSG66: BOM phải có ít nhất một dòng NVL
        validator.RuleFor(items)
            .NotEmpty().WithMessage(BomMessages.Msg66NoMaterial);

        // MSG67: không có hai dòng cùng một NVL trong BOM (BR-54)
        validator.RuleFor(items)
            .Must(list => list == null || list.Select(i => i.MaterialId).Distinct().Count() == list.Count())
            .WithMessage(BomMessages.Msg67DuplicateMaterial);

        // MSG74: thành phần không được là chính thành phẩm (BR-54, D7)
        if (productId != null)
        {
            validator.RuleFor(items)
                .Must((cmd, list) => list == null || list.All(i => i.MaterialId != productId(cmd)))
                .WithMessage(BomMessages.Msg74SelfComponent);
        }

        validator.RuleForEach(items).SetValidator(new BomItemRequestValidator());
    }
}
