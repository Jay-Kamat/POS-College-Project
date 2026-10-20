using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PosBackend.Models;
using PosBackend.Services;

namespace PosBackend.Controllers;

public class CancelInvoiceRequest
{
    public string? Reason { get; set; }
}

[Authorize]
[Route("api/[controller]")]
public class InvoicesController : BaseApiController
{
    private readonly PosDbService _db;
    private readonly ILogger<InvoicesController> _logger;

    // Idempotency cache to prevent duplicate checkout requests on retry
    private static readonly ConcurrentDictionary<string, (Invoice Invoice, DateTime Timestamp)> _idempotencyCache = new();

    public InvoicesController(PosDbService db, ILogger<InvoicesController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetInvoices(
        [FromQuery] string? startDate, 
        [FromQuery] string? endDate, 
        [FromQuery] string? search, 
        [FromQuery] int? paymentMode, 
        [FromQuery] string? status,
        [FromQuery] string? storeId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var list = (await _db.GetInvoicesAsync(startDate, endDate, search, paymentMode, status, targetStoreId)).ToList();
        
        // Pagination
        var totalCount = list.Count;
        var pagedItems = list.Skip((Math.Max(1, page) - 1) * Math.Max(1, pageSize)).Take(Math.Max(1, pageSize)).ToList();

        return Ok(new { 
            status = "success", 
            count = totalCount, 
            pageNumber = page,
            pageSize = pageSize,
            totalPages = (int)Math.Ceiling((double)totalCount / Math.Max(1, pageSize)),
            data = pagedItems 
        });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetInvoiceStats([FromQuery] string? storeId)
    {
        var targetStoreId = ResolveStoreId(storeId);
        var stats = await _db.GetInvoiceStatsAsync(targetStoreId);
        return Ok(new { status = "success", data = stats });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetInvoiceById(string id)
    {
        var found = await _db.GetInvoiceByIdAsync(id);
        if (found == null)
            return NotFound(new { status = "error", message = "Invoice not found" });

        return Ok(new { status = "success", data = found });
    }

    [HttpPost]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest req)
    {
        if (req?.Cart == null || req.Cart.Items == null || req.Cart.Items.Count == 0)
            return BadRequest(new { status = "error", message = "Cannot generate invoice for an empty cart." });

        // Idempotency Key check
        var idempotencyKey = req.IdempotencyKey ?? Request.Headers["X-Idempotency-Key"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            if (_idempotencyCache.TryGetValue(idempotencyKey, out var cached) && cached.Timestamp > DateTime.UtcNow.AddMinutes(-15))
            {
                _logger.LogInformation("Returning idempotent response for key {Key}, invoice {Invoice}", idempotencyKey, cached.Invoice.DocumentNumber);
                return Ok(new { status = "success", message = "Duplicate request detected; returned cached transaction.", data = cached.Invoice });
            }
        }

        var targetStoreId = ResolveStoreId(req.ActiveStore?.Id);
        if (req.ActiveStore == null)
        {
            req.ActiveStore = new Store { Id = targetStoreId };
        }
        else
        {
            req.ActiveStore.Id = targetStoreId;
        }

        try
        {
            var userId = GetCurrentUserId();
            var created = await _db.CreateInvoiceAsync(req.Cart, req.ActiveStore, userId);

            if (!string.IsNullOrWhiteSpace(idempotencyKey))
            {
                _idempotencyCache[idempotencyKey] = (created, DateTime.UtcNow);
            }

            return StatusCode(201, new { status = "success", data = created });
        }
        catch (InsufficientStockException ex)
        {
            _logger.LogWarning("Checkout conflict: {Message}", ex.Message);
            return StatusCode(409, new {
                status = "error",
                title = "Insufficient Stock",
                message = ex.Message,
                product = ex.ProductName,
                available = ex.AvailableQuantity,
                requested = ex.RequestedQuantity
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { status = "error", message = ex.Message });
        }
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelInvoice(string id, [FromBody] CancelInvoiceRequest? req)
    {
        var role = GetCurrentUserRole().ToLowerInvariant();
        if (role == "cashier")
        {
            return StatusCode(403, new { status = "error", message = "Cashier role is not permitted to cancel invoices. Manager or Admin approval required." });
        }

        var userId = GetCurrentUserId();
        var cancelled = await _db.CancelInvoiceAsync(id, req?.Reason, userId);
        if (cancelled == null)
            return NotFound(new { status = "error", message = "Invoice not found" });

        return Ok(new { status = "success", message = "Invoice cancelled successfully and stock restored.", data = cancelled });
    }
}
