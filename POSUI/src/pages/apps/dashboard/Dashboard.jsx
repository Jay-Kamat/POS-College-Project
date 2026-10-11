import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  CurrencyRupee as RupeeIcon,
  Receipt as InvoiceIcon,
  ShoppingBag as ItemIcon,
  WarningAmber as AlertIcon,
  PointOfSale as PosIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  AccountBalanceWallet as CashIcon,
  QrCode2 as UpiIcon,
  Inventory2 as ProductIcon
} from '@mui/icons-material';
import invoiceService from '../../../_api/invoiceService';
import productService from '../../../_api/productService';
import reportService from '../../../_api/reportService';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalSales: 0,
    cashSales: 0,
    upiSales: 0,
    cardSales: 0,
    totalTax: 0,
    invoiceCount: 0,
    totalInvoices: 0,
    totalProducts: 0,
    lowStockCount: 0,
    expiringCount: 0,
    expiredCount: 0
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [expiringProducts, setExpiringProducts] = useState([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [kpiData, invList, prodList] = await Promise.all([
        reportService.getDashboardKPIs(),
        invoiceService.getInvoices({ status: 'all' }),
        productService.getProducts()
      ]);

      // Set Recent Invoices (top 6 latest)
      const topInvoices = (invList || []).slice(0, 6);
      setRecentInvoices(topInvoices);

      // Set Expiring Products (FEFO: shelf life <= 7 days)
      const expProds = (prodList || [])
        .filter(p => p.IsExpDate)
        .sort((a, b) => (a.Days || 999) - (b.Days || 999))
        .slice(0, 6);
      setExpiringProducts(expProds);

      // Derive or use backend KPIs
      const activeInvs = (invList || []).filter(i => (i.RecordStatus === 0 || i.record_status === 0));
      const totalSalesAmt = activeInvs.reduce((sum, i) => sum + Number(i.Amount || i.amount || 0), 0);
      const cashAmt = activeInvs.filter(i => (i.ModeOfPayment === 0 || i.mode_of_payment === 0)).reduce((sum, i) => sum + Number(i.Amount || i.amount || 0), 0);
      const upiAmt = activeInvs.filter(i => (i.ModeOfPayment === 1 || i.mode_of_payment === 1)).reduce((sum, i) => sum + Number(i.Amount || i.amount || 0), 0);
      const cardAmt = activeInvs.filter(i => (i.ModeOfPayment === 2 || i.mode_of_payment === 2)).reduce((sum, i) => sum + Number(i.Amount || i.amount || 0), 0);
      const taxAmt = activeInvs.reduce((sum, i) => sum + (Number(i.Cgst || i.cgst || 0) + Number(i.Sgst || i.sgst || 0) + Number(i.Igst || i.igst || 0)), 0);

      const lowStock = (prodList || []).filter(p => Number(p.StockQuantity || 0) < 20).length;
      const expiring = (prodList || []).filter(p => p.IsExpDate && (p.Days || 0) <= 5).length;

      setKpis({
        totalSales: kpiData?.totalSales ?? totalSalesAmt,
        cashSales: kpiData?.cashSales ?? cashAmt,
        upiSales: kpiData?.upiSales ?? upiAmt,
        cardSales: kpiData?.cardSales ?? cardAmt,
        totalTax: kpiData?.totalTax ?? taxAmt,
        invoiceCount: kpiData?.invoiceCount ?? activeInvs.length,
        totalInvoices: kpiData?.totalInvoices ?? (invList || []).length,
        totalProducts: kpiData?.totalProducts ?? (prodList || []).length,
        lowStockCount: kpiData?.lowStockCount ?? lowStock,
        expiringCount: kpiData?.expiringCount ?? expiring,
        expiredCount: kpiData?.expiredCount ?? 0
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalSalesVal = Number(kpis.totalSales || 0);
  const totalInvoicesCount = Number(kpis.invoiceCount || 0);
  const aov = totalInvoicesCount > 0 ? (totalSalesVal / totalInvoicesCount) : 0;

  const cashShare = totalSalesVal > 0 ? Math.round((kpis.cashSales / totalSalesVal) * 100) : 50;
  const upiShare = totalSalesVal > 0 ? Math.round((kpis.upiSales / totalSalesVal) * 100) : 50;

  return (
    <Box>
      {/* Top Header & Fast Action Launchpad */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h2" sx={{ fontWeight: 800, color: '#111827' }}>
              Executive Dashboard
            </Typography>
            <Chip
              label="Live Database"
              size="small"
              sx={{ bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 700, fontSize: 11 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            DailyMart Express Store #01 — Real-time revenue telemetry, counter sales, and FEFO inventory alerts.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDashboardData}
            sx={{ fontWeight: 600 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PosIcon />}
            onClick={() => navigate('/apps/bucket')}
            sx={{
              fontWeight: 700,
              px: 3,
              py: 1,
              bgcolor: '#3B5BDB',
              boxShadow: '0 4px 14px rgba(59, 91, 219, 0.3)',
              '&:hover': { bgcolor: '#2B44B8' }
            }}
          >
            Launch POS Terminal
          </Button>
        </Box>
      </Box>

      {/* 4 Core Financial & Inventory KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* 1. Today's Revenue */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2.5,
              border: '1px solid #E3E8EF',
              borderLeft: '5px solid #3B5BDB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Total Revenue
                </Typography>
                <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: '#EEF2FF', color: '#3B5BDB' }}>
                  <RupeeIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#1F2937' }}>
                ₹{totalSalesVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  label={`Cash: ₹${Number(kpis.cashSales || 0).toFixed(0)}`}
                  size="small"
                  sx={{ bgcolor: '#E7F5FF', color: '#1C7ED6', fontWeight: 600, fontSize: 11, height: 22 }}
                />
                <Chip
                  label={`UPI: ₹${Number(kpis.upiSales || 0).toFixed(0)}`}
                  size="small"
                  sx={{ bgcolor: '#F3F0FF', color: '#7950F2', fontWeight: 600, fontSize: 11, height: 22 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 2. Invoices Today */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2.5,
              border: '1px solid #E3E8EF',
              borderLeft: '5px solid #12B886',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Settled Invoices
                </Typography>
                <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: '#EBFBEE', color: '#12B886' }}>
                  <InvoiceIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#1F2937' }}>
                {totalInvoicesCount}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
                <Chip
                  label={`AOV: ₹${aov.toFixed(2)}`}
                  size="small"
                  sx={{ bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 600, fontSize: 11, height: 22 }}
                />
                <Typography variant="caption" color="text.secondary">
                  Tax: ₹{Number(kpis.totalTax || 0).toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 3. Active SKUs / Catalog */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2.5,
              border: '1px solid #E3E8EF',
              borderLeft: '5px solid #7950F2',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Active Catalog SKUs
                </Typography>
                <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: '#F3F0FF', color: '#7950F2' }}>
                  <ItemIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#1F2937' }}>
                {kpis.totalProducts}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
                {kpis.lowStockCount > 0 ? (
                  <Chip
                    label={`${kpis.lowStockCount} Low stock (<20)`}
                    size="small"
                    sx={{ bgcolor: '#FFF4E6', color: '#D9480F', fontWeight: 600, fontSize: 11, height: 22 }}
                  />
                ) : (
                  <Chip
                    label="All items healthy"
                    size="small"
                    sx={{ bgcolor: '#F3F0FF', color: '#7950F2', fontWeight: 600, fontSize: 11, height: 22 }}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 4. Expiring Batches Alert */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2.5,
              border: '1px solid #E3E8EF',
              borderLeft: '5px solid #F59F00',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Expiring Soon (FEFO)
                </Typography>
                <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: '#FFF9DB', color: '#F59F00' }}>
                  <AlertIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: kpis.expiringCount > 0 ? '#E8590C' : '#1F2937' }}>
                {kpis.expiringCount}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
                <Chip
                  label={kpis.expiringCount > 0 ? 'Requires attention' : 'No near expiry'}
                  size="small"
                  sx={{
                    bgcolor: kpis.expiringCount > 0 ? '#FFF4E6' : '#EBFBEE',
                    color: kpis.expiringCount > 0 ? '#E8590C' : '#2F9E44',
                    fontWeight: 600,
                    fontSize: 11,
                    height: 22
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payment Channel Velocity Strip */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2.5, border: '1px solid #E3E8EF' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CashIcon sx={{ color: '#1C7ED6', fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1F2937' }}>
              Counter Payment Split
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#1C7ED6' }}>
              Cash: ₹{Number(kpis.cashSales || 0).toFixed(2)} ({cashShare}%)
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#7950F2' }}>
              UPI: ₹{Number(kpis.upiSales || 0).toFixed(2)} ({upiShare}%)
            </Typography>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={cashShare}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: '#F3F0FF',
            '& .MuiLinearProgress-bar': { bgcolor: '#1C7ED6', borderRadius: 4 }
          }}
        />
      </Paper>

      {/* Main Grid: Recent Sales Invoices & FEFO Batches */}
      <Grid container spacing={3}>
        {/* Left: Recent Invoices */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #E3E8EF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1F2937' }}>
                  Recent Sales Invoices
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Latest counter checkouts. Click any invoice to inspect or reprint.
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/apps/invoice')}
                sx={{ fontWeight: 700, color: '#3B5BDB' }}
              >
                View All
              </Button>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Mode</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>View</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#9CA3AF' }}>
                        No invoices recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentInvoices.map((inv) => {
                      const id = inv.Id || inv.id;
                      const docNum = inv.DocumentNumber || inv.document_number;
                      const isCancelled = (inv.RecordStatus === 1 || inv.record_status === 1);
                      const mode = (inv.ModeOfPayment === 0 || inv.mode_of_payment === 0) ? 'Cash' : ((inv.ModeOfPayment === 1 || inv.mode_of_payment === 1) ? 'UPI' : 'Card');
                      const amt = Number(inv.Amount || inv.amount || 0);

                      return (
                        <TableRow
                          key={id}
                          hover
                          onClick={() => navigate(`/apps/invoice/${id}`)}
                          sx={{
                            cursor: 'pointer',
                            opacity: isCancelled ? 0.72 : 1,
                            bgcolor: isCancelled ? '#FFF5F5' : 'inherit',
                            '&:hover': { bgcolor: isCancelled ? '#FFE3E3' : '#F8FAFC' }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 700, color: isCancelled ? '#E03131' : '#3B5BDB' }}>
                            {docNum}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {inv.CustomerName || inv.customer_name || 'Walk-in'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={mode}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: 11,
                                height: 20,
                                bgcolor: mode === 'Cash' ? '#E7F5FF' : (mode === 'UPI' ? '#F3F0FF' : '#FFF4E6'),
                                color: mode === 'Cash' ? '#1C7ED6' : (mode === 'UPI' ? '#7950F2' : '#E8590C')
                              }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: isCancelled ? '#C92A2A' : '#111827' }}>
                            ₹{amt.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {!isCancelled ? (
                              <Chip label="Paid" size="small" sx={{ bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 700, height: 20, fontSize: 11 }} />
                            ) : (
                              <Chip label="Cancelled" size="small" sx={{ bgcolor: '#FFE3E3', color: '#E03131', fontWeight: 700, height: 20, fontSize: 11 }} />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="View Invoice">
                              <IconButton size="small" sx={{ color: '#3B5BDB' }}>
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Right: Batches Expiring Soon (FEFO) */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #E3E8EF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1F2937' }}>
                  FEFO Expiry Watch
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Perishable items prioritizing First-Expiry-First-Out sales.
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/apps/product')}
                sx={{ fontWeight: 700, color: '#7950F2' }}
              >
                Products
              </Button>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Shelf Life</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Stock</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expiringProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4, color: '#9CA3AF' }}>
                        No perishable batches found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    expiringProducts.map((prod) => {
                      const days = Number(prod.Days || 0);
                      const isCritical = days <= 2;
                      const isWarning = days <= 5;

                      return (
                        <TableRow
                          key={prod.Id}
                          hover
                          onClick={() => navigate('/apps/product')}
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC' } }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {prod.Name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              SKU: {prod.ProductNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${days} ${days === 1 ? 'Day' : 'Days'}`}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: 11,
                                height: 20,
                                bgcolor: isCritical ? '#FFE3E3' : (isWarning ? '#FFF4E6' : '#FFF9DB'),
                                color: isCritical ? '#E03131' : (isWarning ? '#E8590C' : '#D9480F')
                              }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: '#1F2937' }}>
                            {prod.StockQuantity} {prod.Unit || 'PCS'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
