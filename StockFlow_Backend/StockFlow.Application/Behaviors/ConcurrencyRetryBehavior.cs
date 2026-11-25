using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Behaviors;

/// <summary>
/// Thử lại command đánh dấu <see cref="IRetryOnConcurrencyConflict"/> khi EF báo DbUpdateConcurrencyException
/// (dòng tồn kho vừa bị giao dịch khác sửa — token xmin không khớp), thay vì ghi đè làm mất cập nhật (DEF-IT-01).
/// Mỗi lần thử: bỏ theo dõi entity cũ rồi chạy lại cả handler (transaction mới, đọc lại tồn).
/// Chỉ command ngoài cùng được thử lại: command lồng bên trong (gửi qua ISender) để lỗi đi lên command ngoài.
/// Hết số lần thử thì để lỗi đi tiếp tới ExceptionHandlingMiddleware (trả 409).
/// </summary>
public sealed class ConcurrencyRetryBehavior<TRequest, TResponse>(
    IStockFlowDbContext context,
    ILogger<ConcurrencyRetryBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private const int MaxAttempts = 3;
    private static readonly AsyncLocal<bool> InRetryScope = new();

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (request is not IRetryOnConcurrencyConflict || InRetryScope.Value) return await next(cancellationToken);

        InRetryScope.Value = true;
        try
        {
            for (var attempt = 1; ; attempt++)
            {
                try
                {
                    return await next(cancellationToken);
                }
                catch (DbUpdateConcurrencyException) when (attempt < MaxAttempts)
                {
                    logger.LogWarning("Xung đột tồn kho khi xử lý {Request}, thử lại lần {Attempt}",
                        typeof(TRequest).Name, attempt + 1);
                    context.ClearChangeTracker();
                    await Task.Delay(50 * attempt, cancellationToken);
                }
            }
        }
        finally
        {
            InRetryScope.Value = false;
        }
    }
}
