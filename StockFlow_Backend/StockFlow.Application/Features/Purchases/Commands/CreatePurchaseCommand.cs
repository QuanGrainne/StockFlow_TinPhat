using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.Application.Features.PurchaseOrders.Helpers;
using StockFlow.Application.Features.Purchases.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Purchases.Commands;

public record CreatePurchaseCommand(CreatePurchaseRequest Request) : IRequest<Result<PurchaseDetailDto>>;

public class CreatePurchaseCommandHandler : IRequestHandler<CreatePurchaseCommand, Result<PurchaseDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreatePurchaseCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<PurchaseDetailDto>> Handle(CreatePurchaseCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;

        // 1. Kiểm tra tính hợp lệ của danh sách mặt hàng nhập
        if (req.Items == null || req.Items.Count == 0)
        {
            return Result.Failure<PurchaseDetailDto>("Phiếu nhập hàng phải có ít nhất 1 mặt hàng.");
        }

        foreach (var item in req.Items)
        {
            if (item.Quantity <= 0)
            {
                return Result.Failure<PurchaseDetailDto>($"Số lượng nhập của sản phẩm ID #{item.ProductId} phải lớn hơn 0.");
            }
            if (item.UnitPrice < 0)
            {
                return Result.Failure<PurchaseDetailDto>($"Đơn giá nhập của sản phẩm ID #{item.ProductId} không được âm.");
            }
        }

        // 2. Xác định kho nhận hàng (nếu không truyền, lấy kho đầu tiên được phân quyền của user)
        int warehouseId;
        if (req.WarehouseId.HasValue && req.WarehouseId.Value > 0)
        {
            warehouseId = req.WarehouseId.Value;
        }
        else
        {
            var authWarehouses = await _currentUserService.GetAuthorizedWarehouseIdsAsync(cancellationToken);
            if (authWarehouses.Count == 0)
            {
                return Result.Failure<PurchaseDetailDto>("Bạn chưa được phân quyền kho nào để nhập hàng.");
            }
            warehouseId = authWarehouses[0];
        }

        // Cô lập dữ liệu kho: chỉ được nhập hàng vào kho mình được phân quyền
        if (!await _currentUserService.HasWarehouseAccessAsync(warehouseId, cancellationToken))
        {
            return Result.Failure<PurchaseDetailDto>("Bạn không có quyền nhập hàng vào kho này.");
        }

        var warehouse = await _context.MstWarehouses
            .FirstOrDefaultAsync(w => w.WarehouseId == warehouseId, cancellationToken);
        if (warehouse == null)
        {
            return Result.Failure<PurchaseDetailDto>($"Không tìm thấy kho hàng ID #{warehouseId}.");
        }

        // 3. Kiểm tra Nhà cung cấp
        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == req.PartnerId, cancellationToken);
        if (partner == null)
        {
            return Result.Failure<PurchaseDetailDto>($"Không tìm thấy nhà cung cấp ID #{req.PartnerId}.");
        }

        // Nhập hàng theo phiếu đặt hàng nhập: phải đúng NCC, đúng kho và phiếu còn đang chờ nhập
        TrxPurchaseOrder? purchaseOrder = null;
        if (req.PurchaseOrderId is > 0)
        {
            purchaseOrder = await _context.TrxPurchaseOrders
                .FirstOrDefaultAsync(p => p.PoId == req.PurchaseOrderId.Value, cancellationToken);
            if (purchaseOrder == null)
            {
                return Result.Failure<PurchaseDetailDto>("Không tìm thấy phiếu đặt hàng nhập.");
            }
            if (purchaseOrder.Status != PurchaseOrderHelper.Ordered && purchaseOrder.Status != PurchaseOrderHelper.Partial)
            {
                return Result.Failure<PurchaseDetailDto>($"Phiếu đặt hàng nhập {purchaseOrder.PoCode} không ở trạng thái chờ nhập hàng.");
            }
            if (purchaseOrder.PartnerId != partner.PartnerId || purchaseOrder.WarehouseId != warehouseId)
            {
                return Result.Failure<PurchaseDetailDto>($"Nhà cung cấp và kho nhập phải trùng với phiếu đặt hàng nhập {purchaseOrder.PoCode}.");
            }
        }

        // 4. Kiểm tra các sản phẩm
        var productIds = req.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.MstProducts
            .Include(p => p.BaseUnit)
            .Where(p => productIds.Contains(p.ProductId))
            .ToDictionaryAsync(p => p.ProductId, cancellationToken);

        if (products.Count != productIds.Count)
        {
            return Result.Failure<PurchaseDetailDto>("Một số sản phẩm trong phiếu nhập không tồn tại trong danh mục.");
        }

        // 5. Sinh mã phiếu nhập chuẩn KiotViet: PN000001, PN000002... hoặc sử dụng mã người dùng nhập
        string grCode;
        if (string.IsNullOrWhiteSpace(req.PurchaseCode) || req.PurchaseCode.Trim().Equals("Mã phiếu tự động", StringComparison.OrdinalIgnoreCase))
        {
            grCode = await GoodsReceiptHelper.GenerateNextGoodsReceiptCodeAsync(_context, cancellationToken);
        }
        else
        {
            grCode = req.PurchaseCode.Trim().ToUpper();
            var exists = await _context.TrxGoodsReceipts
                .AnyAsync(r => r.GrCode == grCode, cancellationToken);
            if (exists)
            {
                return Result.Failure<PurchaseDetailDto>($"Mã phiếu nhập '{grCode}' đã tồn tại trong hệ thống.");
            }
        }

        if (!_currentUserService.UserId.HasValue)
        {
            return Result.Failure<PurchaseDetailDto>("Không xác định được người dùng đăng nhập.");
        }
        int currentUserId = _currentUserService.UserId.Value;

        // Client gửi ISO UTC (toISOString) → đổi về giờ Việt Nam trước khi lưu
        DateTime receivedDate = VietnamTime.From(req.ReceivedDate);
        string status = string.Equals(req.Status?.Trim(), "DRAFT", StringComparison.OrdinalIgnoreCase) ? "DRAFT" : "COMPLETED";

        // Thực hiện lưu trữ trong Database Transaction đảm bảo tính toàn vẹn tuyệt đối
        var dbContext = _context as DbContext;
        using var transaction = dbContext != null ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;

        try
        {
            // 6. Tạo thực thể TrxGoodsReceipt
            var goodsReceipt = new TrxGoodsReceipt
            {
                GrCode = grCode,
                ExternalPoNumber = purchaseOrder?.PoCode ?? req.ExternalPoNumber?.Trim(),
                PurchaseOrderId = purchaseOrder?.PoId,
                PartnerId = partner.PartnerId,
                WarehouseId = warehouse.WarehouseId,
                ReceivedBy = currentUserId,
                ReceivedDate = receivedDate,
                Status = status,
                Notes = req.Notes?.Trim()
            };

            // Tính tiền: phân bổ giảm giá phiếu vào giá vốn từng dòng
            var pricing = PurchasePricing.Compute(req.Items, req.DiscountAmount);
            goodsReceipt.DiscountAmount = pricing.DiscountApplied;

            _context.TrxGoodsReceipts.Add(goodsReceipt);

            // 7. Tạo danh sách mặt hàng DtlGoodsReceiptItem
            var receiptItems = new List<DtlGoodsReceiptItem>();
            // Số tiền cần trả NCC = tổng tiền hàng − giảm giá phiếu (làm tròn đến đồng)
            decimal totalAmount = Math.Round(pricing.NetTotal, 0, MidpointRounding.AwayFromZero);

            foreach (var line in pricing.Lines)
            {
                var reqItem = line.Request;

                var dtl = new DtlGoodsReceiptItem
                {
                    Gr = goodsReceipt,
                    ProductId = reqItem.ProductId,
                    OrderedQty = reqItem.Quantity,
                    ReceivedQty = reqItem.Quantity,
                    AcceptedQty = reqItem.Quantity,
                    DefectiveQty = 0,
                    DamagedQty = 0,
                    ShortageQty = 0,
                    UnitLandedCost = line.LandedCost,
                    UnitPrice = reqItem.UnitPrice,
                    DiscountPercent = Math.Clamp(reqItem.DiscountPercent, 0, 100),
                    LotId = reqItem.LotId
                };

                receiptItems.Add(dtl);
                _context.DtlGoodsReceiptItems.Add(dtl);
            }

            // Lưu trước phiếu nhập và chi tiết để DB sinh mã khóa chính GrId
            await _context.SaveChangesAsync(cancellationToken);

            // 8. Nếu Hoàn thành (COMPLETED): Cập nhật Tồn kho, Giá vốn BQ gia quyền, Thẻ kho và Công nợ
            decimal paidAmount = 0;
            decimal debtAmount = 0;

            if (status == "COMPLETED")
            {
                foreach (var item in receiptItems)
                {
                    decimal incomingQty = item.AcceptedQty ?? item.ReceivedQty ?? item.OrderedQty ?? 0;
                    decimal unitPrice = item.UnitLandedCost ?? 0;

                    // A. Cập nhật tồn kho tại kho nhận (TrxInventoryBalance)
                    // Kiểm tra Local change tracker trước để tránh duplicate key nếu có nhiều dòng cùng sản phẩm
                    var balance = _context.TrxInventoryBalances.Local
                        .FirstOrDefault(b => b.WarehouseId == warehouseId &&
                                             b.ProductId == item.ProductId &&
                                             b.LocationId == item.LocationId &&
                                             b.LotId == item.LotId)
                        ?? await _context.TrxInventoryBalances
                            .FirstOrDefaultAsync(b => b.WarehouseId == warehouseId &&
                                                      b.ProductId == item.ProductId &&
                                                      b.LocationId == item.LocationId &&
                                                      b.LotId == item.LotId, cancellationToken);

                    decimal currentQty = balance?.Quantity ?? 0;
                    decimal currentCost = balance?.UnitCost ?? 0;

                    decimal newUnitCost = GoodsReceiptHelper.CalculateMovingAverageCost(
                        currentQty, currentCost, incomingQty, unitPrice);

                    if (balance == null)
                    {
                        balance = new TrxInventoryBalance
                        {
                            WarehouseId = warehouseId,
                            ProductId = item.ProductId,
                            LocationId = item.LocationId,
                            LotId = item.LotId,
                            Quantity = incomingQty,
                            UnitCost = newUnitCost,
                            LastUpdated = VietnamTime.Now
                        };
                        _context.TrxInventoryBalances.Add(balance);
                    }
                    else
                    {
                        balance.Quantity = currentQty + incomingQty;
                        balance.UnitCost = newUnitCost;
                        balance.LastUpdated = VietnamTime.Now;
                    }

                    // B. Cập nhật Giá vốn chung của sản phẩm (MstProduct.MovingAverageCost)
                    if (products.TryGetValue(item.ProductId, out var prod))
                    {
                        prod.MovingAverageCost = newUnitCost;
                    }

                    // C. Ghi nhật ký thẻ kho (TrxInventoryTransaction) với ReferenceId = GrId thật vừa sinh
                    var invTx = new TrxInventoryTransaction
                    {
                        WarehouseId = warehouseId,
                        ProductId = item.ProductId,
                        LocationId = item.LocationId,
                        LotId = item.LotId,
                        TransactionType = "INBOUND_RECEIPT",
                        Quantity = incomingQty,
                        ReferenceType = "GOODS_RECEIPT",
                        ReferenceId = goodsReceipt.GrId,
                        TransactionDate = receivedDate,
                        CreatedBy = currentUserId,
                        TransactionPrice = PurchaseStockOps.LinePrice(item), // Giá GD = giá nhập trên phiếu (sau giảm giá dòng)
                        UnitCost = newUnitCost,
                        BalanceAfter = balance.Quantity
                    };
                    _context.TrxInventoryTransactions.Add(invTx);
                }

                // D. Thanh toán & Công nợ Nhà cung cấp
                paidAmount = Math.Clamp(req.PaidAmount, 0, totalAmount);
                debtAmount = Math.Max(0, totalAmount - paidAmount);

                if (paidAmount > 0)
                {
                    var finTx = new TrxFinancialTransaction
                    {
                        PartnerId = partner.PartnerId,
                        TxType = "SUPPLIER_PAYMENT",
                        Amount = paidAmount,
                        PaymentMethod = string.IsNullOrWhiteSpace(req.PaymentMethod) ? "CASH" : req.PaymentMethod.Trim().ToUpperInvariant(),
                        ReferenceType = "GOODS_RECEIPT",
                        ReferenceId = goodsReceipt.GrId,
                        TransactionDate = receivedDate,
                        CreatedBy = currentUserId,
                        Status = "COMPLETED",
                        Description = $"Thanh toán tiền hàng phiếu nhập {grCode}"
                    };
                    _context.TrxFinancialTransactions.Add(finTx);
                }

                // Ghi nhận số nợ chưa trả vào tổng công nợ của Nhà cung cấp
                if (debtAmount > 0)
                {
                    partner.CurrentPayable = (partner.CurrentPayable ?? 0) + debtAmount;
                }

                // Lưu các thay đổi về tồn kho, thẻ kho và giao dịch tài chính
                await _context.SaveChangesAsync(cancellationToken);
            }

            if (status == "COMPLETED")
            {
                await PurchaseOrderHelper.RecalculateStatusAsync(_context, goodsReceipt.PurchaseOrderId, cancellationToken);
            }

            if (transaction != null)
            {
                await transaction.CommitAsync(cancellationToken);
            }

            // 9. Chuẩn bị DTO phản hồi chi tiết
            var responseItems = receiptItems.Select(i =>
            {
                var p = products[i.ProductId];
                decimal qty = i.AcceptedQty ?? i.ReceivedQty ?? i.OrderedQty ?? 0;
                decimal price = i.UnitLandedCost ?? 0;
                return new PurchaseItemDto(
                    i.GrItemId,
                    i.ProductId,
                    p.ProductCode ?? $"SP{i.ProductId}",
                    p.ProductName ?? "Sản phẩm",
                    p.BaseUnit?.UnitName ?? "Cái",
                    qty,
                    price,
                    0,
                    qty * price,
                    i.LotId,
                    null
                );
            }).ToList();

            string userFullName = (await _context.SecUsers
                .AsNoTracking()
                .Where(u => u.UserId == currentUserId)
                .Select(u => u.FullName ?? u.Username)
                .FirstOrDefaultAsync(cancellationToken)) ?? $"NV #{currentUserId}";

            var detail = new PurchaseDetailDto(
                goodsReceipt.GrId,
                goodsReceipt.GrCode ?? grCode,
                goodsReceipt.ExternalPoNumber,
                warehouse.WarehouseId,
                warehouse.WarehouseCode ?? $"K{warehouse.WarehouseId}",
                warehouse.WarehouseName ?? $"Kho #{warehouse.WarehouseId}",
                partner.PartnerId,
                partner.PartnerCode ?? $"NCC{partner.PartnerId}",
                partner.PartnerName ?? "Nhà cung cấp",
                partner.Phone,
                partner.Address,
                partner.CurrentPayable ?? 0,
                goodsReceipt.ReceivedDate,
                goodsReceipt.Status ?? status,
                currentUserId,
                userFullName,
                totalAmount,
                paidAmount,
                debtAmount,
                req.PaymentMethod,
                goodsReceipt.Notes,
                responseItems
            );

            return Result.Success(detail);
        }
        catch (Exception ex)
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }
            return Result.Failure<PurchaseDetailDto>($"Lỗi khi tạo phiếu nhập hàng: {ex.Message}");
        }
    }
}
