using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;
using PosBackend.Services;

namespace PosBackend.Controllers;

[Authorize(Roles = "Admin,admin")]
[Route("api/[controller]")]
public class SettingsController : BaseApiController
{
    private readonly PosDbService _db;

    public SettingsController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet("store-profile")]
    public async Task<IActionResult> GetStoreProfile([FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var store = await _db.GetStoreProfileAsync(targetStoreId);
        return Ok(store);
    }

    [HttpPut("store-profile")]
    public async Task<IActionResult> UpdateStoreProfile([FromBody] Store store)
    {
        var updated = await _db.UpdateStoreProfileAsync(store);
        return Ok(updated);
    }
}
