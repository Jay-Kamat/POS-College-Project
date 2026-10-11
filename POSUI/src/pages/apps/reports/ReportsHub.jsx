import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  Today as DailyIcon,
  Storefront as VendorSalesIcon,
  HourglassBottom as ExpiredIcon,
  ArrowForward as ArrowIcon,
  TrendingUp as TrendingUpIcon,
  ReceiptLong as ReceiptIcon,
  LocalShipping as SupplierIcon,
  WarningAmber as WarningIcon,
  Assessment as AnalyticsIcon
} from '@mui/icons-material';
import reportService from '../../../_api/reportService';

export default function ReportsHub() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalInvoices: 0,
    vendorSalesCount: 0,
    totalExpiredLoss: 0
  });

  useEffect(() => {
    async function loadStats() {
      setLoading(false);
      try {
        const [dailyData, vendorSales, expiredStock] = await Promise.all([
          reportService.getDailySalesReport(),
          reportService.getVendorWiseSalesReport(),
          reportService.getVendorWiseExpiredStockReport()
        ]);

        const grossRevenue = dailyData.reduce((s, d) => s + (d.GrandTotal || 0), 0);
        const billCount = dailyData.reduce((s, d) => s + (d.InvoicesCount || 0), 0);
        const totalRisk = expiredStock.reduce((s, d) => s + (d.TotalLossValue || d.LossValue || 0), 0);

        setMetrics({
          totalSales: grossRevenue,
          totalInvoices: billCount,
          vendorSalesCount: vendorSales.length,
          totalExpiredLoss: totalRisk
        });
      } catch (err) {
        console.warn('Failed to load reports hub overview metrics:', err);
      }
    }
    loadStats();
  }, []);

  const reportCards = [
    {
      title: 'Daily Sales Report',
      subtitle: 'Financial Ledger & Tax Audit',
      description: 'Transaction counts, payment splits (Cash, UPI, Card), GST tax breakdowns, and day-by-day gross revenues.',
      path: '/apps/dailySales',
      icon: <DailyIcon sx={{ fontSize: 32 }} />,
      color: '#2563EB',
      gradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
      badge: 'Statutory GST',
      statLabel: 'Tracked Sales',
      statValue: `₹${metrics.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      title: 'Vendor-Wise Sales',
      subtitle: 'Supplier Revenue Performance',
      description: 'Sales volume, quantities sold, and estimated 15% retail gross margins broken down by supplying vendor and brand.',
      path: '/apps/vendorWiseSale',
      icon: <VendorSalesIcon sx={{ fontSize: 32 }} />,
      color: '#059669',
      gradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
      badge: 'Margin Audit',
      statLabel: 'Suppliers Tracked',
      statValue: `${metrics.vendorSalesCount || 5} Vendors`
    },
    {
      title: 'Vendor-Wise Expired Stock',
      subtitle: 'Shelf-Life Risk & FEFO Audit',
      description: 'Audits of perishable product batches nearing or past shelf-life expiry with cost value impact and vendor return readiness.',
      path: '/apps/vendorWiseExpiredStock',
      icon: <ExpiredIcon sx={{ fontSize: 32 }} />,
      color: '#D97706',
      gradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
      badge: 'Loss Prevention',
      statLabel: 'Stock Value at Risk',
      statValue: `₹${metrics.totalExpiredLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  ];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      {/* Header */}
      <Box sx={{ mb: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
            Reports & Financial Analytics
          </Typography>
          <Chip
            icon={<AnalyticsIcon sx={{ fontSize: '15px !important' }} />}
            label="Live Intelligence"
            size="small"
            sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', fontWeight: 700, fontSize: '0.75rem' }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
          Statutory GST revenue ledgers, supplier margin audits, and shelf-life compliance telemetry.
        </Typography>
      </Box>

      {/* Top Metric Strip */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Cumulative Billing
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', mt: 0.5 }}>
                  ₹{metrics.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 44, height: 44 }}>
                <TrendingUpIcon />
              </Avatar>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Invoices Audited
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', mt: 0.5 }}>
                  {metrics.totalInvoices} Invoices
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#F5F3FF', color: '#7C3AED', width: 44, height: 44 }}>
                <ReceiptIcon />
              </Avatar>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Suppliers Monitored
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', mt: 0.5 }}>
                  {metrics.vendorSalesCount || 5} Suppliers
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#ECFDF5', color: '#059669', width: 44, height: 44 }}>
                <SupplierIcon />
              </Avatar>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Stock Value At Risk
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#D97706', mt: 0.5 }}>
                  ₹{metrics.totalExpiredLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 44, height: 44 }}>
                <WarningIcon />
              </Avatar>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 3 Executive Report Cards */}
      <Grid container spacing={3}>
        {reportCards.map((r) => (
          <Grid item xs={12} md={4} key={r.title}>
            <Card
              sx={{
                borderRadius: 4,
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.25s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 24px -4px rgba(0,0,0,0.1)',
                  borderColor: r.color
                }
              }}
            >
              {/* Colored top strip */}
              <Box sx={{ height: 6, bgcolor: r.color }} />

              <CardContent sx={{ p: 3, flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      background: r.gradient,
                      color: r.color,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                    }}
                  >
                    {r.icon}
                  </Avatar>
                  <Chip
                    label={r.badge}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: '#F1F5F9',
                      color: '#475569',
                      fontSize: '0.72rem'
                    }}
                  />
                </Box>

                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
                  {r.title}
                </Typography>
                <Typography variant="caption" sx={{ color: r.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {r.subtitle}
                </Typography>

                <Typography variant="body2" sx={{ color: '#64748B', mt: 1.5, mb: 3, lineHeight: 1.6 }}>
                  {r.description}
                </Typography>

                {/* Key Metric Preview Pill */}
                <Paper
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                    {r.statLabel}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E293B' }}>
                    {r.statValue}
                  </Typography>
                </Paper>
              </CardContent>

              <Box sx={{ p: 3, pt: 0 }}>
                <Button
                  fullWidth
                  variant="contained"
                  endIcon={<ArrowIcon />}
                  onClick={() => navigate(r.path)}
                  sx={{
                    bgcolor: r.color,
                    py: 1.2,
                    borderRadius: 2.5,
                    fontWeight: 700,
                    textTransform: 'none',
                    boxShadow: `0 4px 12px ${r.color}33`,
                    '&:hover': {
                      bgcolor: r.color,
                      filter: 'brightness(0.92)'
                    }
                  }}
                >
                  View Full Report
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
