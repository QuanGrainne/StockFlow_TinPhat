using Microsoft.AspNetCore.Mvc;
using StockFlow.Infrastructure.Persistence;

namespace StockFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController(StockFlowDbContext dbContext) : ControllerBase
{
    /// <summary>
    /// Health check endpoint. Tests API status and PostgreSQL database connection.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        bool dbConnected = false;
        string dbMessage = "Connected";

        try
        {
            dbConnected = await dbContext.Database.CanConnectAsync();
        }
        catch (Exception ex)
        {
            dbMessage = ex.Message;
        }

        return Ok(new
        {
            status = dbConnected ? "healthy" : "degraded",
            database = dbConnected ? "connected" : $"failed: {dbMessage}",
            timestamp = DateTime.UtcNow
        });
    }
}
