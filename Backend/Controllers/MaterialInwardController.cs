using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Services;

namespace PosBackend.Controllers;

[Authorize(Roles = "Admin,admin,Inventory,inventory,Inventory Manager")]
[Route("api/material-inward")]
[Route("api/material_inward")]
public class MaterialInwardController : BaseApiController
{
    private readonly PosDbService _db;

    public MaterialInwardController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetMaterialInward(
        [FromQuery] string? storeId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var list = (await _db.GetMaterialInwardAsync(targetStoreId)).ToList();
        
        var totalCount = list.Count;
        var pagedItems = list.Skip((Math.Max(1, page) - 1) * Math.Max(1, pageSize)).Take(Math.Max(1, pageSize)).ToList();

        return Ok(new {
            status = "success",
            count = totalCount,
            pageNumber = page,
            pageSize = pageSize,
            totalPages = (int)Math.Ceiling((double)totalCount / Math.Max(1, pageSize)),
            data = pagedItems
        });
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
            var userId = GetCurrentUserId();
            var created = await _db.CreateMaterialInwardAsync(body, targetStoreId, userId);
            return StatusCode(201, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { status = "error", message = ex.Message });
        }
    }
}
