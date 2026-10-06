using Microsoft.AspNetCore.Mvc;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult GetHealth()
    {
        return Ok(new
        {
            status = "healthy",
            database = "PostgreSQL (pos_billing_db)",
            timestamp = DateTime.UtcNow,
            service = "POS & Billing System .NET Core Backend API",
            version = "1.0.0"
        });
    }
}
