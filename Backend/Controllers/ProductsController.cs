using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;
using PosBackend.Services;

namespace PosBackend.Controllers;

[Authorize]
[Route("api/[controller]")]
public class ProductsController : BaseApiController
{
    private readonly PosDbService _db;

    public ProductsController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts(
        [FromQuery] string? categoryId, 
        [FromQuery] string? searchTerm, 
        [FromQuery] string? storeId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var list = (await _db.GetProductsAsync(categoryId, searchTerm, targetStoreId)).ToList();
        
        var totalCount = list.Count;
        var pagedItems = list.Skip((Math.Max(1, page) - 1) * Math.Max(1, pageSize)).Take(Math.Max(1, pageSize)).ToList();

        return Ok(new { 
            status = "success", 
            count = totalCount, 
            pageNumber = page,
            pageSize = pageSize,
            totalPages = (int)Math.Ceiling((double)totalCount / Math.Max(1, pageSize)),
            data = pagedItems 
        });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetProductStats([FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var stats = await _db.GetProductStatsAsync(targetStoreId);
        return Ok(new { status = "success", data = stats });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProductById(string id, [FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var item = await _db.GetProductByIdAsync(id, targetStoreId);
        if (item == null)
            return NotFound(new { status = "error", message = "Product not found" });

        return Ok(new { status = "success", data = item });
    }

    [HttpGet("barcode/{barcode}")]
    public async Task<IActionResult> GetProductByBarcode(string barcode, [FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var item = await _db.GetProductByBarcodeAsync(Uri.UnescapeDataString(barcode), targetStoreId);
        if (item == null)
            return NotFound(new { status = "error", message = $"No product found for code \"{barcode}\"" });

        return Ok(new { status = "success", data = item });
    }

    [Authorize(Roles = "Admin,admin,Inventory,inventory,Inventory Manager")]
    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] Product product)
    {
        if (string.IsNullOrWhiteSpace(product.Name))
            return BadRequest(new { status = "error", message = "Product Name is required" });

        product.StoreId = ResolveStoreId(product.StoreId);

        var created = await _db.CreateProductAsync(product);
        return StatusCode(201, new { status = "success", data = created });
    }

    [Authorize(Roles = "Admin,admin,Inventory,inventory,Inventory Manager")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProduct(string id, [FromBody] Product product)
    {
        product.StoreId = ResolveStoreId(product.StoreId);
        var updated = await _db.UpdateProductAsync(id, product);
        if (updated == null)
            return NotFound(new { status = "error", message = "Product not found" });

        return Ok(new { status = "success", data = updated });
    }

    [Authorize(Roles = "Admin,admin,Inventory,inventory,Inventory Manager")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProduct(string id)
    {
        await _db.DeleteProductAsync(id);
        return Ok(new { status = "success", message = "Product soft deleted" });
    }
}
