using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/purchase-orders")]
[Route("api/purchase_orders")]
public class PurchaseOrdersController : ControllerBase
{
    private readonly PosDbService _db;

    public PurchaseOrdersController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetPurchaseOrders()
    {
        var list = await _db.GetPurchaseOrdersAsync();
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePurchaseOrder([FromBody] dynamic body)
    {
        var created = await _db.CreatePurchaseOrderAsync(body);
        return StatusCode(201, created);
    }
}
