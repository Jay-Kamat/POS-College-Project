using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/material-inward")]
[Route("api/material_inward")]
public class MaterialInwardController : ControllerBase
{
    private readonly PosDbService _db;

    public MaterialInwardController(PosDbService db)
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
    public async Task<IActionResult> GetMaterialInward([FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var list = await _db.GetMaterialInwardAsync(targetStoreId);
        return Ok(list);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetMaterialInwardStats([FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var stats = await _db.GetMaterialInwardStatsAsync(targetStoreId);
        return Ok(new { status = "success", data = stats });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetMaterialInwardById(string id)
    {
        var item = await _db.GetMaterialInwardByIdAsync(id);
        if (item == null)
            return NotFound(new { status = "error", message = "Material Inward not found" });

        return Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> CreateMaterialInward([FromBody] JsonElement body)
    {
        try
        {
            var targetStoreId = ResolveStoreId(null);
            var created = await _db.CreateMaterialInwardAsync(body, targetStoreId);
            return StatusCode(201, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { status = "error", message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { status = "error", message = ex.Message });
        }
    }
}
