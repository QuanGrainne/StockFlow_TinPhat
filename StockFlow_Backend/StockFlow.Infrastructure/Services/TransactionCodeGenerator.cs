using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Infrastructure.Services;

public class TransactionCodeGenerator : ITransactionCodeGenerator
{
    private readonly IStockFlowDbContext _context;

    public TransactionCodeGenerator(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<string> GenerateCodeAsync(string documentType, MstOrderSetting settings, CancellationToken cancellationToken = default)
    {
        string prefix;
        string sequenceName;

        switch (documentType?.ToUpperInvariant())
        {
            case "BOOKING":
                prefix = string.IsNullOrWhiteSpace(settings.BookingCodePrefix) ? "DH" : settings.BookingCodePrefix.Trim();
                sequenceName = "stockflow.seq_booking_code";
                break;
            case "RETURN":
                prefix = string.IsNullOrWhiteSpace(settings.ReturnCodePrefix) ? "TH" : settings.ReturnCodePrefix.Trim();
                sequenceName = "stockflow.seq_return_code";
                break;
            case "TRANSFER":
                prefix = string.IsNullOrWhiteSpace(settings.TransferCodePrefix) ? "CK" : settings.TransferCodePrefix.Trim();
                sequenceName = "stockflow.seq_transfer_code";
                break;
            case "STOCK_ISSUE":
            case "ISSUE":
                prefix = "XK";
                sequenceName = "stockflow.seq_stock_issue_code";
                break;
            case "PRODUCTION_ORDER":
                // Lệnh sản xuất (UC-59)
                prefix = "LSX";
                sequenceName = "stockflow.seq_production_order_code";
                break;
            case "PRODUCTION_PLAN":
                // Kế hoạch sản xuất (UC-PP-02): KHSX00001...
                prefix = "KHSX";
                sequenceName = "stockflow.seq_production_plan_code";
                break;
            case "MRP_RUN":
                // Lần chạy hoạch định nhu cầu NVL (UC-MRP, mã tạm): MRP00001...
                prefix = "MRP";
                sequenceName = "stockflow.seq_mrp_run_code";
                break;
            case "FINISHED_GOODS_RECEIPT":
                // Phiếu nhập thành phẩm (UC-49)
                prefix = "NTP";
                sequenceName = "stockflow.seq_fgr_code";
                break;
            case "CREDIT_REQUEST":
                // Yêu cầu duyệt vượt hạn mức công nợ (UC-27): YCHM00001
                prefix = "YCHM";
                sequenceName = "stockflow.seq_credit_request_code";
                break;
            case "ORDER":
            case "POS":
            default:
                prefix = string.IsNullOrWhiteSpace(settings.OrderCodePrefix) ? "HD" : settings.OrderCodePrefix.Trim();
                sequenceName = "stockflow.seq_pos_order_code";
                break;
        }

        // Mã chứng từ luôn theo số thứ tự: tiền tố + số sequence 5 chữ số (bỏ quy tắc theo ngày giờ / ngẫu nhiên 24/11/2026)
        long seqVal = await _context.GetNextSequenceValueAsync(sequenceName, cancellationToken);
        return $"{prefix}{seqVal:D5}";
    }
}

