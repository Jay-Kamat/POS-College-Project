using System.Diagnostics;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Data;

namespace PosBackend.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly IDbConnectionFactory _dbFactory;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<HealthController> _logger;

    public HealthController(
        IDbConnectionFactory dbFactory, 
        IConfiguration config, 
        IHttpClientFactory httpClientFactory,
        ILogger<HealthController> logger)
    {
        _dbFactory = dbFactory;
        _config = config;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetHealth()
    {
        var dbStatus = "unhealthy";
        long dbLatencyMs = 0;
        var sw = Stopwatch.StartNew();

        try
        {
            using var conn = _dbFactory.CreateConnection();
            var val = await conn.ExecuteScalarAsync<int>("SELECT 1;");
            sw.Stop();
            dbLatencyMs = sw.ElapsedMilliseconds;
            if (val == 1) dbStatus = "healthy";
        }
        catch (Exception ex)
        {
            sw.Stop();
            dbLatencyMs = sw.ElapsedMilliseconds;
            dbStatus = $"error: {ex.Message}";
            _logger.LogError(ex, "Database health check failed");
        }

        // Check OpenWA microservice
        var openWaUrl = _config["OpenWA:Url"] ?? "http://localhost:2785/api/v1";
        var openWaStatus = "unknown";
        long openWaLatencyMs = 0;
        sw.Restart();

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(2);
            var response = await client.GetAsync($"{openWaUrl}/health");
            sw.Stop();
            openWaLatencyMs = sw.ElapsedMilliseconds;
            openWaStatus = response.IsSuccessStatusCode ? "healthy" : $"warning: HTTP {response.StatusCode}";
        }
        catch (Exception ex)
        {
            sw.Stop();
            openWaLatencyMs = sw.ElapsedMilliseconds;
            openWaStatus = $"unavailable ({ex.Message})";
        }

        bool isOverallHealthy = dbStatus == "healthy";

        var payload = new
        {
            status = isOverallHealthy ? "healthy" : "degraded",
            timestamp = DateTime.UtcNow,
            service = "POS & Billing System ASP.NET Core Backend",
            version = "2.0.0",
            checks = new
            {
                database = new {
                    status = dbStatus,
                    latencyMs = dbLatencyMs,
                    target = "PostgreSQL (pos_billing_db)"
                },
                openWa = new {
                    status = openWaStatus,
                    latencyMs = openWaLatencyMs,
                    target = openWaUrl
                }
            }
        };

        return isOverallHealthy ? Ok(payload) : StatusCode(503, payload);
    }
}
