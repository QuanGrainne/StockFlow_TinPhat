using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace StockFlow.IntegrationTests.Infrastructure;

/// <summary>
/// Thu log Warning / Error của API trong lúc chạy test (VD exception đứng sau một phản hồi 500), để ghi vào output
/// của chính test đó — phục vụ phân tích nguyên nhân lỗi (APPLICATION_BUG / DATABASE_BUG...). Test chạy tuần tự nên dùng chung 1 hàng đợi.
/// </summary>
public sealed class ServerLogSink : ILoggerProvider
{
    private readonly ConcurrentQueue<string> _entries = new();

    public ILogger CreateLogger(string categoryName) => new SinkLogger(this, categoryName);

    public IReadOnlyList<string> Drain()
    {
        var list = new List<string>();
        while (_entries.TryDequeue(out var e)) list.Add(e);
        return list;
    }

    public void Dispose() { }

    private sealed class SinkLogger : ILogger
    {
        private readonly ServerLogSink _sink;
        private readonly string _category;

        public SinkLogger(ServerLogSink sink, string category)
        {
            _sink = sink;
            _category = category;
        }

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Error;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel)) return;
            var text = $"{logLevel} {_category}: {formatter(state, exception)}";
            if (exception != null)
            {
                var inner = exception;
                while (inner.InnerException != null) inner = inner.InnerException;
                text += $" | {exception.GetType().Name}: {exception.Message}" + (inner != exception ? $" | gốc: {inner.GetType().Name}: {inner.Message}" : "");
                var frame = exception.StackTrace?.Split('\n').FirstOrDefault(l => l.Contains("StockFlow.Application") || l.Contains("StockFlow.Infrastructure"));
                if (frame != null) text += $" | tại {frame.Trim()}";
            }
            _sink._entries.Enqueue(text);
        }
    }
}
