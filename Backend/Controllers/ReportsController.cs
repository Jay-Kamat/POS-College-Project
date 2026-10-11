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
    [HttpGet("dashboard")]
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

    [HttpGet("vendor-wise-sale")]
    public async Task<IActionResult> GetVendorWiseSale()
    {
        var report = await _db.GetVendorWiseSalesReportAsync();
        return Ok(new { status = "success", data = report });
    }

    [HttpGet("vendor-wise-expired-stock")]
    public async Task<IActionResult> GetVendorWiseExpiredStock()
    {
        var report = await _db.GetVendorWiseExpiredStockReportAsync();
        return Ok(new { status = "success", data = report });
    }
}
