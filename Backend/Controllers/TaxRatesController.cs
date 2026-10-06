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
}
