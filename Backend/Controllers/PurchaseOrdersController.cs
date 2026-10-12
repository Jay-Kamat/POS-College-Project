using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/purchase-orders")]
[Route("api/purchase_orders")]
public class PurchaseOrdersController : ControllerBase
{
    private readonly PosDbService _db;

    public PurchaseOrdersController(PosDbService db)
    {
        _db = db;
    }

    private string? ResolveStoreId(string? queryStoreId)
    {
        if (!string.IsNullOrWhiteSpace(queryStoreId)) return queryStoreId.Trim();
        var header = Request.Headers["X-Store-Id"].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(header) ? header.Trim() : null;
    }

    [HttpGet]
    public async Task<IActionResult> GetPurchaseOrders(
        [FromQuery] string? status, 
        [FromQuery] string? vendorId, 
        [FromQuery] string? search,
        [FromQuery] string? excludeStatus,
        [FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var list = await _db.GetPurchaseOrdersAsync(status, vendorId, search, excludeStatus, targetStoreId);
        return Ok(list);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetPurchaseOrderStats([FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var stats = await _db.GetPurchaseOrderStatsAsync(targetStoreId);
        return Ok(new { status = "success", data = stats });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPurchaseOrderById(string id)
    {
        var item = await _db.GetPurchaseOrderByIdAsync(id);
        if (item == null)
            return NotFound(new { status = "error", message = "Purchase Order not found" });

        return Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePurchaseOrder([FromBody] JsonElement body)
    {
        var targetStoreId = ResolveStoreId(null);
        var created = await _db.CreatePurchaseOrderAsync(body, targetStoreId);
        return StatusCode(201, created);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdatePurchaseOrderStatus(string id, [FromBody] StatusUpdateRequest body)
    {
        var status = !string.IsNullOrWhiteSpace(body?.Status) ? body.Status : "Received";
        var updated = await _db.UpdatePurchaseOrderStatusAsync(id, status);
        if (updated == null)
            return NotFound(new { status = "error", message = "Purchase Order not found" });

        return Ok(updated);
    }
}

public class StatusUpdateRequest
{
    public string? Status { get; set; }
}
