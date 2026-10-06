using System.Data;
using System.Text.Json;
using Dapper;
using Npgsql;
using PosBackend.Data;
using PosBackend.Models;

namespace PosBackend.Services;

public class PosDbService
{
    private readonly IDbConnectionFactory _connectionFactory;

    public PosDbService(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    private IDbConnection CreateConn() => _connectionFactory.CreateConnection();

    // -------------------------------------------------------------
    // Products
    // -------------------------------------------------------------
    public async Task<IEnumerable<Product>> GetProductsAsync(string? categoryId, string? searchTerm)
    {
        using var conn = CreateConn();
        var sql = "SELECT id as Id, product_number as ProductNumber, name as Name, cost as Cost, ingredients as Ingredients, notes as Notes, is_exp_date as IsExpDate, days as Days, category_id as CategoryId, tax_rate_id as TaxRateId, tax_percent as TaxPercent, stock_quantity as StockQuantity, record_status as RecordStatus, created_at as Created, updated_at as Updated FROM products WHERE record_status = 0";
        var p = new DynamicParameters();

        if (!string.IsNullOrEmpty(categoryId) && categoryId != "cat_all")
        {
            sql += " AND category_id = @CategoryId";
            p.Add("CategoryId", categoryId);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            sql += " AND (LOWER(name) LIKE @Search OR LOWER(product_number) LIKE @Search OR LOWER(COALESCE(ingredients, '')) LIKE @Search)";
            p.Add("Search", $"%{searchTerm.Trim().ToLower()}%");
        }

        sql += " ORDER BY created_at DESC";
        return await conn.QueryAsync<Product>(sql, p);
    }

    public async Task<Product?> GetProductByIdAsync(string id)
    {
        using var conn = CreateConn();
        var sql = "SELECT id as Id, product_number as ProductNumber, name as Name, cost as Cost, ingredients as Ingredients, notes as Notes, is_exp_date as IsExpDate, days as Days, category_id as CategoryId, tax_rate_id as TaxRateId, tax_percent as TaxPercent, stock_quantity as StockQuantity, record_status as RecordStatus, created_at as Created, updated_at as Updated FROM products WHERE id = @Id AND record_status = 0";
        return await conn.QueryFirstOrDefaultAsync<Product>(sql, new { Id = id });
    }

    public async Task<Product?> GetProductByBarcodeAsync(string barcode)
    {
        var clean = barcode?.Trim() ?? "";
        if (string.IsNullOrEmpty(clean)) return null;

        if (clean.StartsWith("{") && clean.EndsWith("}"))
        {
            try
            {
                using var doc = JsonDocument.Parse(clean);
                var root = doc.RootElement;
                if (root.TryGetProperty("barcode", out var bc)) clean = bc.GetString() ?? clean;
                else if (root.TryGetProperty("ProductNumber", out var pn)) clean = pn.GetString() ?? clean;
                else if (root.TryGetProperty("id", out var pid)) clean = pid.GetString() ?? clean;
            }
            catch { }
        }

        if (clean.Contains('/'))
        {
            var parts = clean.Split('/');
            clean = parts[^1];
        }

        using var conn = CreateConn();
        var sql = "SELECT id as Id, product_number as ProductNumber, name as Name, cost as Cost, ingredients as Ingredients, notes as Notes, is_exp_date as IsExpDate, days as Days, category_id as CategoryId, tax_rate_id as TaxRateId, tax_percent as TaxPercent, stock_quantity as StockQuantity, record_status as RecordStatus, created_at as Created, updated_at as Updated FROM products WHERE (product_number = @Code OR id = @Code OR LOWER(product_number) = LOWER(@Code)) AND record_status = 0 LIMIT 1";
        return await conn.QueryFirstOrDefaultAsync<Product>(sql, new { Code = clean });
    }

    public async Task<Product> CreateProductAsync(Product p)
    {
        var id = $"prd_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var pNum = string.IsNullOrWhiteSpace(p.ProductNumber) ? $"200100{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString()[^6..]}" : p.ProductNumber;
        using var conn = CreateConn();
        var sql = @"
            INSERT INTO products (id, product_number, name, cost, ingredients, notes, is_exp_date, days, category_id, tax_rate_id, tax_percent, stock_quantity, record_status, created_id, updated_id)
            VALUES (@Id, @ProductNumber, @Name, @Cost, @Ingredients, @Notes, @IsExpDate, @Days, @CategoryId, @TaxRateId, @TaxPercent, @StockQuantity, 0, 'user_01', 'user_01')
            RETURNING id as Id, product_number as ProductNumber, name as Name, cost as Cost, ingredients as Ingredients, notes as Notes, is_exp_date as IsExpDate, days as Days, category_id as CategoryId, tax_rate_id as TaxRateId, tax_percent as TaxPercent, stock_quantity as StockQuantity, record_status as RecordStatus, created_at as Created, updated_at as Updated;
        ";
        return await conn.QuerySingleAsync<Product>(sql, new {
            Id = id,
            ProductNumber = pNum,
            p.Name,
            p.Cost,
            Ingredients = p.Ingredients ?? "",
            Notes = p.Notes ?? "",
            p.IsExpDate,
            p.Days,
            CategoryId = string.IsNullOrEmpty(p.CategoryId) ? "cat_dairy" : p.CategoryId,
            TaxRateId = p.TaxRateId ?? "tax_5",
            TaxPercent = p.TaxPercent > 0 ? p.TaxPercent : 5,
            StockQuantity = p.StockQuantity > 0 ? p.StockQuantity : 50
        });
    }

    public async Task<Product?> UpdateProductAsync(string id, Product p)
    {
        using var conn = CreateConn();
        var sql = @"
            UPDATE products
            SET name = COALESCE(@Name, name),
                cost = COALESCE(@Cost, cost),
                ingredients = COALESCE(@Ingredients, ingredients),
                notes = COALESCE(@Notes, notes),
                category_id = COALESCE(@CategoryId, category_id),
                tax_percent = COALESCE(@TaxPercent, tax_percent),
                stock_quantity = COALESCE(@StockQuantity, stock_quantity),
                updated_at = NOW()
            WHERE id = @Id
            RETURNING id as Id, product_number as ProductNumber, name as Name, cost as Cost, ingredients as Ingredients, notes as Notes, is_exp_date as IsExpDate, days as Days, category_id as CategoryId, tax_rate_id as TaxRateId, tax_percent as TaxPercent, stock_quantity as StockQuantity, record_status as RecordStatus, created_at as Created, updated_at as Updated;
        ";
        return await conn.QueryFirstOrDefaultAsync<Product>(sql, new {
            Id = id,
            p.Name,
            p.Cost,
            p.Ingredients,
            p.Notes,
            p.CategoryId,
            p.TaxPercent,
            p.StockQuantity
        });
    }

    public async Task<bool> DeleteProductAsync(string id)
    {
        using var conn = CreateConn();
        var rows = await conn.ExecuteAsync("UPDATE products SET record_status = 1, updated_at = NOW() WHERE id = @Id", new { Id = id });
        return rows > 0;
    }

    // -------------------------------------------------------------
    // Categories & Tax Rates
    // -------------------------------------------------------------
    public async Task<IEnumerable<Category>> GetCategoriesAsync()
    {
        using var conn = CreateConn();
        return await conn.QueryAsync<Category>("SELECT id as Id, name as Name, record_status as RecordStatus FROM categories WHERE record_status = 0 ORDER BY id");
    }

    public async Task<Category> CreateCategoryAsync(string name)
    {
        var id = $"cat_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        using var conn = CreateConn();
        return await conn.QuerySingleAsync<Category>("INSERT INTO categories (id, name) VALUES (@Id, @Name) RETURNING id as Id, name as Name, record_status as RecordStatus", new { Id = id, Name = name });
    }

    public async Task<IEnumerable<TaxRate>> GetTaxRatesAsync()
    {
        using var conn = CreateConn();
        return await conn.QueryAsync<TaxRate>("SELECT id as Id, name as Name, igst as IGST, cgst as CGST, sgst as SGST FROM tax_rates WHERE record_status = 0 ORDER BY igst");
    }

    // -------------------------------------------------------------
    // Customers
    // -------------------------------------------------------------
    public async Task<IEnumerable<Customer>> GetCustomersAsync(string? search)
    {
        using var conn = CreateConn();
        var sql = "SELECT id as Id, name as Name, mobile_number as MobileNumber, gst_number as GstNumber, state as State, country as Country, total_visits as TotalVisits, total_spend as TotalSpend, record_status as RecordStatus, created_at as Created, updated_at as Updated FROM customers WHERE record_status = 0";
        var p = new DynamicParameters();
        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " AND (LOWER(name) LIKE @Search OR mobile_number LIKE @Search OR LOWER(COALESCE(gst_number, '')) LIKE @Search)";
            p.Add("Search", $"%{search.Trim().ToLower()}%");
        }
        sql += " ORDER BY created_at DESC";
        return await conn.QueryAsync<Customer>(sql, p);
    }

