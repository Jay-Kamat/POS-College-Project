using Microsoft.AspNetCore.Mvc;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly PosDbService _db;

    public ReportsController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet("kpis")]
    public async Task<IActionResult> GetDashboardKpis()
    {
        var kpis = await _db.GetDashboardKpisAsync();
        return Ok(new { status = "success", data = kpis });
    }

    [HttpGet("daily-sales")]
    public async Task<IActionResult> GetDailySales([FromQuery] string? date)
    {
        var report = await _db.GetDailySalesReportAsync(date);
        return Ok(new { status = "success", data = report });
    }
}
