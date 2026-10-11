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

    [HttpGet]
    public async Task<IActionResult> GetMaterialInward()
    {
        var list = await _db.GetMaterialInwardAsync();
        return Ok(list);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetMaterialInwardStats()
    {
        var stats = await _db.GetMaterialInwardStatsAsync();
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
        var created = await _db.CreateMaterialInwardAsync(body);
        return StatusCode(201, created);
    }
}
