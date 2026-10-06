using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly PosDbService _db;

    public SettingsController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet("store-profile")]
    public async Task<IActionResult> GetStoreProfile()
    {
        var store = await _db.GetStoreProfileAsync();
        return Ok(store);
    }

    [HttpPut("store-profile")]
    public async Task<IActionResult> UpdateStoreProfile([FromBody] Store store)
    {
        var updated = await _db.UpdateStoreProfileAsync(store);
        return Ok(updated);
    }
}
