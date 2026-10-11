using Microsoft.AspNetCore.Mvc;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/tax-rates")]
public class TaxRatesController : ControllerBase
{
    private readonly PosDbService _db;

    public TaxRatesController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetTaxRates()
    {
        var list = (await _db.GetTaxRatesAsync()).ToList();
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTaxRate([FromBody] PosBackend.Models.TaxRate rate)
    {
        if (string.IsNullOrWhiteSpace(rate.Name))
            return BadRequest(new { status = "error", message = "Name is required" });

        var created = await _db.CreateTaxRateAsync(rate);
        return StatusCode(201, created);
    }
}
