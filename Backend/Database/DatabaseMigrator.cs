using System.Data;
using Dapper;
using Npgsql;

namespace PosBackend.Database;

public class DatabaseMigrator
{
    private readonly string _connectionString;
    private readonly ILogger<DatabaseMigrator> _logger;

    public DatabaseMigrator(IConfiguration configuration, ILogger<DatabaseMigrator> logger)
    {
        _logger = logger;
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=pos_billing_db;Username=postgres;Password=root;Include Error Detail=true";
    }

    public async Task MigrateAsync()
    {
        try
        {
            await EnsureDatabaseExistsAsync();
            await ApplyPendingMigrationsAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[DatabaseMigrator] Database migration check encountered an error: {Message}", ex.Message);
        }
    }

    private async Task EnsureDatabaseExistsAsync()
    {
        try
        {
            var csb = new NpgsqlConnectionStringBuilder(_connectionString);
            var targetDb = csb.Database;
            if (string.IsNullOrWhiteSpace(targetDb)) return;

            // Connect to default administrative 'postgres' database to verify if target DB exists
            var adminCsb = new NpgsqlConnectionStringBuilder(_connectionString)
            {
                Database = "postgres"
            };

            await using var adminConn = new NpgsqlConnection(adminCsb.ConnectionString);
            await adminConn.OpenAsync();

            var exists = await adminConn.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM pg_database WHERE datname = @dbName",
                new { dbName = targetDb }
            );

            if (exists == 0)
            {
                _logger.LogInformation("[DatabaseMigrator] Database '{Database}' does not exist. Creating...", targetDb);
                await adminConn.ExecuteAsync($"CREATE DATABASE \"{targetDb}\"");
                _logger.LogInformation("[DatabaseMigrator] Database '{Database}' created successfully.", targetDb);
            }
            else
            {
                _logger.LogInformation("[DatabaseMigrator] Database '{Database}' is available and ready.", targetDb);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("[DatabaseMigrator] Could not verify/create database via admin connection: {Message}", ex.Message);
        }
    }

    private async Task ApplyPendingMigrationsAsync()
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        // Ensure migration tracking table exists
        await conn.ExecuteAsync(@"
            CREATE TABLE IF NOT EXISTS __migrations_history (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        ");

        var appliedMigrations = (await conn.QueryAsync<string>("SELECT migration_name FROM __migrations_history"))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Find migrations folder
        var migrationFolders = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "Database", "Migrations"),
            Path.Combine(Directory.GetCurrentDirectory(), "Database", "Migrations"),
            Path.Combine(Directory.GetCurrentDirectory(), "Backend", "Database", "Migrations")
        };

        var targetFolder = migrationFolders.FirstOrDefault(Directory.Exists);
        if (targetFolder == null)
        {
            _logger.LogWarning("[DatabaseMigrator] No Database/Migrations directory found. Skipping file-based migration run.");
            return;
        }

        var files = Directory.GetFiles(targetFolder, "*.sql")
            .OrderBy(f => Path.GetFileName(f), StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (files.Count == 0)
        {
            _logger.LogInformation("[DatabaseMigrator] No .sql migration files found in {Directory}", targetFolder);
            return;
        }

        foreach (var file in files)
        {
            var fileName = Path.GetFileName(file);
            if (appliedMigrations.Contains(fileName))
            {
                continue;
            }

            _logger.LogInformation("[DatabaseMigrator] Executing migration: {File}", fileName);
            var sql = await File.ReadAllTextAsync(file);

            await using var tx = await conn.BeginTransactionAsync();
            try
            {
                await conn.ExecuteAsync(sql, transaction: tx);
                await conn.ExecuteAsync(
                    "INSERT INTO __migrations_history (migration_name) VALUES (@Name)",
                    new { Name = fileName },
                    transaction: tx
                );
                await tx.CommitAsync();
                _logger.LogInformation("[DatabaseMigrator] Successfully applied migration: {File}", fileName);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "[DatabaseMigrator] Failed applying migration {File}: {Error}", fileName, ex.Message);
                throw;
            }
        }

        _logger.LogInformation("[DatabaseMigrator] Database schema and migrations are completely up to date.");
    }
}
