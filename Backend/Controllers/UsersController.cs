using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;
using PosBackend.Services;

namespace PosBackend.Controllers;

public class UpdatePermissionRequest
{
    public string Module { get; set; } = "";
    public string Role { get; set; } = "cashier";
    public string Action { get; set; } = "read";
    public bool Value { get; set; } = true;
}

public class UpdateRoleRequest
{
    public string Role { get; set; } = "Cashier";
}

[Authorize(Roles = "Admin,admin")]
[Route("api/[controller]")]
public class UsersController : BaseApiController
{
    private readonly PosDbService _db;

    public UsersController(PosDbService db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var users = (await _db.GetUsersAsync()).ToList();
        var totalCount = users.Count;
        var pagedItems = users.Skip((Math.Max(1, page) - 1) * Math.Max(1, pageSize)).Take(Math.Max(1, pageSize)).ToList();

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
    public async Task<IActionResult> GetUserStats()
    {
        var stats = await _db.GetUserStatsAsync();
        return Ok(stats);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] UserDto user)
    {
        if (string.IsNullOrWhiteSpace(user.Name) || string.IsNullOrWhiteSpace(user.Email))
            return BadRequest(new { status = "error", message = "Name and Email are required." });

        var created = await _db.CreateUserAsync(user);
        return StatusCode(201, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UserDto user)
    {
        var updated = await _db.UpdateUserAsync(id, user);
        return Ok(updated);
    }

    [HttpPut("{id}/role")]
    public async Task<IActionResult> UpdateUserRole(string id, [FromBody] UpdateRoleRequest req)
    {
        var updated = await _db.UpdateUserRoleAsync(id, req.Role);
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        await _db.DeleteUserAsync(id);
        return Ok(new { status = "success", message = "User deleted successfully." });
    }

    [HttpGet("permissions-matrix")]
    public async Task<IActionResult> GetPermissionsMatrix()
    {
        var matrix = await _db.GetPermissionsMatrixAsync();
        return Ok(matrix);
    }

    [HttpPut("permissions-matrix")]
    public async Task<IActionResult> UpdatePermission([FromBody] UpdatePermissionRequest req)
    {
        await _db.UpdatePermissionAsync(req.Module, req.Role, req.Action, req.Value);
        var matrix = await _db.GetPermissionsMatrixAsync();
        return Ok(matrix);
    }

    [HttpPost("permissions-matrix/bulk")]
    public async Task<IActionResult> SavePermissionsMatrixBulk([FromBody] List<PermissionMatrixRowDto> rows)
    {
        await _db.SavePermissionsMatrixBulkAsync(rows);
        var matrix = await _db.GetPermissionsMatrixAsync();
        return Ok(matrix);
    }
}
