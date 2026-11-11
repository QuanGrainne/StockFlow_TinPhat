using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.WarehousePermissions.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.WarehousePermissions.Commands;

public record CreateWarehouseCommand(CreateWarehouseRequest Request) : IRequest<Result<WarehouseFacilityDto>>;

public class CreateWarehouseCommandHandler : IRequestHandler<CreateWarehouseCommand, Result<WarehouseFacilityDto>>
{
    private readonly IStockFlowDbContext _context;

    public CreateWarehouseCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<WarehouseFacilityDto>> Handle(CreateWarehouseCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        var rawCode = (!string.IsNullOrWhiteSpace(req.WarehouseCode) ? req.WarehouseCode : req.Code)?.Trim();
        string finalCode;

        if (string.IsNullOrWhiteSpace(rawCode) || rawCode.Equals("Tự động", StringComparison.OrdinalIgnoreCase) || rawCode.Equals("AUTO", StringComparison.OrdinalIgnoreCase))
        {
            var existingCodes = await _context.MstWarehouses
                .Where(w => w.WarehouseCode != null)
                .Select(w => w.WarehouseCode!)
                .ToListAsync(cancellationToken);

            int maxNum = 0;
            foreach (var c in existingCodes)
            {
                var kMatch = System.Text.RegularExpressions.Regex.Match(c, @"^K(\d+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (kMatch.Success && int.TryParse(kMatch.Groups[1].Value, out var n1))
                {
                    if (n1 > maxNum) maxNum = n1;
                }
                else
                {
                    var anyMatch = System.Text.RegularExpressions.Regex.Match(c, @"(\d+)");
                    if (anyMatch.Success && int.TryParse(anyMatch.Groups[1].Value, out var n2))
                    {
                        if (n2 > maxNum) maxNum = n2;
                    }
                }
            }

            finalCode = $"K{maxNum + 1:D3}";
            while (await _context.MstWarehouses.AnyAsync(w => w.WarehouseCode == finalCode, cancellationToken))
            {
                maxNum++;
                finalCode = $"K{maxNum + 1:D3}";
            }
        }
        else
        {
            finalCode = rawCode.ToUpper();
            var codeExists = await _context.MstWarehouses
                .AnyAsync(w => w.WarehouseCode == finalCode, cancellationToken);

            if (codeExists)
            {
                return Result.Failure<WarehouseFacilityDto>($"Mã kho '{finalCode}' đã tồn tại trong hệ thống.");
            }
        }

        if (string.IsNullOrWhiteSpace(req.WarehouseName))
        {
            return Result.Failure<WarehouseFacilityDto>("Tên kho không được để trống.");
        }

        var warehouse = new MstWarehouse
        {
            WarehouseCode = finalCode,
            WarehouseName = req.WarehouseName.Trim(),
            Address = req.Address?.Trim(),
            Description = req.Description?.Trim(),
            IsActive = req.IsActive ?? true
        };

        await _context.MstWarehouses.AddAsync(warehouse, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new WarehouseFacilityDto(
            Id: warehouse.WarehouseCode,
            WarehouseId: warehouse.WarehouseId,
            Code: warehouse.WarehouseCode,
            Name: warehouse.WarehouseName,
            Address: warehouse.Address ?? "Hà Nội, Việt Nam",
            StaffCount: 0,
            Area: !string.IsNullOrWhiteSpace(warehouse.Description) ? warehouse.Description : "3,500 m²",
            Status: warehouse.IsActive != false ? "ACTIVE" : "INACTIVE",
            Description: warehouse.Description
        );

        return Result.Success(dto);
    }
}
