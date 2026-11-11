using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Customers.Commands;

internal static class CustomerReceiptLookup
{
    /// <summary>Các dòng giao dịch RECEIPT của khách mang mã phiếu thu này (1 phiếu có thể gồm nhiều dòng).</summary>
    public static Task<List<TrxFinancialTransaction>> LoadAsync(
        IStockFlowDbContext context, int partnerId, string code, CancellationToken ct)
    {
        var c = (code ?? "").Trim().ToUpper();
        return context.TrxFinancialTransactions
            .Where(t => t.PartnerId == partnerId && t.TxType == "RECEIPT" && t.TxCode != null && t.TxCode.ToUpper() == c)
            .ToListAsync(ct);
    }
}
