using Xunit;
using Xunit.Abstractions;
using Dapper;
using PosBackend.Services;
using PosBackend.Data;
using Microsoft.Extensions.Configuration;

namespace Backend.Tests;

public class PasswordSeedHelper
{
    private readonly ITestOutputHelper _output;

    public PasswordSeedHelper(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task Seed_Valid_Bcrypt_Password_Hashes()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Port=5432;Database=pos_billing_db;Username=postgres;Password=root;"
            })
            .Build();

        var factory = new NpgsqlConnectionFactory(config);
        var db = new PosDbService(factory);

        var adminHash = BCrypt.Net.BCrypt.HashPassword("Admin@Pass123", 11);
        var cashierHash = BCrypt.Net.BCrypt.HashPassword("Cashier@Pass123", 11);
        var mgrHash = BCrypt.Net.BCrypt.HashPassword("Manager@Pass123", 11);
        var invHash = BCrypt.Net.BCrypt.HashPassword("Inventory@Pass123", 11);

        _output.WriteLine($"ADMIN_HASH: {adminHash}");

        Assert.True(BCrypt.Net.BCrypt.Verify("Admin@Pass123", adminHash));
        Assert.True(BCrypt.Net.BCrypt.Verify("Cashier@Pass123", cashierHash));

        using var conn = db.CreateConn();
        await conn.ExecuteAsync(@"
            UPDATE users SET password_hash = @AdminHash, failed_attempts = 0, locked_until = NULL WHERE email = 'admin@dailymart.in';
            UPDATE users SET password_hash = @CashierHash, failed_attempts = 0, locked_until = NULL WHERE email = 'cashier1@dailymart.in';
            UPDATE users SET password_hash = @MgrHash, failed_attempts = 0, locked_until = NULL WHERE email = 'manager.mumbai@dailymart.in';
            UPDATE users SET password_hash = @InvHash, failed_attempts = 0, locked_until = NULL WHERE email = 'inventory@dailymart.in';
        ", new {
            AdminHash = adminHash,
            CashierHash = cashierHash,
            MgrHash = mgrHash,
            InvHash = invHash
        });
    }
}
