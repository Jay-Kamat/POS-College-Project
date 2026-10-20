using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Services;

namespace PosBackend.Controllers;

[Authorize]
[Route("api/[controller]")]
public class ReportsController : BaseApiController
{
    private readonly PosDbService _db;

    public ReportsController(PosDbService db)
    {
        _db = db;
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
