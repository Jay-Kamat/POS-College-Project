using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;
using PosBackend.Services;

namespace PosBackend.Controllers;

public class CancelInvoiceRequest
{
    public string? Reason { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class InvoicesController : ControllerBase
{
    private readonly PosDbService _db;

    public InvoicesController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetInvoices([FromQuery] string? startDate, [FromQuery] string? endDate, [FromQuery] string? search, [FromQuery] int? paymentMode, [FromQuery] string? status)
    {
        var list = (await _db.GetInvoicesAsync(startDate, endDate, search, paymentMode, status)).ToList();
        return Ok(new { status = "success", count = list.Count, data = list });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetInvoiceStats()
    {
        var stats = await _db.GetInvoiceStatsAsync();
        return Ok(new { status = "success", data = stats });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetInvoiceById(string id)
    {
        var found = await _db.GetInvoiceByIdAsync(id);
        if (found == null)
            return NotFound(new { status = "error", message = "Invoice not found" });

        return Ok(new { status = "success", data = found });
    }

    [HttpPost]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest req)
    {
        if (req?.Cart == null || req.Cart.Items == null || req.Cart.Items.Count == 0)
            return BadRequest(new { status = "error", message = "Cannot generate invoice for an empty cart" });

        try
        {
            var created = await _db.CreateInvoiceAsync(req.Cart, req.ActiveStore);
            return StatusCode(201, new { status = "success", data = created });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { status = "error", message = ex.Message });
        }
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelInvoice(string id, [FromBody] CancelInvoiceRequest? req)
    {
        var cancelled = await _db.CancelInvoiceAsync(id, req?.Reason);
        if (cancelled == null)
            return NotFound(new { status = "error", message = "Invoice not found" });

        return Ok(new { status = "success", message = "Invoice soft cancelled successfully", data = cancelled });
    }
}
