using Microsoft.AspNetCore.Mvc;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BucketsController : ControllerBase
{
    private static readonly List<object> _heldBuckets = new();

    [HttpGet]
    public IActionResult GetBuckets()
    {
        return Ok(new { status = "success", data = _heldBuckets });
    }

    [HttpPost]
    public IActionResult SaveBucket([FromBody] object bucket)
    {
        _heldBuckets.Add(bucket);
        return StatusCode(201, new { status = "success", data = bucket });
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteBucket(string id)
    {
        return Ok(new { status = "success", message = "Bucket deleted" });
    }
}
