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

    [HttpGet("stats")]
    public async Task<IActionResult> GetVendorStats()
    {
        var stats = await _db.GetVendorStatsAsync();
        return Ok(new { status = "success", data = stats });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetVendorById(string id)
    {
        var item = await _db.GetVendorByIdAsync(id);
        if (item == null)
            return NotFound(new { status = "error", message = "Vendor not found" });

        return Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> CreateVendor([FromBody] Vendor vendor)
    {
        if (string.IsNullOrWhiteSpace(vendor.Name))
            return BadRequest(new { status = "error", message = "Vendor Name is required" });

        var created = await _db.CreateVendorAsync(vendor);
        return StatusCode(201, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateVendor(string id, [FromBody] Vendor vendor)
    {
        if (string.IsNullOrWhiteSpace(vendor.Name))
            return BadRequest(new { status = "error", message = "Vendor Name is required" });

        var updated = await _db.UpdateVendorAsync(id, vendor);
        if (updated == null)
            return NotFound(new { status = "error", message = "Vendor not found" });

        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteVendor(string id)
    {
        var success = await _db.DeleteVendorAsync(id);
        if (!success)
            return NotFound(new { status = "error", message = "Vendor not found" });

        return Ok(new { status = "success", message = "Vendor deleted successfully" });
    }
}
