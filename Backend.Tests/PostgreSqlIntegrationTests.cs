using System.Data;
using Dapper;
using Microsoft.Extensions.Configuration;
using PosBackend.Data;
using PosBackend.Models;
using PosBackend.Services;
using Xunit;

namespace Backend.Tests;

public class PostgreSqlIntegrationTests
{
    private readonly PosDbService _db;
    private readonly Store _activeStore;

    public PostgreSqlIntegrationTests()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Port=5432;Database=pos_billing_db;Username=postgres;Password=root;Include Error Detail=true"
            })
            .Build();

        var factory = new NpgsqlConnectionFactory(config);
        _db = new PosDbService(factory);
        _activeStore = new Store
        {
            Id = "store_mum_01",
            Name = "DailyMart Express (Mumbai)",
            State = "Maharashtra",
            InvoicePrefix = "INV-MUM"
        };
    }

    [Fact]
    public async Task Can_Connect_And_Fetch_Products_And_Stores()
    {
        var products = await _db.GetProductsAsync(null, null, _activeStore.Id);
        var stores = await _db.GetStoresAsync();

        Assert.NotNull(products);
        Assert.NotNull(stores);
        Assert.NotEmpty(stores);
    }

    [Fact]
    public async Task Checkout_Deducts_Stock_And_Cancel_Restores_Stock_Atomically()
    {
        // 1. Setup isolated test product
        var testProdId = $"test_prod_{Guid.NewGuid():N}";
        var testBatchId = $"batch_test_{Guid.NewGuid():N}";
        decimal initialStock = 5m;

        var product = new Product
        {
            Id = testProdId,
            ProductNumber = $"TP-{DateTime.UtcNow.Ticks % 100000}",
            Name = "Automated Test Milk 1L",
            Cost = 50m,
            TaxPercent = 5m,
            Unit = "LTR",
            StockQuantity = initialStock,
            Days = 10,
            IsExpDate = true,
            StoreId = _activeStore.Id,
            RecordStatus = 0
        };

        var created = await _db.CreateProductAsync(product);
        testProdId = created.Id;

        // Add initial stock batch
        using (var conn = _db.CreateConn())
        {
            await conn.ExecuteAsync(@"
                INSERT INTO stock_batches (id, product_id, store_id, batch_no, expiry_date, qty_received, qty_remaining)
                VALUES (@Id, @ProdId, @StoreId, 'BATCH-TEST-01', CURRENT_DATE + INTERVAL '10 days', @Qty, @Qty);",
                new { Id = testBatchId, ProdId = testProdId, StoreId = _activeStore.Id, Qty = initialStock });
        }

        // 2. Perform checkout of 2 units
        var cart = new CartDto
        {
            Customer = new CartCustomerDto { Name = "Test Buyer", MobileNumber = "9999900001", State = "Maharashtra" },
            PaymentMode = 0,
            Items = new List<CartLineItem>
            {
                new()
                {
                    Id = testProdId,
                    ProductNumber = product.ProductNumber,
                    Name = product.Name,
                    Cost = 50m,
                    Rate = 60m,
                    TaxPercent = 5m,
                    Unit = "LTR",
                    Quantity = 2m
                }
            }
        };

        var invoice = await _db.CreateInvoiceAsync(cart, _activeStore, "test_cashier");
        Assert.NotNull(invoice);
        Assert.Equal(0, invoice.RecordStatus);

        // Check stock is now 3m
        var afterCheckout = await _db.GetProductByIdAsync(testProdId);
        Assert.NotNull(afterCheckout);
        Assert.Equal(3m, afterCheckout.StockQuantity);

        // 3. Cancel the invoice
        var cancelResult = await _db.CancelInvoiceAsync(invoice.Id, "Customer changed mind", "test_admin");
        Assert.NotNull(cancelResult);
        Assert.Equal(1, cancelResult.RecordStatus);

        // Check stock is restored to 5m
        var afterCancel = await _db.GetProductByIdAsync(testProdId);
        Assert.NotNull(afterCancel);
        Assert.Equal(5m, afterCancel.StockQuantity);

        // Clean up test data
        using (var conn = _db.CreateConn())
        {
            await conn.ExecuteAsync(@"
                DELETE FROM whatsapp_outbox WHERE invoice_id = @InvId;
                DELETE FROM invoices WHERE id = @InvId;
                DELETE FROM stock_movements WHERE product_id = @ProdId;
                DELETE FROM stock_batches WHERE product_id = @ProdId;
                DELETE FROM products WHERE id = @ProdId;",
                new { InvId = invoice.Id, ProdId = testProdId });
        }
    }

    [Fact]
    public async Task Checkout_Throws_409_InsufficientStockException_When_Stock_Is_Short()
    {
        var testProdId = $"test_short_{Guid.NewGuid():N}";
        var product = new Product
        {
            Id = testProdId,
            ProductNumber = $"TP-SHORT-{DateTime.UtcNow.Ticks % 100000}",
            Name = "Low Stock Test Item",
            Cost = 10m,
            TaxPercent = 0m,
            Unit = "PCS",
            StockQuantity = 1m,
            StoreId = _activeStore.Id,
            RecordStatus = 0
        };
        var created = await _db.CreateProductAsync(product);
        testProdId = created.Id;

        var cart = new CartDto
        {
            Customer = new CartCustomerDto { Name = "Short Stock Tester", MobileNumber = "9999900002" },
            PaymentMode = 0,
            Items = new List<CartLineItem>
            {
                new()
                {
                    Id = testProdId,
                    ProductNumber = product.ProductNumber,
                    Name = product.Name,
                    Cost = 10m,
                    Rate = 15m,
                    TaxPercent = 0m,
                    Unit = "PCS",
                    Quantity = 5m // Requests 5 when only 1 is available
                }
            }
        };

        await Assert.ThrowsAsync<InsufficientStockException>(() =>
            _db.CreateInvoiceAsync(cart, _activeStore, "test_cashier")
        );

        // Clean up
        using (var conn = _db.CreateConn())
        {
            await conn.ExecuteAsync("DELETE FROM products WHERE id = @Id;", new { Id = testProdId });
        }
    }

    [Fact]
    public async Task Concurrent_Checkout_Of_Last_Unit_Allows_Exactly_One_Success()
    {
        // Setup a product with exactly 1 unit in stock
        var testProdId = $"test_concurrent_{Guid.NewGuid():N}";
        var batchId = $"batch_conc_{Guid.NewGuid():N}";

        var product = new Product
        {
            Id = testProdId,
            ProductNumber = $"TP-CONC-{DateTime.UtcNow.Ticks % 100000}",
            Name = "Exclusive Single Unit",
            Cost = 100m,
            TaxPercent = 0m,
            Unit = "PCS",
            StockQuantity = 1m,
            StoreId = _activeStore.Id,
            RecordStatus = 0
        };
        var created = await _db.CreateProductAsync(product);
        testProdId = created.Id;

        using (var conn = _db.CreateConn())
        {
            await conn.ExecuteAsync(@"
                INSERT INTO stock_batches (id, product_id, store_id, batch_no, expiry_date, qty_received, qty_remaining)
                VALUES (@Id, @ProdId, @StoreId, 'BATCH-SINGLE-01', CURRENT_DATE + INTERVAL '30 days', 1, 1);",
                new { Id = batchId, ProdId = testProdId, StoreId = _activeStore.Id });
        }

        var cart1 = new CartDto
        {
            Customer = new CartCustomerDto { Name = "Concurrent User 1", MobileNumber = "9999900011" },
            PaymentMode = 0,
            Items = new List<CartLineItem>
            {
                new() { Id = testProdId, ProductNumber = product.ProductNumber, Name = product.Name, Cost = 100m, Rate = 120m, TaxPercent = 0m, Unit = "PCS", Quantity = 1m }
            }
        };

        var cart2 = new CartDto
        {
            Customer = new CartCustomerDto { Name = "Concurrent User 2", MobileNumber = "9999900022" },
            PaymentMode = 0,
            Items = new List<CartLineItem>
            {
                new() { Id = testProdId, ProductNumber = product.ProductNumber, Name = product.Name, Cost = 100m, Rate = 120m, TaxPercent = 0m, Unit = "PCS", Quantity = 1m }
            }
        };

        // Fire both checkout requests concurrently
        var task1 = Task.Run(async () =>
        {
            try
            {
                var inv = await _db.CreateInvoiceAsync(cart1, _activeStore, "cashier1");
                return new CheckoutResult { Success = true, Invoice = inv };
            }
            catch (Exception ex)
            {
                return new CheckoutResult { Success = false, Error = ex };
            }
        });

        var task2 = Task.Run(async () =>
        {
            try
            {
                var inv = await _db.CreateInvoiceAsync(cart2, _activeStore, "cashier2");
                return new CheckoutResult { Success = true, Invoice = inv };
            }
            catch (Exception ex)
            {
                return new CheckoutResult { Success = false, Error = ex };
            }
        });

        var results = await Task.WhenAll(task1, task2);

        int successes = results.Count(r => r.Success);
        int failures = results.Count(r => !r.Success && r.Error is InsufficientStockException);

        // Exactly one must succeed, and exactly one must fail with InsufficientStockException!
        Assert.Equal(1, successes);
        Assert.Equal(1, failures);

        // Final stock must be exactly 0
        var finalProduct = await _db.GetProductByIdAsync(testProdId);
        Assert.NotNull(finalProduct);
        Assert.Equal(0m, finalProduct.StockQuantity);

        // Clean up
        var winningInvoice = results.FirstOrDefault(r => r.Success)?.Invoice;
        using (var conn = _db.CreateConn())
        {
            await conn.ExecuteAsync(@"
                DELETE FROM whatsapp_outbox WHERE invoice_id = @InvId;
                DELETE FROM invoices WHERE id = @InvId;
                DELETE FROM stock_movements WHERE product_id = @ProdId;
                DELETE FROM stock_batches WHERE product_id = @ProdId;
                DELETE FROM products WHERE id = @ProdId;",
                new { InvId = winningInvoice?.Id ?? "", ProdId = testProdId });
        }
    }

    private class CheckoutResult
    {
        public bool Success { get; set; }
        public Invoice? Invoice { get; set; }
        public Exception? Error { get; set; }
    }
}
