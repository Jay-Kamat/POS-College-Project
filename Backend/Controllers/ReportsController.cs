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

    private string? ResolveStoreId(string? queryStoreId)
    {
        if (!string.IsNullOrWhiteSpace(queryStoreId)) return queryStoreId.Trim();
        var header = Request.Headers["X-Store-Id"].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(header) ? header.Trim() : null;
    }

    [HttpGet("kpis")]
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardKpis([FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var kpis = await _db.GetDashboardKpisAsync(targetStoreId);
        return Ok(new { status = "success", data = kpis });
    }

    [HttpGet("daily-sales")]
    public async Task<IActionResult> GetDailySales([FromQuery] string? date, [FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var report = await _db.GetDailySalesReportAsync(date, targetStoreId);
        return Ok(new { status = "success", data = report });
    }

    [HttpGet("vendor-wise-sale")]
    public async Task<IActionResult> GetVendorWiseSale([FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var report = await _db.GetVendorWiseSalesReportAsync(targetStoreId);
        return Ok(new { status = "success", data = report });
    }

    [HttpGet("vendor-wise-expired-stock")]
    public async Task<IActionResult> GetVendorWiseExpiredStock([FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var report = await _db.GetVendorWiseExpiredStockReportAsync(targetStoreId);
        return Ok(new { status = "success", data = report });
    }
}
