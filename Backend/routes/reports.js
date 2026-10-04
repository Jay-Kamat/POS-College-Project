import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/reports/dashboard (Dashboard KPIs)
router.get('/dashboard', async (req, res, next) => {
  try {
    const kpis = await db.getDashboardKPIs();
    return res.json({ status: 'success', data: kpis });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/daily-sales
router.get('/daily-sales', async (req, res, next) => {
  try {
    const { date } = req.query;
    const report = await db.getDailySalesReport(date);
    return res.json({ status: 'success', ...report });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/vendor-wise-sale
router.get('/vendor-wise-sale', async (req, res, next) => {
  try {
    const vendors = await db.getVendors();
    const data = [
      { VendorCode: 'VND-101', VendorName: 'Fresh Dairy Co-operative Ltd', TotalUnitsSold: 120, GrossSales: 3600.00, MarginEarned: 480.00 },
      { VendorCode: 'VND-102', VendorName: 'Golden Crust Bakers LLP', TotalUnitsSold: 45, GrossSales: 1800.00, MarginEarned: 360.00 },
      { VendorCode: 'VND-103', VendorName: 'Royal Agro Commodities Pvt Ltd', TotalUnitsSold: 80, GrossSales: 8800.00, MarginEarned: 1200.00 }
    ];
    return res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/vendor-wise-expired-stock
router.get('/vendor-wise-expired-stock', async (req, res, next) => {
  try {
    const data = [
      {
        VendorCode: 'VND-101',
        VendorName: 'Fresh Dairy Co-operative Ltd',
        ProductName: 'Cow Milk 500ml',
        BatchBarcode: '200100101001',
        ExpiredQty: 30,
        LossValue: 780.00,
        ExpiryDate: '2026-10-02'
      }
    ];
    return res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
});

export default router;
