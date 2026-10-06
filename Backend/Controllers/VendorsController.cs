using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VendorsController : ControllerBase
{
    private readonly PosDbService _db;

    public VendorsController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetVendors([FromQuery] string? search)
    {
        var list = (await _db.GetVendorsAsync(search)).ToList();
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> CreateVendor([FromBody] Vendor vendor)
    {
        if (string.IsNullOrWhiteSpace(vendor.Name))
            return BadRequest(new { status = "error", message = "Vendor Name is required" });

        var created = await _db.CreateVendorAsync(vendor);
        return StatusCode(201, created);
    }
}
