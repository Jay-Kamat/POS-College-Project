using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;
using PosBackend.Services;

namespace PosBackend.Controllers;

[Authorize]
[Route("api/[controller]")]
public class StoresController : BaseApiController
{
    private readonly PosDbService _db;

    public StoresController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetStores()
    {
        var stores = await _db.GetStoresAsync();
        return Ok(stores);
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetStoreProfile([FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var store = await _db.GetStoreProfileAsync(targetStoreId);
        return Ok(store);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetStoreById(string id)
    {
        var store = await _db.GetStoreProfileAsync(id);
        return Ok(store);
    }

    [Authorize(Roles = "Admin,admin")]
    [HttpPost]
    public async Task<IActionResult> CreateStore([FromBody] Store store)
    {
        var created = await _db.CreateStoreAsync(store);
        return Ok(created);
    }

    [Authorize(Roles = "Admin,admin")]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateStoreProfile([FromBody] Store store)
    {
        var updated = await _db.UpdateStoreProfileAsync(store);
        return Ok(updated);
    }

    [Authorize(Roles = "Admin,admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateStoreById(string id, [FromBody] Store store)
    {
        if (string.IsNullOrEmpty(store.Id)) store.Id = id;
        var updated = await _db.UpdateStoreProfileAsync(store);
        return Ok(updated);
    }
}
