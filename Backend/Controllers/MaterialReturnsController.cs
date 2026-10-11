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

    [HttpGet("reasons")]
    public async Task<IActionResult> GetReturnReasons()
    {
        var reasons = await _db.GetReturnReasonsAsync();
        return Ok(reasons);
    }

    [HttpGet]
    public async Task<IActionResult> GetMaterialReturns([FromQuery] string? reasonId, [FromQuery] string? vendorId, [FromQuery] string? search)
    {
        var list = await _db.GetMaterialReturnsAsync(reasonId, vendorId, search);
        return Ok(list);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetMaterialReturnStats()
    {
        var stats = await _db.GetMaterialReturnStatsAsync();
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
        var created = await _db.CreateMaterialReturnAsync(body);
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
