using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/material-returns")]
[Route("api/material_returns")]
public class MaterialReturnsController : ControllerBase
{
    private readonly PosDbService _db;

    public MaterialReturnsController(PosDbService db)
    {
        _db = db;
    }

    private string? ResolveStoreId(string? queryStoreId)
    {
        if (!string.IsNullOrWhiteSpace(queryStoreId)) return queryStoreId.Trim();
        var header = Request.Headers["X-Store-Id"].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(header) ? header.Trim() : null;
    }

    [HttpGet("reasons")]
    public async Task<IActionResult> GetReturnReasons()
    {
        var reasons = await _db.GetReturnReasonsAsync();
        return Ok(reasons);
    }

    [HttpGet]
    public async Task<IActionResult> GetMaterialReturns(
        [FromQuery] string? reasonId, 
        [FromQuery] string? vendorId, 
        [FromQuery] string? search,
        [FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var list = await _db.GetMaterialReturnsAsync(reasonId, vendorId, search, targetStoreId);
        return Ok(list);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetMaterialReturnStats([FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var stats = await _db.GetMaterialReturnStatsAsync(targetStoreId);
        return Ok(new { status = "success", data = stats });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetMaterialReturnById(string id)
    {
        var item = await _db.GetMaterialReturnByIdAsync(id);
        if (item == null)
            return NotFound(new { status = "error", message = "Material Return note not found" });

        return Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> CreateMaterialReturn([FromBody] JsonElement body)
    {
        var targetStoreId = ResolveStoreId(null);
        var created = await _db.CreateMaterialReturnAsync(body, targetStoreId);
        return StatusCode(201, created);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateMaterialReturnStatus(string id, [FromBody] StatusUpdateRequest body)
    {
        var status = !string.IsNullOrWhiteSpace(body?.Status) ? body.Status : "Dispatched to Supplier";
        var updated = await _db.UpdateMaterialReturnStatusAsync(id, status);
        if (updated == null)
            return NotFound(new { status = "error", message = "Material Return note not found" });

        return Ok(updated);
    }
}
