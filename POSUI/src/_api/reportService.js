import apiClient from './apiClient';

export const reportService = {
  // 1. Daily Sales Report
  getDailySalesReport: async ({ startDate, endDate, date } = {}) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const data = await apiClient.get(`/api/reports/daily-sales${queryString}`);

    if (data) {
      if (Array.isArray(data.dailyBreakdown)) {
        const arr = [...data.dailyBreakdown];
        arr.summary = data.summary;
        arr.invoices = data.invoices || [];
        return arr;
      }
      if (Array.isArray(data)) {
        return data;
      }
      if (data.invoices && Array.isArray(data.invoices)) {
        const grouped = {};
        data.invoices.forEach(inv => {
          const dateKey = (inv.Date || inv.date || '').split('T')[0] || 'Unknown';
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
          const amt = Number(inv.Amount || inv.amount || 0);
          const mode = Number(inv.ModeOfPayment ?? inv.mode_of_payment ?? 0);
          if (mode === 0) grouped[dateKey].CashTotal += amt;
          else grouped[dateKey].UpiTotal += amt;
          grouped[dateKey].TaxCollected += Number(inv.Cgst || inv.cgst || 0) + Number(inv.Sgst || inv.sgst || 0) + Number(inv.Igst || inv.igst || 0);
          grouped[dateKey].GrandTotal += amt;
        });
        const list = Object.values(grouped).sort((a, b) => b.Date.localeCompare(a.Date));
        list.summary = data.summary;
        list.invoices = data.invoices;
        return list;
      }
    }
    return [];
  },

  // 2. Vendor-Wise Sales Report
  getVendorWiseSalesReport: async () => {
    const data = await apiClient.get('/api/reports/vendor-wise-sale');
    return Array.isArray(data) ? data : [];
  },

  // 3. Vendor-Wise Expired Stock Report (powered by stock_batches in DB)
  getVendorWiseExpiredStockReport: async () => {
    const data = await apiClient.get('/api/reports/vendor-wise-expired-stock');
    if (Array.isArray(data)) {
      return data.map(item => {
        const val = Number(item.TotalLossValue ?? item.LossValue ?? (Number(item.Quantity || 0) * Number(item.CostPrice || item.Cost || 0)) ?? 0);
        return {
          ...item,
          TotalLossValue: val,
          LossValue: val
        };
      });
    }
    return [];
  },

  // 4. Dashboard Summary KPIs
  getDashboardKPIs: async () => {
    return await apiClient.get('/api/reports/dashboard');
  }
};

export default reportService;
