using PosBackend.Data;
using PosBackend.Database;
using PosBackend.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Port 5000
builder.WebHost.UseUrls("http://localhost:5000");

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Preserve exact property casing (e.g. PascalCase for Models, lowercase for anonymous types)
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
    });

builder.Services.AddEndpointsApiExplorer();

// CORS for Vite React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Database dependencies
builder.Services.AddSingleton<IDbConnectionFactory, NpgsqlConnectionFactory>();
builder.Services.AddScoped<PosDbService>();
builder.Services.AddTransient<DatabaseMigrator>();

var app = builder.Build();

// Run automated database migrations on startup
using (var scope = app.Services.CreateScope())
{
    var migrator = scope.ServiceProvider.GetRequiredService<DatabaseMigrator>();
    await migrator.MigrateAsync();
}

app.UseCors("AllowAll");

app.MapControllers();

Console.WriteLine("==========================================================");
Console.WriteLine("  POS & Billing System ASP.NET Core Web API Backend");
Console.WriteLine("  Listening on: http://localhost:5000");
Console.WriteLine("  Database: PostgreSQL (pos_billing_db via Npgsql + Dapper)");
Console.WriteLine("  Health Check: http://localhost:5000/api/health");
Console.WriteLine("==========================================================");

app.Run();
