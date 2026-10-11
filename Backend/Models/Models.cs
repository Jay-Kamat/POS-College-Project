using System.Text.Json.Serialization;

namespace PosBackend.Models;

public class ApiResponse<T>
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "success";

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("count")]
    public int? Count { get; set; }

    [JsonPropertyName("data")]
    public T? Data { get; set; }
}

public class Product
{
    public string Id { get; set; } = "";
    public string ProductNumber { get; set; } = "";
    public string Name { get; set; } = "";
    public decimal Cost { get; set; }
    public string Ingredients { get; set; } = "";
    public string Notes { get; set; } = "";
    public bool IsExpDate { get; set; }
    public int? Days { get; set; }
    public string? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? TaxRateId { get; set; }
    public decimal TaxPercent { get; set; } = 5;
    public string Unit { get; set; } = "PCS";
    public decimal StockQuantity { get; set; } = 50;
    public int RecordStatus { get; set; }
    public DateTime? Created { get; set; }
    public DateTime? Updated { get; set; }
}

public class Category
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int RecordStatus { get; set; }
}

public class TaxRate
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public decimal IGST { get; set; }
    public decimal CGST { get; set; }
    public decimal SGST { get; set; }
}

public class Customer
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string MobileNumber { get; set; } = "";
    public string GstNumber { get; set; } = "";
    public string State { get; set; } = "Maharashtra";
    public string Country { get; set; } = "India";
    public int TotalVisits { get; set; } = 1;
    public decimal TotalSpend { get; set; } = 0;
    public int RecordStatus { get; set; }
    public DateTime? Created { get; set; }
    public DateTime? Updated { get; set; }
}

public class Vendor
{
    public string Id { get; set; } = "";
    public string VendorCode { get; set; } = "";
    public string Name { get; set; } = "";
    public string Address { get; set; } = "";
    public string City { get; set; } = "";
    public string Pin { get; set; } = "";
    public string Email { get; set; } = "";
    public string MobileNumber { get; set; } = "";
    public string Note { get; set; } = "";
    public int RecordStatus { get; set; }
    public DateTime? Created { get; set; }
    public DateTime? Updated { get; set; }
}

public class Store
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string LongName { get; set; } = "";
    public string Address { get; set; } = "";
    public string MobileNumber { get; set; } = "";
    public string PhoneNumber { get; set; } = "";
    public string Email { get; set; } = "";
    public string FoodLicenseNumber { get; set; } = "";
    public string GstNumber { get; set; } = "";
    public string Country { get; set; } = "India";
    public string State { get; set; } = "Maharashtra";
    public string InvoicePrefix { get; set; } = "INV";
    public string ReceiptFooterText { get; set; } = "";
    public string PaperSize { get; set; } = "80mm";
    public bool EnableWhatsAppReceipt { get; set; } = true;
    public int RecordStatus { get; set; }
}

