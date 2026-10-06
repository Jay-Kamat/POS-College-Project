using Microsoft.AspNetCore.Mvc;

namespace PosBackend.Controllers;

public class LoginRequest
{
    public string? Email { get; set; }
    public string? Password { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest req)
    {
        return Ok(new
        {
            status = "success",
            token = "jwt_mock_token_for_college_pos_demo",
            user = new
            {
                id = "user_admin_01",
                name = "Administrator",
                email = req.Email ?? "admin@dailymart.in",
                role = "admin"
            }
        });
    }
}