    public async Task<Customer?> GetCustomerByMobileAsync(string mobile)
    {
        var clean = new string(mobile.Where(char.IsDigit).ToArray());
        using var conn = CreateConn();
        var sql = "SELECT id as Id, name as Name, mobile_number as MobileNumber, gst_number as GstNumber, state as State, country as Country, total_visits as TotalVisits, total_spend as TotalSpend, record_status as RecordStatus, created_at as Created, updated_at as Updated FROM customers WHERE mobile_number = @Mobile AND record_status = 0 LIMIT 1";
        return await conn.QueryFirstOrDefaultAsync<Customer>(sql, new { Mobile = clean });
    }

    public async Task<Customer> CreateCustomerAsync(Customer c)
    {
        var clean = new string((c.MobileNumber ?? "").Where(char.IsDigit).ToArray());
        using var conn = CreateConn();

        var existing = await conn.QueryFirstOrDefaultAsync<Customer>(
            "SELECT id as Id, name as Name, mobile_number as MobileNumber, gst_number as GstNumber, state as State, country as Country, total_visits as TotalVisits, total_spend as TotalSpend, record_status as RecordStatus FROM customers WHERE mobile_number = @Mobile AND record_status = 0 LIMIT 1",
            new { Mobile = clean }
        );

        if (existing != null)
        {
            var updateSql = @"
                UPDATE customers
                SET name = @Name,
                    gst_number = COALESCE(@GstNumber, gst_number),
                    state = COALESCE(@State, state),
                    updated_at = NOW()
                WHERE id = @Id
                RETURNING id as Id, name as Name, mobile_number as MobileNumber, gst_number as GstNumber, state as State, country as Country, total_visits as TotalVisits, total_spend as TotalSpend, record_status as RecordStatus;
            ";
            return await conn.QuerySingleAsync<Customer>(updateSql, new {
                Name = c.Name,
                GstNumber = c.GstNumber ?? "",
                State = string.IsNullOrEmpty(c.State) ? "Maharashtra" : c.State,
                Id = existing.Id
            });
        }

        var id = $"cust_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var insertSql = @"
            INSERT INTO customers (id, name, mobile_number, gst_number, state, country, total_visits, total_spend)
            VALUES (@Id, @Name, @Mobile, @GstNumber, @State, 'India', 1, 0)
            RETURNING id as Id, name as Name, mobile_number as MobileNumber, gst_number as GstNumber, state as State, country as Country, total_visits as TotalVisits, total_spend as TotalSpend, record_status as RecordStatus;
        ";
        return await conn.QuerySingleAsync<Customer>(insertSql, new {
            Id = id,
            c.Name,
            Mobile = clean,
            GstNumber = c.GstNumber ?? "",
            State = string.IsNullOrEmpty(c.State) ? "Maharashtra" : c.State
        });
    }

