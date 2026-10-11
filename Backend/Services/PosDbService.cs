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
        var sql = @"SELECT p.id as Id, p.product_number as ProductNumber, p.name as Name, p.cost as Cost, 
                           COALESCE(p.unit, 'PCS') as Unit, p.ingredients as Ingredients, p.notes as Notes, 
                           p.is_exp_date as IsExpDate, p.days as Days, p.category_id as CategoryId, 
                           COALESCE(c.name, p.category_id) as CategoryName, p.tax_rate_id as TaxRateId, 
                           p.tax_percent as TaxPercent, p.stock_quantity as StockQuantity, 
                           p.record_status as RecordStatus, p.created_at as Created, p.updated_at as Updated 
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE p.record_status = 0";
        var p = new DynamicParameters();

        if (!string.IsNullOrEmpty(categoryId) && categoryId != "cat_all")
        {
            sql += " AND p.category_id = @CategoryId";
            p.Add("CategoryId", categoryId);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            sql += " AND (LOWER(p.name) LIKE @Search OR LOWER(p.product_number) LIKE @Search OR LOWER(COALESCE(p.ingredients, '')) LIKE @Search)";
            p.Add("Search", $"%{searchTerm.Trim().ToLower()}%");
        }

        sql += " ORDER BY p.created_at DESC";
        return await conn.QueryAsync<Product>(sql, p);
    }

    public async Task<Product?> GetProductByIdAsync(string id)
    {
        using var conn = CreateConn();
        var sql = @"SELECT p.id as Id, p.product_number as ProductNumber, p.name as Name, p.cost as Cost, 
                           COALESCE(p.unit, 'PCS') as Unit, p.ingredients as Ingredients, p.notes as Notes, 
                           p.is_exp_date as IsExpDate, p.days as Days, p.category_id as CategoryId, 
                           COALESCE(c.name, p.category_id) as CategoryName, p.tax_rate_id as TaxRateId, 
                           p.tax_percent as TaxPercent, p.stock_quantity as StockQuantity, 
                           p.record_status as RecordStatus, p.created_at as Created, p.updated_at as Updated 
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE p.id = @Id AND p.record_status = 0";
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
        var sql = @"SELECT p.id as Id, p.product_number as ProductNumber, p.name as Name, p.cost as Cost, 
                           COALESCE(p.unit, 'PCS') as Unit, p.ingredients as Ingredients, p.notes as Notes, 
                           p.is_exp_date as IsExpDate, p.days as Days, p.category_id as CategoryId, 
                           COALESCE(c.name, p.category_id) as CategoryName, p.tax_rate_id as TaxRateId, 
                           p.tax_percent as TaxPercent, p.stock_quantity as StockQuantity, 
                           p.record_status as RecordStatus, p.created_at as Created, p.updated_at as Updated 
                    FROM products p
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE (p.product_number = @Code OR p.id = @Code OR LOWER(p.product_number) = LOWER(@Code)) 
                      AND p.record_status = 0 LIMIT 1";
        return await conn.QueryFirstOrDefaultAsync<Product>(sql, new { Code = clean });
    }

    public async Task<Product> CreateProductAsync(Product p)
    {
        var id = $"prd_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var pNum = string.IsNullOrWhiteSpace(p.ProductNumber) ? $"200100{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString()[^6..]}" : p.ProductNumber;
        
        var taxRateId = p.TaxRateId;
        if (string.IsNullOrEmpty(taxRateId))
        {
            taxRateId = p.TaxPercent switch
            {
                0 => "tax_0",
                5 => "tax_5",
                12 => "tax_12",
                18 => "tax_18",
                28 => "tax_28",
                _ => "tax_5"
            };
        }

        using var conn = CreateConn();
        var sql = @"
            INSERT INTO products (id, product_number, name, cost, unit, ingredients, notes, is_exp_date, days, category_id, tax_rate_id, tax_percent, stock_quantity, record_status, created_id, updated_id)
            VALUES (@Id, @ProductNumber, @Name, @Cost, COALESCE(@Unit, 'PCS'), @Ingredients, @Notes, @IsExpDate, @Days, @CategoryId, @TaxRateId, @TaxPercent, @StockQuantity, 0, 'user_01', 'user_01')
            RETURNING id as Id, product_number as ProductNumber, name as Name, cost as Cost, COALESCE(unit, 'PCS') as Unit, ingredients as Ingredients, notes as Notes, is_exp_date as IsExpDate, days as Days, category_id as CategoryId, tax_rate_id as TaxRateId, tax_percent as TaxPercent, stock_quantity as StockQuantity, record_status as RecordStatus, created_at as Created, updated_at as Updated;
        ";
        return await conn.QuerySingleAsync<Product>(sql, new {
            Id = id,
            ProductNumber = pNum,
            p.Name,
            p.Cost,
            Unit = string.IsNullOrWhiteSpace(p.Unit) ? "PCS" : p.Unit.ToUpper(),
            Ingredients = p.Ingredients ?? "",
            Notes = p.Notes ?? "",
            p.IsExpDate,
            Days = p.IsExpDate ? p.Days : null,
            CategoryId = string.IsNullOrEmpty(p.CategoryId) ? "cat_dairy" : p.CategoryId,
            TaxRateId = taxRateId,
            TaxPercent = p.TaxPercent,
            StockQuantity = p.StockQuantity >= 0 ? p.StockQuantity : 0
        });
    }

    public async Task<Product?> UpdateProductAsync(string id, Product p)
    {
        var taxRateId = p.TaxRateId;
        if (string.IsNullOrEmpty(taxRateId))
        {
            taxRateId = p.TaxPercent switch
            {
                0 => "tax_0",
                5 => "tax_5",
                12 => "tax_12",
                18 => "tax_18",
                28 => "tax_28",
                _ => "tax_5"
            };
        }

        using var conn = CreateConn();
        var sql = @"
            UPDATE products
            SET name = COALESCE(@Name, name),
                cost = COALESCE(@Cost, cost),
                unit = COALESCE(@Unit, unit),
                ingredients = COALESCE(@Ingredients, ingredients),
                notes = COALESCE(@Notes, notes),
                is_exp_date = @IsExpDate,
                days = @Days,
                category_id = COALESCE(@CategoryId, category_id),
                tax_rate_id = COALESCE(@TaxRateId, tax_rate_id),
                tax_percent = COALESCE(@TaxPercent, tax_percent),
                stock_quantity = COALESCE(@StockQuantity, stock_quantity),
                product_number = COALESCE(@ProductNumber, product_number),
                updated_at = NOW()
            WHERE id = @Id
            RETURNING id as Id, product_number as ProductNumber, name as Name, cost as Cost, COALESCE(unit, 'PCS') as Unit, ingredients as Ingredients, notes as Notes, is_exp_date as IsExpDate, days as Days, category_id as CategoryId, tax_rate_id as TaxRateId, tax_percent as TaxPercent, stock_quantity as StockQuantity, record_status as RecordStatus, created_at as Created, updated_at as Updated;
        ";
        return await conn.QueryFirstOrDefaultAsync<Product>(sql, new {
            Id = id,
            p.Name,
            p.Cost,
            Unit = string.IsNullOrWhiteSpace(p.Unit) ? null : p.Unit.ToUpper(),
            p.Ingredients,
            p.Notes,
            p.IsExpDate,
            Days = p.IsExpDate ? p.Days : null,
            p.CategoryId,
            TaxRateId = taxRateId,
            p.TaxPercent,
            p.StockQuantity,
            ProductNumber = string.IsNullOrWhiteSpace(p.ProductNumber) ? null : p.ProductNumber
        });
    }

    public async Task<bool> DeleteProductAsync(string id)
    {
        using var conn = CreateConn();
        var rows = await conn.ExecuteAsync("UPDATE products SET record_status = 1, updated_at = NOW() WHERE id = @Id", new { Id = id });
        return rows > 0;
    }

    public async Task<object> GetProductStatsAsync()
    {
        using var conn = CreateConn();
        var sql = @"
            SELECT 
                COUNT(*) as totalproducts,
                COUNT(CASE WHEN stock_quantity <= 15 THEN 1 END) as lowstockcount,
                COUNT(CASE WHEN is_exp_date = true THEN 1 END) as perishablecount,
                COALESCE(SUM(stock_quantity), 0) as totalstockunits,
                COALESCE(SUM(cost * stock_quantity), 0) as totalvaluation
            FROM products 
            WHERE record_status = 0;
        ";
        var row = await conn.QueryFirstOrDefaultAsync(sql);
        int totalProducts = row != null ? (int)(row.totalproducts ?? 0) : 0;
        int lowStockCount = row != null ? (int)(row.lowstockcount ?? 0) : 0;
        int perishableCount = row != null ? (int)(row.perishablecount ?? 0) : 0;
        decimal totalStockUnits = row != null ? (decimal)(row.totalstockunits ?? 0) : 0m;
        decimal totalValuation = row != null ? (decimal)(row.totalvaluation ?? 0) : 0m;

        return new
        {
            TotalProducts = totalProducts,
            LowStockCount = lowStockCount,
            PerishableCount = perishableCount,
            TotalStockUnits = totalStockUnits,
            TotalValuation = totalValuation
        };
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

    public async Task<TaxRate> CreateTaxRateAsync(TaxRate t)
    {
        using var conn = CreateConn();
        var id = string.IsNullOrEmpty(t.Id) ? $"tax_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}" : t.Id;
        var cgst = t.CGST > 0 ? t.CGST : (t.IGST / 2m);
        var sgst = t.SGST > 0 ? t.SGST : (t.IGST / 2m);
        var sql = "INSERT INTO tax_rates (id, name, igst, cgst, sgst) VALUES (@Id, @Name, @IGST, @CGST, @SGST) RETURNING id as Id, name as Name, igst as IGST, cgst as CGST, sgst as SGST";
        return await conn.QuerySingleAsync<TaxRate>(sql, new { Id = id, t.Name, t.IGST, CGST = cgst, SGST = sgst });
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

    public async Task<Customer?> GetCustomerByIdAsync(string id)
    {
        using var conn = CreateConn();
        var sql = "SELECT id as Id, name as Name, mobile_number as MobileNumber, gst_number as GstNumber, state as State, country as Country, total_visits as TotalVisits, total_spend as TotalSpend, record_status as RecordStatus, created_at as Created, updated_at as Updated FROM customers WHERE id = @Id AND record_status = 0 LIMIT 1";
        return await conn.QueryFirstOrDefaultAsync<Customer>(sql, new { Id = id });
    }

    public async Task<object> GetCustomerStatsAsync()
    {
        using var conn = CreateConn();
        var sql = @"
            SELECT 
                COUNT(*) FILTER (WHERE record_status = 0) AS TotalCustomers,
                COUNT(*) FILTER (WHERE record_status = 0 AND gst_number IS NOT NULL AND TRIM(gst_number) <> '') AS B2bClients,
                COALESCE(SUM(total_visits) FILTER (WHERE record_status = 0), 0) AS TotalVisits,
                COALESCE(SUM(total_spend) FILTER (WHERE record_status = 0), 0) AS CumulativeRevenue
            FROM customers;
        ";
        var stats = await conn.QueryFirstOrDefaultAsync<dynamic>(sql);
        return new
        {
            totalCustomers = (long)(stats?.totalcustomers ?? 0),
            b2bClients = (long)(stats?.b2bclients ?? 0),
            totalVisits = (long)(stats?.totalvisits ?? 0),
            cumulativeRevenue = (decimal)(stats?.cumulativerevenue ?? 0m)
        };
    }

    public async Task<IEnumerable<dynamic>> GetCustomerInvoicesAsync(string customerId, string? mobile)
    {
        using var conn = CreateConn();
        var cleanMobile = new string((mobile ?? "").Where(char.IsDigit).ToArray());
        var sql = @"
            SELECT id as Id, document_number as DocumentNumber, date as Date, amount as Amount, 
                   mode_of_payment as ModeOfPayment, record_status as RecordStatus
            FROM invoices 
            WHERE (customer_id = @CustomerId OR (mobile_number = @Mobile AND @Mobile <> ''))
            ORDER BY date DESC
            LIMIT 10;
        ";
        return await conn.QueryAsync(sql, new { CustomerId = customerId, Mobile = cleanMobile });
    }

    public async Task<bool> DeleteCustomerAsync(string id)
    {
        using var conn = CreateConn();
        var rows = await conn.ExecuteAsync("UPDATE customers SET record_status = 1, updated_at = NOW() WHERE id = @Id", new { Id = id });
        return rows > 0;
    }

    // -------------------------------------------------------------
    // Staged Buckets (Held Carts in PostgreSQL)
    // -------------------------------------------------------------
    public async Task<IEnumerable<dynamic>> GetBucketsAsync()
    {
        using var conn = CreateConn();
        var sql = "SELECT id as Id, bucket_number as BucketNumber, customer_name as CustomerName, items_count as ItemsCount, total as Total, cart_data as CartDataRaw, timestamp as Timestamp FROM staged_buckets WHERE record_status = 0 ORDER BY created_at DESC";
        var rows = await conn.QueryAsync(sql);
        var result = new List<dynamic>();
        foreach (var r in rows)
        {
            object? cartData = null;
            if (r.cartdataraw != null)
            {
                try { cartData = JsonSerializer.Deserialize<object>((string)r.cartdataraw.ToString()); } catch { }
            }
            result.Add(new
            {
                id = (string)r.id,
                bucketNumber = (string)r.bucketnumber,
                customerName = (string)(r.customername ?? "Walk-in"),
                itemsCount = (int)(r.itemscount ?? 0),
                total = (decimal)(r.total ?? 0m),
                cartData = cartData,
                timestamp = (string)(r.timestamp ?? "")
            });
        }
        return result;
    }

    public async Task<dynamic> SaveBucketAsync(JsonElement bucket)
    {
        using var conn = CreateConn();
        var id = bucket.TryGetProperty("id", out var idProp) ? idProp.GetString() : $"bkt_held_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var bucketNum = bucket.TryGetProperty("bucketNumber", out var bnProp) ? bnProp.GetString() : "BKT-01";
        var custName = bucket.TryGetProperty("customerName", out var cnProp) ? cnProp.GetString() : "Walk-in";
        var itemsCount = bucket.TryGetProperty("itemsCount", out var icProp) ? icProp.GetInt32() : 0;
        var total = bucket.TryGetProperty("total", out var totProp) ? totProp.GetDecimal() : 0m;
        var time = bucket.TryGetProperty("timestamp", out var tsProp) ? tsProp.GetString() : DateTime.UtcNow.ToString("HH:mm");
        var cartDataJson = bucket.TryGetProperty("cartData", out var cdProp) ? cdProp.GetRawText() : "{}";

        var sql = @"
            INSERT INTO staged_buckets (id, bucket_number, customer_name, items_count, total, cart_data, timestamp, record_status)
            VALUES (@Id, @BucketNumber, @CustomerName, @ItemsCount, @Total, @CartData::jsonb, @Timestamp, 0)
            ON CONFLICT (id) DO UPDATE
            SET bucket_number = EXCLUDED.bucket_number,
                customer_name = EXCLUDED.customer_name,
                items_count = EXCLUDED.items_count,
                total = EXCLUDED.total,
                cart_data = EXCLUDED.cart_data,
                timestamp = EXCLUDED.timestamp,
                record_status = 0;
        ";

        await conn.ExecuteAsync(sql, new {
            Id = id,
            BucketNumber = bucketNum,
            CustomerName = custName,
            ItemsCount = itemsCount,
            Total = total,
            CartData = cartDataJson,
            Timestamp = time
        });

        return new { id, bucketNumber = bucketNum, customerName = custName, itemsCount, total, timestamp = time };
    }

    public async Task<bool> DeleteBucketAsync(string id)
    {
        using var conn = CreateConn();
        var rows = await conn.ExecuteAsync("UPDATE staged_buckets SET record_status = 1 WHERE id = @Id", new { Id = id });
        return rows > 0;
    }

    // -------------------------------------------------------------
    // Invoices (Atomic with Stock Check & Decrement)
    // -------------------------------------------------------------
    public async Task<IEnumerable<Invoice>> GetInvoicesAsync(string? startDate, string? endDate, string? search, int? paymentMode, string? status = null)
    {
        using var conn = CreateConn();
        var sql = "SELECT id as Id, document_number as DocumentNumber, date as Date, customer_id as CustomerId, customer_name as CustomerName, mobile_number as MobileNumber, store_id as StoreId, store_name as StoreName, subtotal as Subtotal, cgst as Cgst, sgst as Sgst, igst as Igst, round_off as RoundOff, amount as Amount, mode_of_payment as ModeOfPayment, is_payment_received as IsPaymentReceived, is_share_receipt_through_sms as IsShareReceiptThroughSms, cancellation_reason as CancellationReason, record_status as RecordStatus, items as ItemsRaw FROM invoices WHERE 1=1";
        var p = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = status.Trim().ToLower();
            if (s == "active" || s == "0")
            {
                sql += " AND record_status = 0";
            }
            else if (s == "cancelled" || s == "1")
            {
                sql += " AND record_status = 1";
            }
            // "all" doesn't filter record_status
        }
        else
        {
            // By default show active unless specified
            sql += " AND record_status = 0";
        }

        if (paymentMode.HasValue)
        {
            sql += " AND mode_of_payment = @PaymentMode";
            p.Add("PaymentMode", paymentMode.Value);
        }

        if (!string.IsNullOrWhiteSpace(startDate) && DateTime.TryParse(startDate, out var parsedStart))
        {
            sql += " AND date >= @StartDate";
            p.Add("StartDate", parsedStart.ToUniversalTime());
        }

        if (!string.IsNullOrWhiteSpace(endDate) && DateTime.TryParse(endDate, out var parsedEnd))
        {
            if (parsedEnd.TimeOfDay == TimeSpan.Zero) parsedEnd = parsedEnd.AddDays(1).AddTicks(-1);
            sql += " AND date <= @EndDate";
            p.Add("EndDate", parsedEnd.ToUniversalTime());
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

    public async Task<InvoiceStatsDto> GetInvoiceStatsAsync()
    {
        using var conn = CreateConn();
        var sql = @"
            SELECT 
                COUNT(*) as TotalInvoices,
                COUNT(*) FILTER (WHERE record_status = 0) as ActiveInvoices,
                COUNT(*) FILTER (WHERE record_status = 1) as CancelledInvoices,
                COALESCE(SUM(amount) FILTER (WHERE record_status = 0), 0) as TotalSales,
                COALESCE(SUM(amount) FILTER (WHERE record_status = 0 AND mode_of_payment = 0), 0) as CashSales,
                COALESCE(SUM(amount) FILTER (WHERE record_status = 0 AND mode_of_payment = 1), 0) as UpiSales,
                COALESCE(SUM(amount) FILTER (WHERE record_status = 0 AND mode_of_payment = 2), 0) as CardSales,
                COALESCE(SUM(cgst + sgst + igst) FILTER (WHERE record_status = 0), 0) as TotalTax
            FROM invoices;
        ";
        var row = await conn.QueryFirstOrDefaultAsync(sql);
        if (row == null) return new InvoiceStatsDto();
        return new InvoiceStatsDto
        {
            TotalInvoices = (int)(row.totalinvoices ?? 0),
            ActiveInvoices = (int)(row.activeinvoices ?? 0),
            CancelledInvoices = (int)(row.cancelledinvoices ?? 0),
            TotalSales = (decimal)(row.totalsales ?? 0),
            CashSales = (decimal)(row.cashsales ?? 0),
            UpiSales = (decimal)(row.upisales ?? 0),
            CardSales = (decimal)(row.cardsales ?? 0),
            TotalTax = (decimal)(row.totaltax ?? 0)
        };
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
                var qty = item.Quantity > 0 ? item.Quantity : 1m;
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
                    decimal avail = (decimal)(stockRow.stock_quantity ?? 0m);
                    if (avail <= 0)
                        throw new InvalidOperationException($"Item \"{stockRow.name}\" is out of stock in inventory.");
                    if (qty > avail)
                        throw new InvalidOperationException($"Cannot checkout {qty} of \"{stockRow.name}\". Only {avail} available in inventory.");
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
                    Unit = item.Unit ?? "PCS",
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
                phone_number = COALESCE(@PhoneNumber, phone_number),
                email = COALESCE(@Email, email),
                gst_number = COALESCE(@GstNumber, gst_number),
                food_license_number = COALESCE(@FoodLicenseNumber, food_license_number),
                country = COALESCE(@Country, country),
                state = COALESCE(@State, state),
                invoice_prefix = COALESCE(@InvoicePrefix, invoice_prefix),
                receipt_footer_text = COALESCE(@ReceiptFooterText, receipt_footer_text),
                paper_size = COALESCE(@PaperSize, paper_size),
                enable_whatsapp_receipt = @EnableWhatsAppReceipt,
                updated_at = NOW()
            WHERE id = @Id
            RETURNING id as Id, name as Name, long_name as LongName, address as Address, mobile_number as MobileNumber, phone_number as PhoneNumber, email as Email, food_license_number as FoodLicenseNumber, gst_number as GstNumber, country as Country, state as State, invoice_prefix as InvoicePrefix, receipt_footer_text as ReceiptFooterText, paper_size as PaperSize, enable_whatsapp_receipt as EnableWhatsAppReceipt, record_status as RecordStatus;
        ";
        return await conn.QuerySingleAsync<Store>(sql, new {
            s.Name,
            s.LongName,
            s.Address,
            s.MobileNumber,
            s.PhoneNumber,
            s.Email,
            s.GstNumber,
            s.FoodLicenseNumber,
            s.Country,
            s.State,
            s.InvoicePrefix,
            s.ReceiptFooterText,
            s.PaperSize,
            s.EnableWhatsAppReceipt,
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
            sql += " AND (LOWER(name) LIKE @Search OR LOWER(vendor_code) LIKE @Search OR LOWER(city) LIKE @Search)";
            p.Add("Search", $"%{search.Trim().ToLower()}%");
        }
        sql += " ORDER BY vendor_code ASC, name ASC";
        return await conn.QueryAsync<Vendor>(sql, p);
    }

    public async Task<Vendor?> GetVendorByIdAsync(string id)
    {
        using var conn = CreateConn();
        var sql = "SELECT id as Id, vendor_code as VendorCode, name as Name, address as Address, city as City, pin as Pin, email as Email, mobile_number as MobileNumber, note as Note, record_status as RecordStatus FROM vendors WHERE (id = @Id OR vendor_code = @Id) AND record_status = 0";
        return await conn.QueryFirstOrDefaultAsync<Vendor>(sql, new { Id = id });
    }

    public async Task<object> GetVendorStatsAsync()
    {
        using var conn = CreateConn();
        var sql = @"
            SELECT 
                COUNT(*) as totalvendors,
                COUNT(DISTINCT city) FILTER (WHERE city IS NOT NULL AND city != '') as totalcities
            FROM vendors 
            WHERE record_status = 0;
        ";
        var row = await conn.QueryFirstOrDefaultAsync(sql);
        int totalVendors = row != null ? (int)(row.totalvendors ?? 0) : 0;
        int totalCities = row != null ? (int)(row.totalcities ?? 0) : 0;

        int totalPOs = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM purchase_orders WHERE record_status = 0");
        int totalInwards = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM material_inward WHERE record_status = 0");

        return new
        {
            TotalVendors = totalVendors,
            TotalCities = totalCities,
            TotalPurchaseOrders = totalPOs,
            TotalInwards = totalInwards
        };
    }

    public async Task<Vendor> CreateVendorAsync(Vendor v)
    {
        var id = $"vnd_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        using var conn = CreateConn();
        var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM vendors");
        var code = string.IsNullOrWhiteSpace(v.VendorCode) ? $"VND-{101 + count}" : v.VendorCode;

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

    public async Task<Vendor?> UpdateVendorAsync(string id, Vendor v)
    {
        using var conn = CreateConn();
        var sql = @"
            UPDATE vendors
            SET name = COALESCE(@Name, name),
                address = COALESCE(@Address, address),
                city = COALESCE(@City, city),
                pin = COALESCE(@Pin, pin),
                email = COALESCE(@Email, email),
                mobile_number = COALESCE(@MobileNumber, mobile_number),
                note = COALESCE(@Note, note),
                updated_at = NOW()
            WHERE (id = @Id OR vendor_code = @Id) AND record_status = 0
            RETURNING id as Id, vendor_code as VendorCode, name as Name, address as Address, city as City, pin as Pin, email as Email, mobile_number as MobileNumber, note as Note, record_status as RecordStatus;
        ";
        return await conn.QueryFirstOrDefaultAsync<Vendor>(sql, new {
            Id = id,
            v.Name,
            v.Address,
            v.City,
            v.Pin,
            v.Email,
            v.MobileNumber,
            v.Note
        });
    }

    public async Task<bool> DeleteVendorAsync(string id)
    {
        using var conn = CreateConn();
        var rows = await conn.ExecuteAsync("UPDATE vendors SET record_status = 1, updated_at = NOW() WHERE (id = @Id OR vendor_code = @Id) AND record_status = 0", new { Id = id });
        return rows > 0;
    }

    // -------------------------------------------------------------
    // Purchase Orders
    // -------------------------------------------------------------
    public async Task<IEnumerable<dynamic>> GetPurchaseOrdersAsync(string? status = null, string? vendorId = null, string? search = null)
    {
        using var conn = CreateConn();
        var sql = @"SELECT id as ""Id"", document_number as ""DocumentNumber"", vendor_id as ""VendorId"", 
                           vendor_name as ""VendorName"", date as ""Date"", status as ""Status"", 
                           total_amount as ""TotalAmount"", items as ""Items"", created_at as ""CreatedAt"" 
                    FROM purchase_orders 
                    WHERE record_status = 0";
        var p = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
        {
            sql += " AND LOWER(status) = LOWER(@Status)";
            p.Add("Status", status.Trim());
        }

        if (!string.IsNullOrWhiteSpace(vendorId))
        {
            sql += " AND vendor_id = @VendorId";
            p.Add("VendorId", vendorId.Trim());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += @" AND (LOWER(document_number) LIKE @Search 
                        OR LOWER(vendor_name) LIKE @Search 
                        OR LOWER(items::text) LIKE @Search)";
            p.Add("Search", $"%{search.Trim().ToLower()}%");
        }

        sql += " ORDER BY date DESC, created_at DESC";
        return await conn.QueryAsync(sql, p);
    }

    public async Task<dynamic?> GetPurchaseOrderByIdAsync(string id)
    {
        using var conn = CreateConn();
        var sql = @"SELECT id as ""Id"", document_number as ""DocumentNumber"", vendor_id as ""VendorId"", 
                           vendor_name as ""VendorName"", date as ""Date"", status as ""Status"", 
                           total_amount as ""TotalAmount"", items as ""Items"", created_at as ""CreatedAt"" 
                    FROM purchase_orders 
                    WHERE (id = @Id OR document_number = @Id) AND record_status = 0";
        return await conn.QueryFirstOrDefaultAsync(sql, new { Id = id });
    }

    public async Task<object> GetPurchaseOrderStatsAsync()
    {
        using var conn = CreateConn();
        var sql = @"
            SELECT 
                COUNT(*) as totalorders,
                COUNT(CASE WHEN status IN ('Sent', 'Pending') THEN 1 END) as pendingorders,
                COUNT(CASE WHEN status = 'Received' THEN 1 END) as receivedorders,
                COALESCE(SUM(total_amount), 0) as totalspend
            FROM purchase_orders 
            WHERE record_status = 0;
        ";
        var row = await conn.QueryFirstOrDefaultAsync(sql);
        int totalOrders = row != null ? (int)(row.totalorders ?? 0) : 0;
        int pendingOrders = row != null ? (int)(row.pendingorders ?? 0) : 0;
        int receivedOrders = row != null ? (int)(row.receivedorders ?? 0) : 0;
        decimal totalSpend = row != null ? (decimal)(row.totalspend ?? 0) : 0m;

        return new
        {
            TotalOrders = totalOrders,
            PendingOrders = pendingOrders,
            ReceivedOrders = receivedOrders,
            TotalSpend = totalSpend
        };
    }

    public async Task<dynamic> CreatePurchaseOrderAsync(JsonElement data)
    {
        var id = $"po_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        
        using var conn = CreateConn();
        var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM purchase_orders");
        var docNum = $"PO-2026-{String.Format("{0:D5}", count + 51)}";

        var vendorId = data.TryGetProperty("VendorId", out var vId) ? vId.GetString() : "vnd_01";
        var vendorName = data.TryGetProperty("VendorName", out var vNm) ? vNm.GetString() : null;
        if (string.IsNullOrWhiteSpace(vendorName))
        {
            var vRow = await conn.QueryFirstOrDefaultAsync<string>(
                "SELECT name FROM vendors WHERE id = @Id", new { Id = vendorId });
            vendorName = vRow ?? "Supplier";
        }

        decimal totalAmount = 0;
        if (data.TryGetProperty("TotalAmount", out var ta))
        {
            if (ta.ValueKind == JsonValueKind.Number) totalAmount = ta.GetDecimal();
            else if (decimal.TryParse(ta.GetString(), out var parsedTa)) totalAmount = parsedTa;
        }

        var itemsJson = data.TryGetProperty("Items", out var itms) ? itms.GetRawText() : "[]";

        var sql = @"
            INSERT INTO purchase_orders (id, document_number, vendor_id, vendor_name, store_id, status, total_amount, items)
            VALUES (@Id, @DocNum, @VendorId, @VendorName, 'store_mum_01', 'Sent', @Total, @Items::jsonb)
            RETURNING id as ""Id"", document_number as ""DocumentNumber"", vendor_id as ""VendorId"", 
                      vendor_name as ""VendorName"", date as ""Date"", status as ""Status"", 
                      total_amount as ""TotalAmount"", items as ""Items"";
        ";
        return await conn.QuerySingleAsync(sql, new {
            Id = id,
            DocNum = docNum,
            VendorId = vendorId,
            VendorName = vendorName,
            Total = totalAmount,
            Items = itemsJson
        });
    }

    public async Task<dynamic?> UpdatePurchaseOrderStatusAsync(string id, string status)
    {
        using var conn = CreateConn();
        var sql = @"
            UPDATE purchase_orders
            SET status = @Status, updated_at = NOW()
            WHERE (id = @Id OR document_number = @Id) AND record_status = 0
            RETURNING id as ""Id"", document_number as ""DocumentNumber"", vendor_id as ""VendorId"", 
                      vendor_name as ""VendorName"", date as ""Date"", status as ""Status"", 
                      total_amount as ""TotalAmount"", items as ""Items"";
        ";
        return await conn.QueryFirstOrDefaultAsync(sql, new { Id = id, Status = status });
    }

    // -------------------------------------------------------------
    // Material Inward
    // -------------------------------------------------------------
    public async Task<IEnumerable<dynamic>> GetMaterialInwardAsync()
    {
        using var conn = CreateConn();
        var sql = @"SELECT id as ""Id"", purchase_order_id as ""PurchaseOrderId"", vendor_id as ""VendorId"", 
                           vendor_name as ""VendorName"", date as ""Date"", is_po_available as ""IsPoAvailable"", 
                           items as ""Items"", created_at as ""CreatedAt"" 
                    FROM material_inward 
                    WHERE record_status = 0 
                    ORDER BY date DESC";
        return await conn.QueryAsync(sql);
    }

    public async Task<dynamic?> GetMaterialInwardByIdAsync(string id)
    {
        using var conn = CreateConn();
        var sql = @"SELECT id as ""Id"", purchase_order_id as ""PurchaseOrderId"", vendor_id as ""VendorId"", 
                           vendor_name as ""VendorName"", date as ""Date"", is_po_available as ""IsPoAvailable"", 
                           items as ""Items"", created_at as ""CreatedAt"" 
                    FROM material_inward 
                    WHERE id = @Id AND record_status = 0";
        return await conn.QueryFirstOrDefaultAsync(sql, new { Id = id });
    }

    public async Task<object> GetMaterialInwardStatsAsync()
    {
        using var conn = CreateConn();
        var sql = @"
            SELECT 
                COUNT(*) as totalinwards,
                COUNT(CASE WHEN date::date = CURRENT_DATE THEN 1 END) as todayinwards,
                COUNT(DISTINCT vendor_id) as activevendors,
                COUNT(CASE WHEN is_po_available = true THEN 1 END) as poinwards
            FROM material_inward 
            WHERE record_status = 0;
        ";
        var row = await conn.QueryFirstOrDefaultAsync(sql);
        int totalInwards = row != null ? (int)(row.totalinwards ?? 0) : 0;
        int todayInwards = row != null ? (int)(row.todayinwards ?? 0) : 0;
        int activeVendors = row != null ? (int)(row.activevendors ?? 0) : 0;
        int poInwards = row != null ? (int)(row.poinwards ?? 0) : 0;

        return new
        {
            TotalInwards = totalInwards,
            TodayInwards = todayInwards,
            ActiveVendors = activeVendors,
            PoInwards = poInwards
        };
    }

    public async Task<dynamic> CreateMaterialInwardAsync(JsonElement data)
    {
        var id = $"inw_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        using var conn = (NpgsqlConnection)CreateConn();
        await conn.OpenAsync();
        using var tx = await conn.BeginTransactionAsync();

        try
        {
            var vendorId = data.TryGetProperty("VendorId", out var vId) ? vId.GetString() : "vnd_01";
            var vendorName = data.TryGetProperty("VendorName", out var vNm) ? vNm.GetString() : null;
            if (string.IsNullOrWhiteSpace(vendorName))
            {
                var vRow = await conn.QueryFirstOrDefaultAsync<string>(
                    "SELECT name FROM vendors WHERE id = @Id", new { Id = vendorId }, transaction: tx);
                vendorName = vRow ?? "Supplier";
            }

            var poId = data.TryGetProperty("PurchaseOrderId", out var pId) ? pId.GetString() : null;
            var isPo = data.TryGetProperty("IsPoAvailable", out var ip) && ip.GetBoolean();

            var itemsJson = data.TryGetProperty("Items", out var itms) ? itms.GetRawText() : "[]";

            if (data.TryGetProperty("Items", out var itemsArray) && itemsArray.ValueKind == JsonValueKind.Array)
            {
                foreach (var itm in itemsArray.EnumerateArray())
                {
                    var prodId = itm.TryGetProperty("ProductId", out var pid) ? pid.GetString() : "";
                    var barcode = itm.TryGetProperty("Barcode", out var bc) ? bc.GetString() : "";

                    decimal receivedQty = 0;
                    if (itm.TryGetProperty("ReceivedQty", out var rq))
                    {
                        if (rq.ValueKind == JsonValueKind.Number) receivedQty = rq.GetDecimal();
                        else if (decimal.TryParse(rq.GetString(), out var pq)) receivedQty = pq;
                    }
                    else if (itm.TryGetProperty("Quantity", out var q))
                    {
                        if (q.ValueKind == JsonValueKind.Number) receivedQty = q.GetDecimal();
                        else if (decimal.TryParse(q.GetString(), out var pq)) receivedQty = pq;
                    }

                    if (receivedQty > 0)
                    {
                        await conn.ExecuteAsync(@"
                            UPDATE products
                            SET stock_quantity = stock_quantity + @Qty, updated_at = NOW()
                            WHERE id = @Id OR product_number = @Id OR id = @Bc OR product_number = @Bc
                        ", new { Qty = receivedQty, Id = prodId, Bc = barcode }, transaction: tx);
                    }
                }
            }

            if (!string.IsNullOrWhiteSpace(poId))
            {
                await conn.ExecuteAsync(@"
                    UPDATE purchase_orders
                    SET status = 'Received', updated_at = NOW()
                    WHERE id = @PoId
                ", new { PoId = poId }, transaction: tx);
            }

            var sql = @"
                INSERT INTO material_inward (id, purchase_order_id, vendor_id, vendor_name, is_po_available, items)
                VALUES (@Id, @PoId, @VendorId, @VendorName, @IsPo, @Items::jsonb)
                RETURNING id as ""Id"", purchase_order_id as ""PurchaseOrderId"", vendor_id as ""VendorId"", 
                          vendor_name as ""VendorName"", date as ""Date"", is_po_available as ""IsPoAvailable"", 
                          items as ""Items"";
            ";
            var res = await conn.QuerySingleAsync(sql, new {
                Id = id,
                PoId = poId,
                VendorId = vendorId,
                VendorName = vendorName,
                IsPo = isPo,
                Items = itemsJson
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
        return await conn.QueryAsync("SELECT id as \"Id\", name as \"Name\" FROM return_reasons ORDER BY name ASC");
    }

    public async Task<IEnumerable<dynamic>> GetMaterialReturnsAsync(string? reasonId = null, string? vendorId = null, string? search = null)
    {
        using var conn = CreateConn();
        var sql = @"
            SELECT 
                id as ""Id"", 
                document_number as ""DocumentNumber"", 
                date as ""Date"", 
                vendor_id as ""VendorId"", 
                vendor_name as ""VendorName"", 
                store_id as ""StoreId"",
                material_return_id as ""MaterialReturnId"",
                return_reason as ""ReturnReason"",
                total_return_amount as ""TotalReturnAmount"",
                status as ""Status"",
                items as ""Items"",
                created_at as ""CreatedAt""
            FROM material_returns 
            WHERE record_status = 0
        ";
        var p = new DynamicParameters();
        if (!string.IsNullOrWhiteSpace(reasonId) && reasonId != "All")
        {
            sql += " AND material_return_id = @ReasonId";
            p.Add("ReasonId", reasonId);
        }
        if (!string.IsNullOrWhiteSpace(vendorId) && vendorId != "All")
        {
            sql += " AND vendor_id = @VendorId";
            p.Add("VendorId", vendorId);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " AND (document_number ILIKE @Search OR vendor_name ILIKE @Search OR return_reason ILIKE @Search)";
            p.Add("Search", $"%{search}%");
        }
        sql += " ORDER BY created_at DESC";
        return await conn.QueryAsync(sql, p);
    }

    public async Task<dynamic?> GetMaterialReturnByIdAsync(string id)
    {
        using var conn = CreateConn();
        var sql = @"
            SELECT 
                id as ""Id"", 
                document_number as ""DocumentNumber"", 
                date as ""Date"", 
                vendor_id as ""VendorId"", 
                vendor_name as ""VendorName"", 
                store_id as ""StoreId"",
                material_return_id as ""MaterialReturnId"",
                return_reason as ""ReturnReason"",
                total_return_amount as ""TotalReturnAmount"",
                status as ""Status"",
                items as ""Items"",
                created_at as ""CreatedAt""
            FROM material_returns 
            WHERE (id = @Id OR document_number = @Id) AND record_status = 0
        ";
        return await conn.QueryFirstOrDefaultAsync(sql, new { Id = id });
    }

    public async Task<object> GetMaterialReturnStatsAsync()
    {
        using var conn = CreateConn();
        var sql = @"
            SELECT 
                COUNT(*) as totalreturns,
                COALESCE(SUM(total_return_amount), 0) as totalreturnvalue,
                COUNT(CASE WHEN status = 'Credit Note Pending' THEN 1 END) as pendingcreditnotes,
                COUNT(CASE WHEN return_reason ILIKE '%Expired%' THEN 1 END) as expiredreturns
            FROM material_returns 
            WHERE record_status = 0;
        ";
        var row = await conn.QueryFirstOrDefaultAsync(sql);
        int totalReturns = row != null ? (int)(row.totalreturns ?? 0) : 0;
        decimal totalReturnValue = row != null ? (decimal)(row.totalreturnvalue ?? 0) : 0m;
        int pendingCreditNotes = row != null ? (int)(row.pendingcreditnotes ?? 0) : 0;
        int expiredReturns = row != null ? (int)(row.expiredreturns ?? 0) : 0;

        return new
        {
            TotalReturns = totalReturns,
            TotalReturnValue = totalReturnValue,
            PendingCreditNotes = pendingCreditNotes,
            ExpiredReturns = expiredReturns
        };
    }

    public async Task<dynamic> CreateMaterialReturnAsync(JsonElement data)
    {
        var id = $"mrn_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";

        using var conn = (NpgsqlConnection)CreateConn();
        await conn.OpenAsync();
        using var tx = await conn.BeginTransactionAsync();

        try
        {
            var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM material_returns", transaction: tx);
            var docNum = $"MRN-2026-{String.Format("{0:D5}", count + 14)}";

            var vendorId = data.TryGetProperty("VendorId", out var vId) ? vId.GetString() : "vnd_01";
            var vendorName = data.TryGetProperty("VendorName", out var vNm) ? vNm.GetString() : null;
            if (string.IsNullOrWhiteSpace(vendorName))
            {
                vendorName = await conn.QueryFirstOrDefaultAsync<string>(
                    "SELECT name FROM vendors WHERE id = @Id", new { Id = vendorId }, transaction: tx) ?? "Supplier";
            }

            var materialReturnId = data.TryGetProperty("MaterialReturnId", out var mrId) ? mrId.GetString() : "ret_01";
            var returnReason = data.TryGetProperty("ReturnReason", out var rr) ? rr.GetString() : null;
            if (string.IsNullOrWhiteSpace(returnReason))
            {
                returnReason = await conn.QueryFirstOrDefaultAsync<string>(
                    "SELECT name FROM return_reasons WHERE id = @Id", new { Id = materialReturnId }, transaction: tx) ?? "Expired Goods";
            }

            decimal totalAmount = 0;
            if (data.TryGetProperty("TotalReturnAmount", out var tra))
            {
                if (tra.ValueKind == JsonValueKind.Number) totalAmount = tra.GetDecimal();
                else if (decimal.TryParse(tra.GetString(), out var parsedTra)) totalAmount = parsedTra;
            }
            else if (data.TryGetProperty("TotalAmount", out var ta))
            {
                if (ta.ValueKind == JsonValueKind.Number) totalAmount = ta.GetDecimal();
                else if (decimal.TryParse(ta.GetString(), out var parsedTa)) totalAmount = parsedTa;
            }

            var itemsJson = data.TryGetProperty("Items", out var itms) ? itms.GetRawText() : "[]";

            // Decrement inventory stock in products table for each returned line item
            if (data.TryGetProperty("Items", out var itemsArray) && itemsArray.ValueKind == JsonValueKind.Array)
            {
                foreach (var itm in itemsArray.EnumerateArray())
                {
                    var prodId = itm.TryGetProperty("ProductId", out var pid) ? pid.GetString() : "";
                    decimal qty = 0;
                    if (itm.TryGetProperty("Quantity", out var q))
                    {
                        if (q.ValueKind == JsonValueKind.Number) qty = q.GetDecimal();
                        else if (decimal.TryParse(q.GetString(), out var pq)) qty = pq;
                    }
                    else if (itm.TryGetProperty("ReturnQty", out var rq))
                    {
                        if (rq.ValueKind == JsonValueKind.Number) qty = rq.GetDecimal();
                        else if (decimal.TryParse(rq.GetString(), out var prq)) qty = prq;
                    }

                    if (!string.IsNullOrWhiteSpace(prodId) && qty > 0)
                    {
                        await conn.ExecuteAsync(@"
                            UPDATE products
                            SET stock_quantity = GREATEST(0, stock_quantity - @Qty), updated_at = NOW()
                            WHERE id = @Id OR product_number = @Id
                        ", new { Qty = qty, Id = prodId }, transaction: tx);
                    }
                }
            }

            var sql = @"
                INSERT INTO material_returns (id, document_number, vendor_id, vendor_name, store_id, material_return_id, return_reason, total_return_amount, status, items)
                VALUES (@Id, @DocNum, @VendorId, @VendorName, 'store_mum_01', @MaterialReturnId, @ReturnReason, @Total, 'Credit Note Pending', @Items::jsonb)
                RETURNING id as ""Id"", document_number as ""DocumentNumber"", date as ""Date"", 
                          vendor_id as ""VendorId"", vendor_name as ""VendorName"",
                          material_return_id as ""MaterialReturnId"", return_reason as ""ReturnReason"",
                          total_return_amount as ""TotalReturnAmount"", status as ""Status"", items as ""Items"";
            ";
            var res = await conn.QuerySingleAsync(sql, new {
                Id = id,
                DocNum = docNum,
                VendorId = vendorId,
                VendorName = vendorName,
                MaterialReturnId = materialReturnId,
                ReturnReason = returnReason,
                Total = totalAmount,
                Items = itemsJson
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

    public async Task<dynamic?> UpdateMaterialReturnStatusAsync(string id, string status)
    {
        using var conn = CreateConn();
        var sql = @"
            UPDATE material_returns
            SET status = @Status, updated_at = NOW()
            WHERE (id = @Id OR document_number = @Id) AND record_status = 0
            RETURNING id as ""Id"", document_number as ""DocumentNumber"", date as ""Date"", 
                      vendor_id as ""VendorId"", vendor_name as ""VendorName"",
                      material_return_id as ""MaterialReturnId"", return_reason as ""ReturnReason"",
                      total_return_amount as ""TotalReturnAmount"", status as ""Status"", items as ""Items"";
        ";
        return await conn.QueryFirstOrDefaultAsync(sql, new { Id = id, Status = status });
    }

    // -------------------------------------------------------------
    // Reports & Dashboard KPIs
    // -------------------------------------------------------------
    public async Task<dynamic> GetDashboardKpisAsync()
    {
        using var conn = CreateConn();
        var salesSql = @"
            SELECT 
                COUNT(*) as TotalInvoices,
                COUNT(*) FILTER (WHERE record_status = 0) as ActiveInvoices,
                COALESCE(SUM(amount) FILTER (WHERE record_status = 0), 0) as TotalSales,
                COALESCE(SUM(amount) FILTER (WHERE record_status = 0 AND mode_of_payment = 0), 0) as CashSales,
                COALESCE(SUM(amount) FILTER (WHERE record_status = 0 AND mode_of_payment = 1), 0) as UpiSales,
                COALESCE(SUM(amount) FILTER (WHERE record_status = 0 AND mode_of_payment = 2), 0) as CardSales,
                COALESCE(SUM(cgst + sgst + igst) FILTER (WHERE record_status = 0), 0) as TotalTax
            FROM invoices;
        ";
        var salesRow = await conn.QueryFirstOrDefaultAsync(salesSql);
        decimal totalSales = salesRow != null ? (decimal)(salesRow.totalsales ?? 0) : 0m;
        decimal cashSales = salesRow != null ? (decimal)(salesRow.cashsales ?? 0) : 0m;
        decimal upiSales = salesRow != null ? (decimal)(salesRow.upisales ?? 0) : 0m;
        decimal cardSales = salesRow != null ? (decimal)(salesRow.cardsales ?? 0) : 0m;
        decimal totalTax = salesRow != null ? (decimal)(salesRow.totaltax ?? 0) : 0m;
        int activeInvoices = salesRow != null ? (int)(salesRow.activeinvoices ?? 0) : 0;
        int invoiceCount = salesRow != null ? (int)(salesRow.totalinvoices ?? 0) : 0;

        var products = (await conn.QueryAsync<(string Id, string Name, string ProductNumber, decimal Cost, bool IsExpDate, int? Days, decimal StockQuantity)>(
            "SELECT id as Id, name as Name, product_number as ProductNumber, cost as Cost, is_exp_date as IsExpDate, days as Days, stock_quantity as StockQuantity FROM products WHERE record_status = 0"
        )).ToList();
        var lowStockCount = products.Count(p => p.StockQuantity < 20);
        var expiringCount = products.Count(p => p.IsExpDate && p.Days.HasValue && p.Days.Value <= 5);
        var expiredCount = products.Count(p => p.IsExpDate && p.Days.HasValue && p.Days.Value <= 0);

        var recentInvoices = (await GetInvoicesAsync(null, null, null, null, "all")).Take(5);

        return new
        {
            totalSales,
            cashSales,
            upiSales,
            cardSales,
            totalTax,
            invoiceCount = activeInvoices,
            totalInvoices = invoiceCount,
            totalProducts = products.Count,
            lowStockCount,
            expiringCount,
            expiredCount,
            recentInvoices
        };
    }

    public async Task<dynamic> GetDailySalesReportAsync(string? targetDate)
    {
        using var conn = CreateConn();
        
        var sql = @"
            SELECT 
                TO_CHAR(date, 'YYYY-MM-DD') as Date,
                COUNT(*) as InvoicesCount,
                COALESCE(SUM(amount) FILTER (WHERE mode_of_payment = 0), 0) as CashTotal,
                COALESCE(SUM(amount) FILTER (WHERE mode_of_payment = 1), 0) as UpiTotal,
                COALESCE(SUM(amount) FILTER (WHERE mode_of_payment = 2), 0) as CardTotal,
                COALESCE(SUM(cgst + sgst + igst), 0) as TaxCollected,
                COALESCE(SUM(amount), 0) as GrandTotal
            FROM invoices
            WHERE record_status = 0
        ";

        var p = new DynamicParameters();
        if (!string.IsNullOrWhiteSpace(targetDate))
        {
            sql += " AND TO_CHAR(date, 'YYYY-MM-DD') = @TargetDate";
            p.Add("TargetDate", targetDate.Trim());
        }

        sql += " GROUP BY TO_CHAR(date, 'YYYY-MM-DD') ORDER BY Date DESC";

        var rows = (await conn.QueryAsync(sql, p)).ToList();

        var dailyBreakdown = rows.Select(r => new
        {
            Date = (string)r.date,
            InvoicesCount = (int)r.invoicescount,
            CashTotal = (decimal)r.cashtotal,
            UpiTotal = (decimal)r.upitotal,
            CardTotal = (decimal)r.cardtotal,
            TaxCollected = (decimal)r.taxcollected,
            GrandTotal = (decimal)r.grandtotal
        }).ToList();

        var totalInvoices = dailyBreakdown.Sum(d => d.InvoicesCount);
        var totalGross = dailyBreakdown.Sum(d => d.GrandTotal);
        var totalCash = dailyBreakdown.Sum(d => d.CashTotal);
        var totalUpi = dailyBreakdown.Sum(d => d.UpiTotal);
        var totalCard = dailyBreakdown.Sum(d => d.CardTotal);
        var totalTax = dailyBreakdown.Sum(d => d.TaxCollected);

        var invSql = "SELECT id as Id, document_number as DocumentNumber, date as Date, amount as Amount, mode_of_payment as ModeOfPayment, cgst as Cgst, sgst as Sgst, igst as Igst FROM invoices WHERE record_status = 0";
        if (!string.IsNullOrWhiteSpace(targetDate))
        {
            invSql += " AND TO_CHAR(date, 'YYYY-MM-DD') = @TargetDate";
        }
        invSql += " ORDER BY date DESC LIMIT 50";
        var invRows = (await conn.QueryAsync(invSql, p)).ToList();

        return new
        {
            date = targetDate ?? "All Recorded Days",
            summary = new
            {
                totalInvoices,
                grossSales = totalGross,
                cashSales = totalCash,
                upiSales = totalUpi,
                cardSales = totalCard,
                taxCollected = totalTax
            },
            dailyBreakdown,
            invoices = invRows
        };
    }

    public async Task<IEnumerable<dynamic>> GetVendorWiseSalesReportAsync()
    {
        using var conn = CreateConn();
        var vendors = (await GetVendorsAsync(null)).ToList();
        var invoices = (await GetInvoicesAsync(null, null, null, null, "active")).ToList();

        var result = new List<dynamic>();
        foreach (var v in vendors)
        {
            int itemsSold = 0;
            decimal totalQty = 0;
            decimal salesValue = 0;

            foreach (var inv in invoices)
            {
                if (inv.Items == null) continue;
                foreach (var itm in inv.Items)
                {
                    var name = itm.ProductName ?? "";
                    if ((v.VendorCode == "VND-101" && (name.Contains("Milk", StringComparison.OrdinalIgnoreCase) || name.Contains("Butter", StringComparison.OrdinalIgnoreCase) || name.Contains("Coffee", StringComparison.OrdinalIgnoreCase))) ||
                        (v.VendorCode == "VND-102" && (name.Contains("Bread", StringComparison.OrdinalIgnoreCase) || name.Contains("Cake", StringComparison.OrdinalIgnoreCase) || name.Contains("Chips", StringComparison.OrdinalIgnoreCase))) ||
                        (v.VendorCode == "VND-103" && (name.Contains("Rice", StringComparison.OrdinalIgnoreCase) || name.Contains("Tea", StringComparison.OrdinalIgnoreCase))))
                    {
                        itemsSold++;
                        totalQty += itm.Quantity;
                        salesValue += itm.Total;
                    }
                }
            }

            result.Add(new
            {
                VendorCode = v.VendorCode,
                VendorName = v.Name,
                City = v.City ?? "Mumbai",
                ItemsSold = itemsSold,
                TotalQuantity = totalQty,
                SalesValue = salesValue,
                MarginEarned = Math.Round(salesValue * 0.15m, 2)
            });
        }
        return result;
    }

    public async Task<IEnumerable<dynamic>> GetVendorWiseExpiredStockReportAsync()
    {
        using var conn = CreateConn();
        var products = (await conn.QueryAsync<Product>("SELECT * FROM products WHERE record_status = 0 AND is_exp_date = true")).ToList();
        var vendors = (await GetVendorsAsync(null)).ToList();

        var list = new List<dynamic>();
        int idx = 0;
        foreach (var p in products)
        {
            var v = vendors.Count > 0 ? vendors[idx % vendors.Count] : new Vendor { VendorCode = "VND-101", Name = "General Supplier" };
            var days = p.Days ?? 10;
            var lossVal = Math.Round(p.StockQuantity * p.Cost, 2);
            list.Add(new
            {
                Id = $"exp_{p.Id}",
                VendorCode = v.VendorCode,
                VendorName = v.Name,
                ProductName = p.Name,
                BatchBarcode = p.ProductNumber,
                ExpiryDate = DateTime.UtcNow.AddDays(days - 2).ToString("yyyy-MM-dd"),
                DaysRemaining = days - 2,
                IsOverdue = days <= 3,
                Quantity = p.StockQuantity,
                CostPrice = p.Cost,
                LossValue = lossVal,
                TotalLossValue = lossVal
            });
            idx++;
        }
        return list;
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

    public async Task<object> GetUserStatsAsync()
    {
        using var conn = CreateConn();
        var sql = @"
            SELECT 
                COUNT(*) FILTER (WHERE record_status = 0) as TotalUsers,
                COUNT(*) FILTER (WHERE record_status = 0 AND LOWER(role) = 'admin') as Admins,
                COUNT(*) FILTER (WHERE record_status = 0 AND LOWER(role) = 'cashier') as Cashiers,
                COUNT(*) FILTER (WHERE record_status = 0 AND LOWER(role) LIKE '%inventory%') as InventoryManagers
            FROM users;
        ";
        var row = await conn.QueryFirstOrDefaultAsync(sql);
        return new
        {
            totalUsers = (int)(row?.totalusers ?? 0),
            admins = (int)(row?.admins ?? 0),
            cashiers = (int)(row?.cashiers ?? 0),
            inventoryManagers = (int)(row?.inventorymanagers ?? 0)
        };
    }

    public async Task<UserDto?> UpdateUserRoleAsync(string id, string role)
    {
        using var conn = CreateConn();
        var sql = "UPDATE users SET role = @Role, updated_at = NOW() WHERE id = @Id RETURNING id as Id, name as Name, email as Email, role as Role, store as Store, status as Status, last_login as LastLogin";
        return await conn.QueryFirstOrDefaultAsync<UserDto>(sql, new { Id = id, Role = role });
    }

    public async Task<UserDto?> UpdateUserAsync(string id, UserDto u)
    {
        using var conn = CreateConn();
        var sql = @"
            UPDATE users
            SET name = COALESCE(@Name, name),
                email = COALESCE(@Email, email),
                role = COALESCE(@Role, role),
                store = COALESCE(@Store, store),
                status = COALESCE(@Status, status),
                updated_at = NOW()
            WHERE id = @Id
            RETURNING id as Id, name as Name, email as Email, role as Role, store as Store, status as Status, last_login as LastLogin;
        ";
        return await conn.QueryFirstOrDefaultAsync<UserDto>(sql, new {
            Id = id,
            u.Name,
            u.Email,
            u.Role,
            u.Store,
            u.Status
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

    public async Task<bool> SavePermissionsMatrixBulkAsync(IEnumerable<PermissionMatrixRowDto> rows)
    {
        using var conn = CreateConn();
        foreach (var row in rows)
        {
            var adminJson = row.Admin is string aStr ? aStr : System.Text.Json.JsonSerializer.Serialize(row.Admin);
            var cashierJson = row.Cashier is string cStr ? cStr : System.Text.Json.JsonSerializer.Serialize(row.Cashier);
            var invJson = row.Inventory is string iStr ? iStr : System.Text.Json.JsonSerializer.Serialize(row.Inventory);

            var sql = @"UPDATE permissions_matrix 
                        SET admin_perm = @Admin::jsonb, 
                            cashier_perm = @Cashier::jsonb, 
                            inventory_perm = @Inventory::jsonb 
                        WHERE LOWER(module) = LOWER(@Module)";
            await conn.ExecuteAsync(sql, new {
                Admin = adminJson,
                Cashier = cashierJson,
                Inventory = invJson,
                Module = row.Module
            });
        }
        return true;
    }
}
