using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace PosBackend.Controllers;

[ApiController]
public abstract class BaseApiController : ControllerBase
{
    protected string ResolveStoreId(string? requestedStoreId = null)
    {
        var role = User.FindFirstValue(ClaimTypes.Role)?.ToLowerInvariant();
        var userStoreId = User.FindFirst("store_id")?.Value;

        // Only Admin role can override the store
        if (role == "admin" && !string.IsNullOrWhiteSpace(requestedStoreId))
        {
            return requestedStoreId.Trim();
        }

        // Cashiers, Inventory managers, etc. must use their assigned store
        if (!string.IsNullOrWhiteSpace(userStoreId))
        {
            return userStoreId.Trim();
        }

        // Check header if admin
        var header = Request.Headers["X-Store-Id"].FirstOrDefault();
        if (role == "admin" && !string.IsNullOrWhiteSpace(header))
        {
            return header.Trim();
        }

        if (!string.IsNullOrWhiteSpace(requestedStoreId))
        {
            return requestedStoreId.Trim();
        }

        return "store_mum_01";
    }

    protected string GetCurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "user_admin_01";
    }

    protected string GetCurrentUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role) ?? "Cashier";
    }
}
