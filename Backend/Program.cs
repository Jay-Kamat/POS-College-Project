using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using PosBackend.Data;
using PosBackend.Database;
using PosBackend.Middleware;
using PosBackend.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Port 5000 (or from environment PORT)
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://*:{port}");

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Preserve exact property casing (e.g. PascalCase for Models, lowercase for anonymous types)
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHttpClient();

// JWT Configuration & Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "DailyMart_Super_Secure_JWT_Secret_Key_Production_2026_!@#$%";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "DailyMartPosApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "DailyMartPosApp";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // Dev & local container support
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// Locked CORS Policy
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
    ?? new[] { "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("ConfiguredCors", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Core Dependencies
builder.Services.AddSingleton<IDbConnectionFactory, NpgsqlConnectionFactory>();
builder.Services.AddSingleton<JwtService>();
builder.Services.AddScoped<PosDbService>();
builder.Services.AddTransient<DatabaseMigrator>();

var app = builder.Build();

// Run automated database migrations on startup
using (var scope = app.Services.CreateScope())
{
    var migrator = scope.ServiceProvider.GetRequiredService<DatabaseMigrator>();
    await migrator.MigrateAsync();
}

// Request Tracing and Global Exception Handling
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();

// Security Headers
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseCors("ConfiguredCors");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

Console.WriteLine("==========================================================");
Console.WriteLine("  DailyMart POS & Billing System - ASP.NET Core API");
Console.WriteLine($"  Listening on: http://localhost:{port}");
Console.WriteLine("  Database: PostgreSQL (pos_billing_db via Npgsql + Dapper)");
Console.WriteLine($"  Health Check: http://localhost:{port}/api/health");
Console.WriteLine("==========================================================");

app.Run();
