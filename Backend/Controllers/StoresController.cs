using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StoresController : ControllerBase
{
    private readonly PosDbService _db;

    public StoresController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet]
    [HttpGet("profile")]
    public async Task<IActionResult> GetStoreProfile()
    {
        var store = await _db.GetStoreProfileAsync();
        return Ok(store);
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateStoreProfile([FromBody] Store store)
    {
        var updated = await _db.UpdateStoreProfileAsync(store);
        return Ok(updated);
    }
}
