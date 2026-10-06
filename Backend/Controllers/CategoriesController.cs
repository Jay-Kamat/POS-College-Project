using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly PosDbService _db;

    public CategoriesController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var list = (await _db.GetCategoriesAsync()).ToList();
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCategory([FromBody] Category cat)
    {
        if (string.IsNullOrWhiteSpace(cat.Name))
            return BadRequest(new { status = "error", message = "Category Name is required" });

        var created = await _db.CreateCategoryAsync(cat.Name);
        return StatusCode(201, created);
    }
}
