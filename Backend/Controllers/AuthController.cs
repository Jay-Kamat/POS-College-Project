using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;
using PosBackend.Services;

namespace PosBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly PosDbService _db;
    private readonly JwtService _jwt;
    private readonly ILogger<AuthController> _logger;

    public AuthController(PosDbService db, JwtService jwt, ILogger<AuthController> logger)
    {
        _db = db;
        _jwt = jwt;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        {
            return BadRequest(new { status = "error", message = "Email and password are required." });
        }

        var user = await _db.GetUserByEmailForAuthAsync(req.Email);
        if (user == null)
        {
            _logger.LogWarning("Login failed: User not found for email {Email}", req.Email);
            return Unauthorized(new { status = "error", message = "Invalid email or password." });
        }

        if (user.Status != "Active" || user.RecordStatus != 0)
        {
            return StatusCode(403, new { status = "error", message = "Account is inactive or disabled. Contact system administrator." });
        }

        // Account Lockout check
        if (user.LockedUntil.HasValue && user.LockedUntil.Value > DateTime.UtcNow)
        {
            var remaining = (user.LockedUntil.Value - DateTime.UtcNow).Minutes + 1;
            return StatusCode(423, new {
                status = "error",
                message = $"Account is temporarily locked due to consecutive failed attempts. Try again in {remaining} minute(s)."
            });
        }

        // Verify BCrypt password hash
        bool passwordMatches = false;
        try
        {
            if (!string.IsNullOrWhiteSpace(user.PasswordHash))
            {
                passwordMatches = BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying password hash for {Email}", req.Email);
            passwordMatches = false;
        }

        if (!passwordMatches)
        {
            await _db.RecordFailedLoginAsync(user.Id);
            _logger.LogWarning("Login failed: Incorrect password for user {Email}", req.Email);
            return Unauthorized(new { status = "error", message = "Invalid email or password." });
        }

        // Reset failed login attempts and update last login timestamp
        await _db.ResetFailedLoginAndSetLastLoginAsync(user.Id);

        // Generate JWT Access Token
        var accessToken = _jwt.GenerateAccessToken(user);

        // Generate and record Refresh Token
        var (rawRefreshToken, tokenHash, refreshExpiresAt) = _jwt.GenerateRefreshToken();
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var tokenId = $"rt_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid():N}";
        await _db.SaveRefreshTokenAsync(tokenId, user.Id, tokenHash, refreshExpiresAt, clientIp);

        // Fetch user permissions
        var permissions = await _db.GetRolePermissionsAsync(user.Role);

        _logger.LogInformation("User {Email} logged in successfully with role {Role}", user.Email, user.Role);

        return Ok(new AuthResponseDto
        {
            Status = "success",
            Token = accessToken,
            RefreshToken = rawRefreshToken,
            User = new UserDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role,
                Store = user.Store,
                StoreId = user.StoreId ?? "store_mum_01",
                Status = user.Status,
                LastLogin = DateTime.Now.ToString("dd MMM yyyy, hh:mm tt")
            },
            Permissions = permissions
        });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto req)
    {
        if (string.IsNullOrWhiteSpace(req.RefreshToken))
        {
            return BadRequest(new { status = "error", message = "Refresh token is required." });
        }

        var tokenHash = JwtService.HashRefreshToken(req.RefreshToken.Trim());
        var record = await _db.GetRefreshTokenRecordAsync(tokenHash);

        if (record == null || record.RevokedAt != null || record.ExpiresAt < DateTime.UtcNow)
        {
            return Unauthorized(new { status = "error", message = "Invalid, revoked, or expired refresh token. Please log in again." });
        }

        // Revoke the old refresh token (rotation)
        await _db.RevokeRefreshTokenAsync(tokenHash);

        // Fetch user record
        var users = await _db.GetUsersAsync();
        var userSummary = users.FirstOrDefault(u => u.Id == record.UserId);
        if (userSummary == null)
        {
            return Unauthorized(new { status = "error", message = "User associated with token no longer exists." });
        }

        var authUser = await _db.GetUserByEmailForAuthAsync(userSummary.Email);
        if (authUser == null || authUser.Status != "Active")
        {
            return StatusCode(403, new { status = "error", message = "User account is no longer active." });
        }

        // Generate new tokens
        var newAccessToken = _jwt.GenerateAccessToken(authUser);
        var (newRawRefreshToken, newTokenHash, newRefreshExpiresAt) = _jwt.GenerateRefreshToken();
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var newTokenId = $"rt_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid():N}";
        await _db.SaveRefreshTokenAsync(newTokenId, authUser.Id, newTokenHash, newRefreshExpiresAt, clientIp);

        return Ok(new
        {
            status = "success",
            token = newAccessToken,
            refreshToken = newRawRefreshToken
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenDto? req)
    {
        if (!string.IsNullOrWhiteSpace(req?.RefreshToken))
        {
            var tokenHash = JwtService.HashRefreshToken(req.RefreshToken.Trim());
            await _db.RevokeRefreshTokenAsync(tokenHash);
        }

        // If user is authenticated, also revoke all tokens for this user
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrEmpty(userId))
        {
            await _db.RevokeAllUserTokensAsync(userId);
        }

        return Ok(new { status = "success", message = "Logged out successfully." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrEmpty(email))
        {
            return Unauthorized(new { status = "error", message = "Invalid auth token." });
        }

        var user = await _db.GetUserByEmailForAuthAsync(email);
        if (user == null)
        {
            return NotFound(new { status = "error", message = "User not found." });
        }

        var permissions = await _db.GetRolePermissionsAsync(user.Role);

        return Ok(new
        {
            status = "success",
            user = new UserDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role,
                Store = user.Store,
                StoreId = user.StoreId ?? "store_mum_01",
                Status = user.Status,
                LastLogin = DateTime.Now.ToString("dd MMM yyyy, hh:mm tt")
            },
            permissions
        });
    }
}
