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
    public async Task<IActionResult> GetMaterialReturns()
    {
        var list = await _db.GetMaterialReturnsAsync();
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> CreateMaterialReturn([FromBody] JsonElement body)
    {
        var created = await _db.CreateMaterialReturnAsync(body);
        return StatusCode(201, created);
    }
}