    public async Task<Customer?> UpdateCustomerAsync(string id, Customer c)
    {
        using var conn = CreateConn();
        var sql = @"
            UPDATE customers
            SET name = COALESCE(@Name, name),
                mobile_number = COALESCE(@MobileNumber, mobile_number),
                gst_number = COALESCE(@GstNumber, gst_number),
                state = COALESCE(@State, state),
                updated_at = NOW()
            WHERE id = @Id
            RETURNING id as Id, name as Name, mobile_number as MobileNumber, gst_number as GstNumber, state as State, country as Country, total_visits as TotalVisits, total_spend as TotalSpend, record_status as RecordStatus;
        ";
        return await conn.QueryFirstOrDefaultAsync<Customer>(sql, new {
            Id = id,
            c.Name,
            c.MobileNumber,
            c.GstNumber,
            c.State
        });
    }

    public async Task<bool> DeleteCustomerAsync(string id)
    {
        using var conn = CreateConn();
        var rows = await conn.ExecuteAsync("UPDATE customers SET record_status = 1, updated_at = NOW() WHERE id = @Id", new { Id = id });
        return rows > 0;
    }

    // -------------------------------------------------------------
    // Invoices (Atomic with Stock Check & Decrement)
    // -------------------------------------------------------------
    public async Task<IEnumerable<Invoice>> GetInvoicesAsync(string? startDate, string? endDate, string? search, int? paymentMode)
    {
        using var conn = CreateConn();
        var sql = "SELECT id as Id, document_number as DocumentNumber, date as Date, customer_id as CustomerId, customer_name as CustomerName, mobile_number as MobileNumber, store_id as StoreId, store_name as StoreName, subtotal as Subtotal, cgst as Cgst, sgst as Sgst, igst as Igst, round_off as RoundOff, amount as Amount, mode_of_payment as ModeOfPayment, is_payment_received as IsPaymentReceived, is_share_receipt_through_sms as IsShareReceiptThroughSms, cancellation_reason as CancellationReason, record_status as RecordStatus, items as ItemsRaw FROM invoices WHERE record_status = 0";
        var p = new DynamicParameters();

        if (paymentMode.HasValue)
        {
            sql += " AND mode_of_payment = @PaymentMode";
            p.Add("PaymentMode", paymentMode.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " AND (LOWER(document_number) LIKE @Search OR LOWER(COALESCE(customer_name, '')) LIKE @Search OR COALESCE(mobile_number, '') LIKE @Search)";
            p.Add("Search", $"%{search.Trim().ToLower()}%");
        }

        sql += " ORDER BY date DESC";
        var rows = await conn.QueryAsync(sql, p);
        var result = new List<Invoice>();
        foreach (var r in rows)
        {
            var inv = new Invoice
            {
                Id = r.id,
                DocumentNumber = r.documentnumber,
                Date = (DateTime)r.date,
                CustomerId = r.customerid,
                CustomerName = r.customername ?? "Walk-in Customer",
                MobileNumber = r.mobilenumber ?? "",
                StoreId = r.storeid ?? "store_mum_01",
                StoreName = r.storename ?? "DailyMart Express",
                Subtotal = (decimal)r.subtotal,
                Cgst = (decimal)(r.cgst ?? 0),
                Sgst = (decimal)(r.sgst ?? 0),
                Igst = (decimal)(r.igst ?? 0),
                RoundOff = (decimal)(r.roundoff ?? 0),
                Amount = (decimal)r.amount,
                ModeOfPayment = (int)(r.modeofpayment ?? 0),
                IsPaymentReceived = (bool)(r.ispaymentreceived ?? false),
                IsShareReceiptThroughSms = (bool)(r.issharereceiptthroughsms ?? false),
                CancellationReason = r.cancellationreason,
                RecordStatus = (int)(r.recordstatus ?? 0)
            };
            if (r.itemsraw != null)
            {
                try
                {
                    inv.Items = JsonSerializer.Deserialize<List<InvoiceItem>>((string)r.itemsraw.ToString()) ?? new();
                }
                catch { }
            }
            result.Add(inv);
        }
        return result;
    }

    public async Task<Invoice?> GetInvoiceByIdAsync(string id)
    {
        using var conn = CreateConn();
        var sql = "SELECT id as Id, document_number as DocumentNumber, date as Date, customer_id as CustomerId, customer_name as CustomerName, mobile_number as MobileNumber, store_id as StoreId, store_name as StoreName, subtotal as Subtotal, cgst as Cgst, sgst as Sgst, igst as Igst, round_off as RoundOff, amount as Amount, mode_of_payment as ModeOfPayment, is_payment_received as IsPaymentReceived, is_share_receipt_through_sms as IsShareReceiptThroughSms, cancellation_reason as CancellationReason, record_status as RecordStatus, items as ItemsRaw FROM invoices WHERE id = @Id LIMIT 1";
        var r = await conn.QueryFirstOrDefaultAsync(sql, new { Id = id });
        if (r == null) return null;

        var inv = new Invoice
        {
            Id = r.id,
            DocumentNumber = r.documentnumber,
            Date = (DateTime)r.date,
            CustomerId = r.customerid,
            CustomerName = r.customername ?? "Walk-in Customer",
            MobileNumber = r.mobilenumber ?? "",
            StoreId = r.storeid ?? "store_mum_01",
            StoreName = r.storename ?? "DailyMart Express",
            Subtotal = (decimal)r.subtotal,
            Cgst = (decimal)(r.cgst ?? 0),
            Sgst = (decimal)(r.sgst ?? 0),
            Igst = (decimal)(r.igst ?? 0),
            RoundOff = (decimal)(r.roundoff ?? 0),
            Amount = (decimal)r.amount,
            ModeOfPayment = (int)(r.modeofpayment ?? 0),
            IsPaymentReceived = (bool)(r.ispaymentreceived ?? false),
            IsShareReceiptThroughSms = (bool)(r.issharereceiptthroughsms ?? false),
            CancellationReason = r.cancellationreason,
            RecordStatus = (int)(r.recordstatus ?? 0)
        };
        if (r.itemsraw != null)
        {
            try { inv.Items = JsonSerializer.Deserialize<List<InvoiceItem>>((string)r.itemsraw.ToString()) ?? new(); } catch { }
        }
        inv.Store = await GetStoreProfileAsync();
        return inv;
    }

    public async Task<Invoice> CreateInvoiceAsync(CartDto cart, Store? activeStore)
    {
        if (cart.Items == null || cart.Items.Count == 0)
            throw new InvalidOperationException("Cannot generate invoice for an empty cart.");

        using var conn = (NpgsqlConnection)CreateConn();
        await conn.OpenAsync();
        using var tx = await conn.BeginTransactionAsync();

        try
        {
            var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM invoices", transaction: tx);
            var sequence = 101 + count;
            var documentNumber = $"INV-2627-{sequence:D6}";
            var id = $"inv_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";

            var storeState = (activeStore?.State ?? "Maharashtra").ToLower();
            var customerState = (cart.Customer?.State ?? "Maharashtra").ToLower();
            var isInterState = storeState != customerState;

            var invoiceItems = new List<InvoiceItem>();

            foreach (var item in cart.Items)
            {
                var rate = item.Rate ?? item.Cost ?? 0;
                var qty = item.Quantity > 0 ? item.Quantity : 1;
                var taxPct = item.TaxPercent ?? 5;
                var lineSubtotal = rate * qty;
                decimal cgst = 0, sgst = 0, igst = 0;

                if (isInterState)
                {
                    igst = Math.Round((lineSubtotal * taxPct) / 100m, 2);
                }
                else
                {
                    cgst = Math.Round((lineSubtotal * (taxPct / 2m)) / 100m, 2);
                    sgst = Math.Round((lineSubtotal * (taxPct / 2m)) / 100m, 2);
                }

                var lineTotal = lineSubtotal + cgst + sgst + igst;
                var pId = item.Id ?? "";
                var pNum = item.ProductNumber ?? item.Id ?? "";

                // 1. Stock check
                var stockRow = await conn.QueryFirstOrDefaultAsync(
                    "SELECT id, name, stock_quantity FROM products WHERE (id = @Id OR product_number = @Id OR id = @PNum OR product_number = @PNum) AND record_status = 0 LIMIT 1",
                    new { Id = pId, PNum = pNum },
                    transaction: tx
                );

                if (stockRow != null)
                {
                    int avail = stockRow.stock_quantity ?? 0;
                    if (avail <= 0)
                        throw new InvalidOperationException($"Item \"{stockRow.name}\" is out of stock in inventory.");
                    if (qty > avail)
                        throw new InvalidOperationException($"Cannot checkout {qty} unit(s) of \"{stockRow.name}\". Only {avail} available in inventory.");
                }

                // 2. Decrement stock
                await conn.ExecuteAsync(@"
                    UPDATE products
                    SET stock_quantity = GREATEST(0, stock_quantity - @Qty), updated_at = NOW()
                    WHERE id = @Id OR product_number = @Id OR id = @PNum OR product_number = @PNum
                ", new { Qty = qty, Id = pId, PNum = pNum }, transaction: tx);

                invoiceItems.Add(new InvoiceItem
                {
                    ProductId = pId,
                    ProductNumber = pNum,
                    ProductName = item.Name ?? "Product",
                    Quantity = qty,
                    Rate = rate,
                    TaxPercent = taxPct,
                    Subtotal = lineSubtotal,
                    Cgst = cgst,
                    Sgst = sgst,
                    Igst = igst,
                    Total = lineTotal
                });
            }

            // Customer visits/spend update
            if (!string.IsNullOrWhiteSpace(cart.Customer?.MobileNumber))
            {
                var cleanMobile = new string(cart.Customer.MobileNumber.Where(char.IsDigit).ToArray());
                var custId = await conn.ExecuteScalarAsync<string>("SELECT id FROM customers WHERE mobile_number = @Mobile", new { Mobile = cleanMobile }, transaction: tx);
                if (custId != null)
                {
                    await conn.ExecuteAsync("UPDATE customers SET total_visits = total_visits + 1, total_spend = total_spend + @Amt, updated_at = NOW() WHERE id = @Id", new { Amt = cart.GrandTotal, Id = custId }, transaction: tx);
                }
                else if (cleanMobile.Length == 10)
                {
                    await conn.ExecuteAsync("INSERT INTO customers (id, name, mobile_number, gst_number, state, country, total_visits, total_spend) VALUES (@Id, @Name, @Mobile, @Gst, @State, 'India', 1, @Amt)", new {
                        Id = $"cust_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                        Name = cart.Customer.Name ?? "Customer",
                        Mobile = cleanMobile,
                        Gst = cart.Customer.Gstin ?? "",
                        State = cart.Customer.State ?? "Maharashtra",
                        Amt = cart.GrandTotal
                    }, transaction: tx);
                }
            }

            // Insert invoice
            var itemsJson = JsonSerializer.Serialize(invoiceItems);
            var insertSql = @"
                INSERT INTO invoices (
                    id, document_number, date, customer_id, customer_name, mobile_number,
                    store_id, store_name, subtotal, cgst, sgst, igst, round_off, amount,
                    mode_of_payment, is_payment_received, is_share_receipt_through_sms,
                    items, created_id, updated_id
                ) VALUES (
                    @Id, @DocNum, NOW(), @CustomerId, @CustomerName, @MobileNumber,
                    @StoreId, @StoreName, @Subtotal, @Cgst, @Sgst, @Igst, @RoundOff, @Amount,
                    @ModeOfPayment, @IsPaymentReceived, @IsShare,
                    @Items::jsonb, 'user_01', 'user_01'
                ) RETURNING date;
            ";

            var invDate = await conn.ExecuteScalarAsync<DateTime>(insertSql, new {
                Id = id,
                DocNum = documentNumber,
                CustomerId = cart.Customer?.Id,
                CustomerName = cart.Customer?.Name ?? "Walk-in Customer",
                MobileNumber = cart.Customer?.MobileNumber ?? "",
                StoreId = activeStore?.Id ?? "store_mum_01",
                StoreName = activeStore?.Name ?? "DailyMart Express",
                cart.Subtotal,
                cart.Cgst,
                cart.Sgst,
                cart.Igst,
                cart.RoundOff,
                Amount = cart.GrandTotal,
                ModeOfPayment = cart.PaymentMode,
                cart.IsPaymentReceived,
                IsShare = cart.SendWhatsApp,
                Items = itemsJson
            }, transaction: tx);

            await tx.CommitAsync();

            return new Invoice
            {
                Id = id,
                DocumentNumber = documentNumber,
                Date = invDate,
                CustomerId = cart.Customer?.Id,
                CustomerName = cart.Customer?.Name ?? "Walk-in Customer",
                MobileNumber = cart.Customer?.MobileNumber ?? "",
                StoreId = activeStore?.Id ?? "store_mum_01",
                StoreName = activeStore?.Name ?? "DailyMart Express",
                Subtotal = cart.Subtotal,
                Cgst = cart.Cgst,
                Sgst = cart.Sgst,
                Igst = cart.Igst,
                RoundOff = cart.RoundOff,
                Amount = cart.GrandTotal,
                ModeOfPayment = cart.PaymentMode,
                IsPaymentReceived = cart.IsPaymentReceived,
                IsShareReceiptThroughSms = cart.SendWhatsApp,
                Items = invoiceItems
            };
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<Invoice?> CancelInvoiceAsync(string id, string? reason)
    {
        using var conn = (NpgsqlConnection)CreateConn();
        await conn.OpenAsync();
        using var tx = await conn.BeginTransactionAsync();
        try
        {
            var invRow = await conn.QueryFirstOrDefaultAsync(
                "SELECT id, document_number, items, record_status FROM invoices WHERE id = @Id",
                new { Id = id },
                transaction: tx
            );
            if (invRow == null) return null;
            if (invRow.record_status == 1) return await GetInvoiceByIdAsync(id);

            // Restore stock
            if (invRow.items != null)
            {
                try
                {
                    var items = JsonSerializer.Deserialize<List<InvoiceItem>>((string)invRow.items.ToString()) ?? new();
                    foreach (var itm in items)
                    {
                        await conn.ExecuteAsync(@"
                            UPDATE products
                            SET stock_quantity = stock_quantity + @Qty, updated_at = NOW()
                            WHERE id = @Id OR product_number = @Id OR id = @PNum OR product_number = @PNum
                        ", new { Qty = itm.Quantity, Id = itm.ProductId, PNum = itm.ProductNumber }, transaction: tx);
                    }
                }
                catch { }
            }

            await conn.ExecuteAsync(
                "UPDATE invoices SET record_status = 1, cancellation_reason = @Reason, updated_at = NOW() WHERE id = @Id",
                new { Reason = reason ?? "Customer cancellation", Id = id },
                transaction: tx
            );

            await tx.CommitAsync();
            return await GetInvoiceByIdAsync(id);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // -------------------------------------------------------------
    // Store Profile
    // -------------------------------------------------------------
    public async Task<Store> GetStoreProfileAsync()
    {
        using var conn = CreateConn();
        var sql = "SELECT id as Id, name as Name, long_name as LongName, address as Address, mobile_number as MobileNumber, phone_number as PhoneNumber, email as Email, food_license_number as FoodLicenseNumber, gst_number as GstNumber, country as Country, state as State, invoice_prefix as InvoicePrefix, receipt_footer_text as ReceiptFooterText, paper_size as PaperSize, enable_whatsapp_receipt as EnableWhatsAppReceipt, record_status as RecordStatus FROM stores LIMIT 1";
        var store = await conn.QueryFirstOrDefaultAsync<Store>(sql);
        return store ?? new Store
        {
            Id = "store_mum_01",
            Name = "DailyMart Express",
            Address = "Plot 12, Commercial Hub, MG Road, Mumbai, Maharashtra 400001",
            MobileNumber = "9876543210",
            Email = "billing@dailymart.in",
            GstNumber = "27AABCU9603R1ZM",
            State = "Maharashtra",
            PaperSize = "80mm"
        };
    }

    public async Task<Store> UpdateStoreProfileAsync(Store s)
    {
        using var conn = CreateConn();
        var sql = @"
            UPDATE stores
            SET name = COALESCE(@Name, name),
                long_name = COALESCE(@LongName, long_name),
                address = COALESCE(@Address, address),
                mobile_number = COALESCE(@MobileNumber, mobile_number),
                email = COALESCE(@Email, email),
                gst_number = COALESCE(@GstNumber, gst_number),
                food_license_number = COALESCE(@FoodLicenseNumber, food_license_number),
                state = COALESCE(@State, state),
                receipt_footer_text = COALESCE(@ReceiptFooterText, receipt_footer_text),
                paper_size = COALESCE(@PaperSize, paper_size),
                updated_at = NOW()
            WHERE id = @Id
            RETURNING id as Id, name as Name, long_name as LongName, address as Address, mobile_number as MobileNumber, phone_number as PhoneNumber, email as Email, food_license_number as FoodLicenseNumber, gst_number as GstNumber, country as Country, state as State, invoice_prefix as InvoicePrefix, receipt_footer_text as ReceiptFooterText, paper_size as PaperSize, enable_whatsapp_receipt as EnableWhatsAppReceipt, record_status as RecordStatus;
        ";
        return await conn.QuerySingleAsync<Store>(sql, new {
            s.Name,
            s.LongName,
            s.Address,
            s.MobileNumber,
            s.Email,
            s.GstNumber,
            s.FoodLicenseNumber,
            s.State,
            s.ReceiptFooterText,
            s.PaperSize,
            Id = string.IsNullOrEmpty(s.Id) ? "store_mum_01" : s.Id
        });
    }

    // -------------------------------------------------------------
    // Vendors
    // -------------------------------------------------------------
    public async Task<IEnumerable<Vendor>> GetVendorsAsync(string? search)
    {
        using var conn = CreateConn();
        var sql = "SELECT id as Id, vendor_code as VendorCode, name as Name, address as Address, city as City, pin as Pin, email as Email, mobile_number as MobileNumber, note as Note, record_status as RecordStatus FROM vendors WHERE record_status = 0";
        var p = new DynamicParameters();
        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " AND (LOWER(name) LIKE @Search OR LOWER(vendor_code) LIKE @Search)";
            p.Add("Search", $"%{search.Trim().ToLower()}%");
        }
        return await conn.QueryAsync<Vendor>(sql, p);
    }

    public async Task<Vendor> CreateVendorAsync(Vendor v)
    {
        var id = $"ven_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var code = string.IsNullOrWhiteSpace(v.VendorCode) ? $"VEN-00{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString()[^3..]}" : v.VendorCode;
        using var conn = CreateConn();
        var sql = @"
            INSERT INTO vendors (id, vendor_code, name, address, city, pin, email, mobile_number, note)
            VALUES (@Id, @Code, @Name, @Address, @City, @Pin, @Email, @Mobile, @Note)
            RETURNING id as Id, vendor_code as VendorCode, name as Name, address as Address, city as City, pin as Pin, email as Email, mobile_number as MobileNumber, note as Note, record_status as RecordStatus;
        ";
        return await conn.QuerySingleAsync<Vendor>(sql, new {
            Id = id,
            Code = code,
            v.Name,
            Address = v.Address ?? "",
            City = v.City ?? "",
            Pin = v.Pin ?? "",
            Email = v.Email ?? "",
            Mobile = v.MobileNumber ?? "",
            Note = v.Note ?? ""
        });
    }

    // -------------------------------------------------------------
    // Purchase Orders
    // -------------------------------------------------------------
    public async Task<IEnumerable<dynamic>> GetPurchaseOrdersAsync()
    {
        using var conn = CreateConn();
        var sql = "SELECT id as \"Id\", document_number as \"DocumentNumber\", vendor_id as \"VendorId\", vendor_name as \"VendorName\", date as \"Date\", status as \"Status\", total_amount as \"TotalAmount\", items as \"Items\" FROM purchase_orders WHERE record_status = 0 ORDER BY created_at DESC";
        return await conn.QueryAsync(sql);
    }

    public async Task<dynamic> CreatePurchaseOrderAsync(dynamic po)
    {
        var id = $"po_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var docNum = $"PO-2627-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString()[^4..]}";
        using var conn = CreateConn();
        var sql = @"
            INSERT INTO purchase_orders (id, document_number, vendor_id, vendor_name, store_id, total_amount, items)
            VALUES (@Id, @DocNum, @VendorId, @VendorName, 'store_mum_01', @Total, @Items::jsonb)
            RETURNING id as ""Id"", document_number as ""DocumentNumber"", vendor_id as ""VendorId"", vendor_name as ""VendorName"", status as ""Status"", total_amount as ""TotalAmount"";
        ";
        return await conn.QuerySingleAsync(sql, new {
            Id = id,
            DocNum = docNum,
            VendorId = (string)(po.VendorId ?? "ven_01"),
            VendorName = (string)(po.VendorName ?? "Supplier"),
            Total = (decimal)(po.TotalAmount ?? 0),
            Items = JsonSerializer.Serialize(po.Items ?? new object[] { })
        });
    }

    // -------------------------------------------------------------
    // Material Inward
    // -------------------------------------------------------------
    public async Task<IEnumerable<dynamic>> GetMaterialInwardAsync()
    {
        using var conn = CreateConn();
        var sql = "SELECT id as \"Id\", purchase_order_id as \"PurchaseOrderId\", vendor_id as \"VendorId\", vendor_name as \"VendorName\", date as \"Date\", is_po_available as \"IsPoAvailable\", items as \"Items\" FROM material_inward WHERE record_status = 0 ORDER BY created_at DESC";
        return await conn.QueryAsync(sql);
    }

    public async Task<dynamic> CreateMaterialInwardAsync(JsonElement data)
    {
        var id = $"inw_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        using var conn = (NpgsqlConnection)CreateConn();
        await conn.OpenAsync();
        using var tx = await conn.BeginTransactionAsync();

        try
        {
            var vendorId = data.TryGetProperty("VendorId", out var vId) ? vId.GetString() : "ven_01";
            var vendorName = data.TryGetProperty("VendorName", out var vNm) ? vNm.GetString() : "Supplier";
            var poId = data.TryGetProperty("PurchaseOrderId", out var pId) ? pId.GetString() : null;
            var isPo = data.TryGetProperty("IsPoAvailable", out var ip) && ip.GetBoolean();

            if (data.TryGetProperty("Items", out var itemsArray) && itemsArray.ValueKind == JsonValueKind.Array)
            {
                foreach (var itm in itemsArray.EnumerateArray())
                {
                    var prodId = itm.TryGetProperty("ProductId", out var pid) ? pid.GetString() : "";
                    var barcode = itm.TryGetProperty("Barcode", out var bc) ? bc.GetString() : "";
                    var receivedQty = itm.TryGetProperty("ReceivedQty", out var rq) ? rq.GetInt32() : 0;

                    await conn.ExecuteAsync(@"
                        UPDATE products
                        SET stock_quantity = stock_quantity + @Qty, updated_at = NOW()
                        WHERE id = @Id OR product_number = @Id OR id = @Bc OR product_number = @Bc
                    ", new { Qty = receivedQty, Id = prodId, Bc = barcode }, transaction: tx);
                }
            }

            var sql = @"
                INSERT INTO material_inward (id, purchase_order_id, vendor_id, vendor_name, is_po_available, items)
                VALUES (@Id, @PoId, @VendorId, @VendorName, @IsPo, @Items::jsonb)
                RETURNING id as ""Id"", date as ""Date"";
            ";
            var res = await conn.QuerySingleAsync(sql, new {
                Id = id,
                PoId = poId,
                VendorId = vendorId,
                VendorName = vendorName,
                IsPo = isPo,
                Items = data.GetProperty("Items").GetRawText()
            }, transaction: tx);

            await tx.CommitAsync();
            return res;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // -------------------------------------------------------------
    // Material Returns
    // -------------------------------------------------------------
    public async Task<IEnumerable<dynamic>> GetReturnReasonsAsync()
    {
        using var conn = CreateConn();
        return await conn.QueryAsync("SELECT id as \"Id\", name as \"Name\" FROM return_reasons");
    }

    public async Task<IEnumerable<dynamic>> GetMaterialReturnsAsync()
    {
        using var conn = CreateConn();
        return await conn.QueryAsync("SELECT id as \"Id\", debit_note_number as \"DebitNoteNumber\", vendor_id as \"VendorId\", vendor_name as \"VendorName\", date as \"Date\", total_amount as \"TotalAmount\", items as \"Items\" FROM material_returns WHERE record_status = 0 ORDER BY created_at DESC");
    }

    public async Task<dynamic> CreateMaterialReturnAsync(JsonElement data)
    {
        var id = $"ret_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var dn = $"DN-2627-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString()[^4..]}";

        using var conn = (NpgsqlConnection)CreateConn();
        await conn.OpenAsync();
        using var tx = await conn.BeginTransactionAsync();

        try
        {
            var vendorId = data.TryGetProperty("VendorId", out var vId) ? vId.GetString() : "ven_01";
            var vendorName = data.TryGetProperty("VendorName", out var vNm) ? vNm.GetString() : "Supplier";
            var totalAmt = data.TryGetProperty("TotalAmount", out var ta) ? ta.GetDecimal() : 0;

            if (data.TryGetProperty("Items", out var itemsArray) && itemsArray.ValueKind == JsonValueKind.Array)
            {
                foreach (var itm in itemsArray.EnumerateArray())
                {
                    var prodId = itm.TryGetProperty("ProductId", out var pid) ? pid.GetString() : "";
                    var returnQty = itm.TryGetProperty("ReturnQty", out var rq) ? rq.GetInt32() : 0;

                    await conn.ExecuteAsync(@"
                        UPDATE products
                        SET stock_quantity = GREATEST(0, stock_quantity - @Qty), updated_at = NOW()
                        WHERE id = @Id OR product_number = @Id
                    ", new { Qty = returnQty, Id = prodId }, transaction: tx);
                }
            }

            var sql = @"
                INSERT INTO material_returns (id, debit_note_number, vendor_id, vendor_name, total_amount, items)
                VALUES (@Id, @Dn, @VendorId, @VendorName, @Total, @Items::jsonb)
                RETURNING id as ""Id"", debit_note_number as ""DebitNoteNumber"", date as ""Date"", total_amount as ""TotalAmount"";
            ";
            var res = await conn.QuerySingleAsync(sql, new {
                Id = id,
                Dn = dn,
                VendorId = vendorId,
                VendorName = vendorName,
                Total = totalAmt,
                Items = data.GetProperty("Items").GetRawText()
            }, transaction: tx);

            await tx.CommitAsync();
            return res;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // -------------------------------------------------------------
    // Reports & Dashboard KPIs
    // -------------------------------------------------------------
    public async Task<dynamic> GetDashboardKpisAsync()
    {
        using var conn = CreateConn();
        var sales = await conn.QueryAsync<decimal>("SELECT amount FROM invoices WHERE record_status = 0");
        var totalSales = sales.Sum();
        var invoiceCount = sales.Count();

        var products = (await conn.QueryAsync<(bool IsExpDate, int? Days, int StockQuantity)>("SELECT is_exp_date as IsExpDate, days as Days, stock_quantity as StockQuantity FROM products WHERE record_status = 0")).ToList();
        var lowStockCount = products.Count(p => p.StockQuantity < 20);
        var expiredCount = products.Count(p => p.IsExpDate && p.Days.HasValue && p.Days.Value <= 0);

        var recentInvoices = (await GetInvoicesAsync(null, null, null, null)).Take(5);

        return new
        {
            totalSales,
            invoiceCount,
            lowStockCount,
            expiredCount,
            recentInvoices
        };
    }

    public async Task<dynamic> GetDailySalesReportAsync(string? targetDate)
    {
        var dateStr = string.IsNullOrWhiteSpace(targetDate) ? DateTime.UtcNow.ToString("yyyy-MM-dd") : targetDate;
        using var conn = CreateConn();
        var invoices = (await GetInvoicesAsync(null, null, null, null))
            .Where(i => i.Date.ToString("yyyy-MM-dd") == dateStr)
            .ToList();

        var cashTotal = invoices.Where(i => i.ModeOfPayment == 0).Sum(i => i.Amount);
        var upiTotal = invoices.Where(i => i.ModeOfPayment == 1).Sum(i => i.Amount);
        var totalTax = invoices.Sum(i => i.Cgst + i.Sgst + i.Igst);

        return new
        {
            date = dateStr,
            summary = new
            {
                totalInvoices = invoices.Count,
                grossSales = cashTotal + upiTotal,
                cashSales = cashTotal,
                upiSales = upiTotal,
                taxCollected = totalTax
            },
            invoices
        };
    }

    // -------------------------------------------------------------
    // Users & Roles
    // -------------------------------------------------------------
    public async Task<IEnumerable<UserDto>> GetUsersAsync()
    {
        using var conn = CreateConn();
        var sql = "SELECT id as Id, name as Name, email as Email, role as Role, store as Store, status as Status, last_login as LastLogin FROM users WHERE record_status = 0 ORDER BY created_at";
        return await conn.QueryAsync<UserDto>(sql);
    }

    public async Task<UserDto> CreateUserAsync(UserDto u)
    {
        var id = $"user_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        using var conn = CreateConn();
        var sql = @"
            INSERT INTO users (id, name, email, role, store, status, last_login)
            VALUES (@Id, @Name, @Email, @Role, @Store, 'Active', 'Never')
            RETURNING id as Id, name as Name, email as Email, role as Role, store as Store, status as Status, last_login as LastLogin;
        ";
        return await conn.QuerySingleAsync<UserDto>(sql, new {
            Id = id,
            u.Name,
            u.Email,
            Role = string.IsNullOrEmpty(u.Role) ? "Cashier" : u.Role,
            Store = string.IsNullOrEmpty(u.Store) ? "DailyMart Express (Mumbai)" : u.Store
        });
    }

    public async Task<bool> DeleteUserAsync(string id)
    {
        using var conn = CreateConn();
        var rows = await conn.ExecuteAsync("UPDATE users SET record_status = 1, updated_at = NOW() WHERE id = @Id", new { Id = id });
        return rows > 0;
    }

    public async Task<IEnumerable<dynamic>> GetPermissionsMatrixAsync()
    {
        using var conn = CreateConn();
        return await conn.QueryAsync("SELECT module as \"module\", admin_perm as \"admin\", cashier_perm as \"cashier\", inventory_perm as \"inventory\" FROM permissions_matrix ORDER BY id");
    }

    public async Task<bool> UpdatePermissionAsync(string module, string role, string action, bool val)
    {
        using var conn = CreateConn();
        var col = role == "admin" ? "admin_perm" : (role == "cashier" ? "cashier_perm" : "inventory_perm");
        // Update jsonb value in PostgreSQL
        var sql = $"UPDATE permissions_matrix SET {col} = jsonb_set({col}, ARRAY['{action}'], to_jsonb(@Val)) WHERE module = @Module";
        await conn.ExecuteAsync(sql, new { Val = val, Module = module });
        return true;
    }
}
