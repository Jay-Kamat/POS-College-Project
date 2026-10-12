using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BucketsController : ControllerBase
{
    private readonly PosDbService _db;

    public BucketsController(PosDbService db)
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
    public async Task<IActionResult> GetBuckets([FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var list = await _db.GetBucketsAsync(targetStoreId);
        return Ok(new { status = "success", data = list });
    }

    [HttpPost]
    public async Task<IActionResult> SaveBucket([FromBody] JsonElement bucket)
    {
        var targetStoreId = ResolveStoreId(null);
        var saved = await _db.SaveBucketAsync(bucket, targetStoreId);
        return StatusCode(201, new { status = "success", data = saved });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBucket(string id)
    {
        await _db.DeleteBucketAsync(id);
        return Ok(new { status = "success", message = "Bucket deleted" });
    }
}
