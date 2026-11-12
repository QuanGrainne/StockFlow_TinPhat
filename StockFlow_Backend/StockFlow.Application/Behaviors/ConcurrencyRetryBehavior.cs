using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Behaviors;

/// <summary>
/// Thử lại command đánh dấu IRetryOnConcurrencyConflict khi EF báo DbUpdateConcurrencyException
/// (dòng tồn kho vừa bị giao dịch khác sửa — token xmin không khớp).
/// Mỗi lần thử: bỏ theo dõi entity cũ rồi chạy lại cả handler (transaction mới, đọc lại tồn).
/// Hết số lần thử thì để lỗi đi tiếp tới ExceptionHandlingMiddleware (trả 409).
/// </summary>
public sealed class ConcurrencyRetryBehavior<TRequest, TResponse>(
    IStockFlowDbContext context,
    ILogger<ConcurrencyRetryBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private const int MaxAttempts = 3;

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (request is not IRetryOnConcurrencyConflict) return await next(cancellationToken);

        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await next(cancellationToken);
            }
            catch (DbUpdateConcurrencyException) when (attempt < MaxAttempts)
            {
                logger.LogWarning("Xung đột tồn kho khi xử lý {Request}, thử lại lần {Attempt}", typeof(TRequest).Name, attempt + 1);
                context.ClearChangeTracker();
                await Task.Delay(50 * attempt, cancellationToken);
            }
        }
    }
}
