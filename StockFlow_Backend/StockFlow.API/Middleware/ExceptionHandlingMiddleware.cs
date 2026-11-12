using FluentValidation;
using System.Net;
using System.Text.Json;

namespace StockFlow.API.Middleware;

/// <summary>
/// Global exception handler middleware — catches unhandled exceptions and returns
/// structured JSON error responses instead of exposing stack traces.
/// </summary>
public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ValidationException ex)
        {
            logger.LogWarning(ex, "Validation error on {Path}", context.Request.Path);
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            context.Response.ContentType = "application/json";

            var errorDict = ex.Errors
                .GroupBy(e => e.PropertyName.Replace("Request.", ""))
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(e => e.ErrorMessage).ToArray()
                );

            var responseObj = new
            {
                status = 400,
                code = "VALIDATION_FAILED",
                message = "Dữ liệu không hợp lệ.",
                errors = errorDict
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(responseObj, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException ex)
        {
            // Đã thử lại mà dòng tồn kho vẫn bị giao dịch khác sửa (token xmin)
            logger.LogWarning(ex, "Concurrency conflict on {Path}", context.Request.Path);
            context.Response.StatusCode = (int)HttpStatusCode.Conflict;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                status = 409,
                code = "CONCURRENCY_CONFLICT",
                message = "Tồn kho vừa được người khác cập nhật, vui lòng thử lại."
            }));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception on {Path}", context.Request.Path);
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                status = 500,
                code = "INTERNAL_SERVER_ERROR",
                message = "Đã xảy ra lỗi máy chủ không mong muốn. Vui lòng liên hệ quản trị viên."
            }));
        }
    }
}