public class InvoiceItem
{
    public string ProductId { get; set; } = "";
    public string ProductNumber { get; set; } = "";
    public string ProductName { get; set; } = "";
    public decimal Quantity { get; set; } = 1;
    public string Unit { get; set; } = "PCS";
    public decimal Rate { get; set; }
    public decimal TaxPercent { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Cgst { get; set; }
    public decimal Sgst { get; set; }
    public decimal Igst { get; set; }
    public decimal Total { get; set; }
}

public class Invoice
{
    public string Id { get; set; } = "";
    public string DocumentNumber { get; set; } = "";
    public DateTime Date { get; set; }
    public string? CustomerId { get; set; }
    public string CustomerName { get; set; } = "";
    public string MobileNumber { get; set; } = "";
    public string StoreId { get; set; } = "";
    public string StoreName { get; set; } = "";
    public decimal Subtotal { get; set; }
    public decimal Cgst { get; set; }
    public decimal Sgst { get; set; }
    public decimal Igst { get; set; }
    public decimal RoundOff { get; set; }
    public decimal Amount { get; set; }
    public int ModeOfPayment { get; set; }
    public bool IsPaymentReceived { get; set; }
    public bool IsShareReceiptThroughSms { get; set; }
    public string? CancellationReason { get; set; }
    public int RecordStatus { get; set; }
    public List<InvoiceItem> Items { get; set; } = new();
    public Store? Store { get; set; }
}

public class InvoiceStatsDto
{
    public int TotalInvoices { get; set; }
    public int ActiveInvoices { get; set; }
    public int CancelledInvoices { get; set; }
    public decimal TotalSales { get; set; }
    public decimal CashSales { get; set; }
    public decimal UpiSales { get; set; }
    public decimal CardSales { get; set; }
    public decimal TotalTax { get; set; }
}

public class CartLineItem
{
    public string? Id { get; set; }
    public string? ProductNumber { get; set; }
    public string? Name { get; set; }
    public decimal? Rate { get; set; }
    public decimal? Cost { get; set; }
    public decimal Quantity { get; set; } = 1;
    public string? Unit { get; set; } = "PCS";
    public decimal? TaxPercent { get; set; }
}

public class CartCustomerDto
{
    public string? Id { get; set; }
    public string? Name { get; set; }
    public string? MobileNumber { get; set; }
    public string? State { get; set; }
    public string? Gstin { get; set; }
}

public class CartDto
{
    public string? BucketId { get; set; }
    public string? BucketNumber { get; set; }
    public CartCustomerDto? Customer { get; set; }
    public List<CartLineItem> Items { get; set; } = new();
    public decimal Subtotal { get; set; }
    public decimal Cgst { get; set; }
    public decimal Sgst { get; set; }
    public decimal Igst { get; set; }
    public decimal RoundOff { get; set; }
    public decimal GrandTotal { get; set; }
    public int PaymentMode { get; set; }
    public bool IsPaymentReceived { get; set; }
    public bool SendWhatsApp { get; set; }
}

public class CreateInvoiceRequest
{
    public CartDto? Cart { get; set; }
    public Store? ActiveStore { get; set; }
}

public class UserDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Role { get; set; } = "Cashier";
    public string Store { get; set; } = "DailyMart Express (Mumbai)";
    public string Status { get; set; } = "Active";
    public string LastLogin { get; set; } = "Never";
}

public class PermissionMatrixRowDto
{
    public string Module { get; set; } = "";
    public object? Admin { get; set; }
    public object? Cashier { get; set; }
    public object? Inventory { get; set; }
}

public class PurchaseOrderItem
{
    public string ProductId { get; set; } = "";
    public string ProductName { get; set; } = "";
    public decimal Quantity { get; set; } = 1;
    public decimal Rate { get; set; }
    public string? Unit { get; set; } = "PCS";
    public string? DeliveryDate { get; set; }
}

public class PurchaseOrder
{
    public string Id { get; set; } = "";
    public string DocumentNumber { get; set; } = "";
    public string VendorId { get; set; } = "";
    public string VendorName { get; set; } = "";
    public string StoreId { get; set; } = "store_mum_01";
    public DateTime Date { get; set; }
    public string Status { get; set; } = "Sent";
    public decimal TotalAmount { get; set; }
    public string Items { get; set; } = "[]";
}

public class MaterialReturnItem
{
    public string ProductId { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? BatchBarcode { get; set; }
    public decimal Quantity { get; set; } = 1;
    public decimal Rate { get; set; }
    public decimal Total { get; set; }
}

public class MaterialReturn
{
    public string Id { get; set; } = "";
    public string DocumentNumber { get; set; } = "";
    public DateTime Date { get; set; }
    public string VendorId { get; set; } = "";
    public string VendorName { get; set; } = "";
    public string StoreId { get; set; } = "store_mum_01";
    public string MaterialReturnId { get; set; } = "";
    public string ReturnReason { get; set; } = "";
    public decimal TotalReturnAmount { get; set; }
    public string Status { get; set; } = "Credit Note Pending";
    public string Items { get; set; } = "[]";
}
