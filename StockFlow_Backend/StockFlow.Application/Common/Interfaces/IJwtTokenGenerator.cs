namespace StockFlow.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateToken(int userId, string username, string fullName, IEnumerable<string> roles, IEnumerable<int> warehouseIds);
}
