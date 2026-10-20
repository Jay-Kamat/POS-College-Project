using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using PosBackend.Models;

namespace PosBackend.Services;

public class JwtService
{
    private readonly IConfiguration _config;
    private readonly string _secretKey;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _expiryMinutes;
    private readonly int _refreshExpiryDays;

    public JwtService(IConfiguration config)
    {
        _config = config;
        _secretKey = _config["Jwt:Key"] ?? "DailyMart_Super_Secure_JWT_Secret_Key_Production_2026_!@#$%";
        _issuer = _config["Jwt:Issuer"] ?? "DailyMartPosApi";
        _audience = _config["Jwt:Audience"] ?? "DailyMartPosApp";
        _expiryMinutes = int.TryParse(_config["Jwt:ExpiryMinutes"], out var m) ? m : 120;
        _refreshExpiryDays = int.TryParse(_config["Jwt:RefreshTokenExpiryDays"], out var d) ? d : 7;
    }

    public string GenerateAccessToken(UserAuthRecord user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_secretKey);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role),
            new("store_id", user.StoreId ?? "store_mum_01"),
            new("store_name", user.Store ?? "DailyMart Express (Mumbai)"),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_expiryMinutes),
            Issuer = _issuer,
            Audience = _audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public (string RawToken, string TokenHash, DateTime ExpiresAt) GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }
        var rawToken = Convert.ToBase64String(randomBytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');

        var tokenHash = HashRefreshToken(rawToken);
        var expiresAt = DateTime.UtcNow.AddDays(_refreshExpiryDays);

        return (rawToken, tokenHash, expiresAt);
    }

    public static string HashRefreshToken(string rawToken)
    {
        using var sha = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(rawToken);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
