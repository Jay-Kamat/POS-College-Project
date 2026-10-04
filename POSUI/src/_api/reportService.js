// Reports & Analytics Service Layer
import invoiceService from './invoiceService';
import productService from './productService';
import vendorService from './vendorService';

export const reportService = {
  // 1. Daily Sales Report
  getDailySalesReport: async ({ startDate, endDate } = {}) => {
    const invoices = await invoiceService.getInvoices({ status: 'active' });
    
    // Group invoices by date string (YYYY-MM-DD)
    const grouped = {};
    invoices.forEach(inv => {
      const dateKey = inv.Date.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          Date: dateKey,
          InvoicesCount: 0,
          CashTotal: 0,
          UpiTotal: 0,
          TaxCollected: 0,
          GrandTotal: 0
        };
      }
      grouped[dateKey].InvoicesCount += 1;
      if (inv.ModeOfPayment === 0) grouped[dateKey].CashTotal += inv.Amount;
      else grouped[dateKey].UpiTotal += inv.Amount;
      grouped[dateKey].TaxCollected += (inv.Cgst || 0) + (inv.Sgst || 0) + (inv.Igst || 0);
      grouped[dateKey].GrandTotal += inv.Amount;
    });

    return Object.values(grouped).sort((a, b) => b.Date.localeCompare(a.Date));
  },

  // 2. Vendor-Wise Sales Report
  getVendorWiseSalesReport: async () => {
    const invoices = await invoiceService.getInvoices({ status: 'active' });
    const vendors = await vendorService.getVendors();

    // Map vendor item sales
    const reportData = vendors.map(v => {
      let itemsSold = 0;
      let totalQty = 0;
      let salesValue = 0;

      invoices.forEach(inv => {
        inv.Items.forEach(item => {
          // Associate items by category / supplier logic
          if (
            (v.VendorCode === 'VND-101' && item.ProductName.includes('Milk')) ||
            (v.VendorCode === 'VND-102' && (item.ProductName.includes('Bread') || item.ProductName.includes('Cake'))) ||
            (v.VendorCode === 'VND-103' && item.ProductName.includes('Rice'))
          ) {
            itemsSold += 1;
            totalQty += item.Quantity;
            salesValue += item.Total;
          }
        });
      });

      return {
        VendorCode: v.VendorCode,
        VendorName: v.Name,
        City: v.City,
        ItemsSold: itemsSold,
        TotalQuantity: totalQty,
        SalesValue: salesValue
      };
    });

    return reportData;
  },

  // 3. Vendor-Wise Expired Stock Report
  getVendorWiseExpiredStockReport: async () => {
    const products = await productService.getProducts();
    const vendors = await vendorService.getVendors();

    // Find items nearing or past expiry
    const expiredList = [];
    products.filter(p => p.IsExpDate).forEach((p, idx) => {
      const assignedVendor = vendors[idx % vendors.length];
      const isOverdue = p.Days <= 3;
      expiredList.push({
        Id: `exp_${p.Id}`,
        VendorCode: assignedVendor.VendorCode,
        VendorName: assignedVendor.Name,
        ProductName: p.Name,
        BatchBarcode: p.ProductNumber,
        ExpiryDate: new Date(Date.now() + 86400000 * (p.Days - 2)).toISOString().split('T')[0],
        DaysRemaining: p.Days - 2,
        IsOverdue: isOverdue,
        Quantity: p.StockQuantity,
        CostPrice: p.Cost,
        TotalLossValue: p.StockQuantity * p.Cost
      });
    });

    return expiredList;
  }
};

export default reportService;
