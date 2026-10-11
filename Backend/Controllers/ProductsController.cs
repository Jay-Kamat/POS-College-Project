using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly PosDbService _db;

    public ProductsController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts([FromQuery] string? categoryId, [FromQuery] string? searchTerm)
    {
        var list = (await _db.GetProductsAsync(categoryId, searchTerm)).ToList();
        return Ok(new { status = "success", count = list.Count, data = list });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetProductStats()
    {
        var stats = await _db.GetProductStatsAsync();
        return Ok(new { status = "success", data = stats });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProductById(string id)
    {
        var item = await _db.GetProductByIdAsync(id);
        if (item == null)
            return NotFound(new { status = "error", message = "Product not found" });

        return Ok(new { status = "success", data = item });
    }

    [HttpGet("barcode/{barcode}")]
    public async Task<IActionResult> GetProductByBarcode(string barcode)
    {
        var item = await _db.GetProductByBarcodeAsync(Uri.UnescapeDataString(barcode));
        if (item == null)
            return NotFound(new { status = "error", message = $"No product found for code \"{barcode}\"" });

        return Ok(new { status = "success", data = item });
    }

    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] Product product)
    {
        if (string.IsNullOrWhiteSpace(product.Name))
            return BadRequest(new { status = "error", message = "Product Name is required" });

        var created = await _db.CreateProductAsync(product);
        return StatusCode(201, new { status = "success", data = created });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProduct(string id, [FromBody] Product product)
    {
        var updated = await _db.UpdateProductAsync(id, product);
        if (updated == null)
            return NotFound(new { status = "error", message = "Product not found" });

        return Ok(new { status = "success", data = updated });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProduct(string id)
    {
        await _db.DeleteProductAsync(id);
        return Ok(new { status = "success", message = "Product soft deleted" });
    }
}
