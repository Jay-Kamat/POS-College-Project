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

    [HttpGet]
    public async Task<IActionResult> GetBuckets()
    {
        var list = await _db.GetBucketsAsync();
        return Ok(new { status = "success", data = list });
    }

    [HttpPost]
    public async Task<IActionResult> SaveBucket([FromBody] JsonElement bucket)
    {
        var saved = await _db.SaveBucketAsync(bucket);
        return StatusCode(201, new { status = "success", data = saved });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBucket(string id)
    {
        await _db.DeleteBucketAsync(id);
        return Ok(new { status = "success", message = "Bucket deleted" });
    }
}
