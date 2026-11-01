using StockFlow.Domain.Entities;

namespace StockFlow.Application.Common.Interfaces;

public interface ITransactionCodeGenerator
{
    Task<string> GenerateCodeAsync(string documentType, MstOrderSetting settings, CancellationToken cancellationToken = default);
}

