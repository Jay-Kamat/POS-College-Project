using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Services;

namespace PosBackend.Controllers;

[Authorize(Roles = "Admin,admin,Inventory,inventory,Inventory Manager")]
[Route("api/material-returns")]
[Route("api/material_returns")]
public class MaterialReturnsController : BaseApiController
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
    public async Task<IActionResult> GetMaterialReturns(
        [FromQuery] string? reasonId, 
        [FromQuery] string? vendorId, 
        [FromQuery] string? search,
        [FromQuery] string? storeId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var list = (await _db.GetMaterialReturnsAsync(reasonId, vendorId, search, targetStoreId)).ToList();
        
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
        var userId = GetCurrentUserId();
        var created = await _db.CreateMaterialReturnAsync(body, targetStoreId, userId);
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
