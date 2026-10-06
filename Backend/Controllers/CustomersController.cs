using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private readonly PosDbService _db;

    public CustomersController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetCustomers([FromQuery] string? search)
    {
        var list = (await _db.GetCustomersAsync(search)).ToList();
        return Ok(new { status = "success", count = list.Count, data = list });
    }

    [HttpGet("by-mobile/{mobile}")]
    public async Task<IActionResult> GetCustomerByMobile(string mobile)
    {
        var found = await _db.GetCustomerByMobileAsync(mobile);
        if (found == null)
            return NotFound(new { status = "error", message = "Customer not found" });

        return Ok(new { status = "success", data = found });
    }

    [HttpPost]
    public async Task<IActionResult> CreateCustomer([FromBody] Customer customer)
    {
        if (string.IsNullOrWhiteSpace(customer.Name) || string.IsNullOrWhiteSpace(customer.MobileNumber))
            return BadRequest(new { status = "error", message = "Name and MobileNumber are required" });

        var created = await _db.CreateCustomerAsync(customer);
        return StatusCode(201, new { status = "success", data = created });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCustomer(string id, [FromBody] Customer customer)
    {
        var updated = await _db.UpdateCustomerAsync(id, customer);
        return Ok(new { status = "success", data = updated });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCustomer(string id)
    {
        await _db.DeleteCustomerAsync(id);
        return Ok(new { status = "success", message = "Customer soft deleted" });
    }
}
