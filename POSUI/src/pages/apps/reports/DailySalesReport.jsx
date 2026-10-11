import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  FileDownload as ExportIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  TrendingUp as RevenueIcon,
  ReceiptLong as InvoicesIcon,
  Payments as CashIcon,
  QrCode2 as UpiIcon,
  AccountBalance as TaxIcon,
  Visibility as ViewIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import reportService from '../../../_api/reportService';
import { exportToCsv } from '../../../utils/exportCsv';

export default function DailySalesReport() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('ALL');

  // Day invoices inspection dialog
  const [dayDialog, setDayDialog] = useState(false);
  const [selectedDayRow, setSelectedDayRow] = useState(null);
  const [dayInvoices, setDayInvoices] = useState([]);
  const [loadingDayInvoices, setLoadingDayInvoices] = useState(false);

  const loadData = async (dateParam = '') => {
    setLoading(true);
    try {
      const res = await reportService.getDailySalesReport({ date: dateParam });
      setData(res || []);
      if (res?.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Failed to load daily sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate === 'ALL' ? '' : selectedDate);
  }, [selectedDate]);

  // Aggregate stats from data
  const totalRevenue = data.reduce((s, d) => s + Number(d.GrandTotal || 0), 0);
  const totalCash = data.reduce((s, d) => s + Number(d.CashTotal || 0), 0);
  const totalUpi = data.reduce((s, d) => s + Number(d.UpiTotal || 0), 0);
  const totalTax = data.reduce((s, d) => s + Number(d.TaxCollected || 0), 0);
  const totalBills = data.reduce((s, d) => s + Number(d.InvoicesCount || 0), 0);

  const handleExport = () => {
    exportToCsv(
      `Daily_Sales_Report_${selectedDate}`,
      data,
      [
        { key: 'Date', label: 'Date' },
        { key: 'InvoicesCount', label: 'Invoices Count' },
        { key: 'CashTotal', label: 'Cash Sales (INR)' },
        { key: 'UpiTotal', label: 'UPI Sales (INR)' },
        { key: 'TaxCollected', label: 'Tax Collected (INR)' },
        { key: 'GrandTotal', label: 'Grand Total (INR)' }
      ]
    );
  };

  const handleOpenDayInvoices = async (row) => {
    setSelectedDayRow(row);
    setDayDialog(true);
    setLoadingDayInvoices(true);
    try {
      const res = await reportService.getDailySalesReport({ date: row.Date });
      setDayInvoices(res?.invoices || []);
    } catch (err) {
      console.warn('Failed to load invoices for date:', err);
      setDayInvoices([]);
    } finally {
      setLoadingDayInvoices(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/apps/reports')}
            sx={{
              color: '#4B5563',
              bgcolor: '#F3F4F6',
              fontWeight: 600,
              borderRadius: 2,
              '&:hover': { bgcolor: '#E5E7EB' }
            }}
          >
            Hub
          </Button>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
              Daily Sales Summary
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              Statutory GST sales audit, tender mode reconciliation, and daily billing volume.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Date Filter</InputLabel>
            <Select
              value={selectedDate}
              label="Date Filter"
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              <MenuItem value="ALL">All Recorded Dates</MenuItem>
              {data.map((d) => (
                <MenuItem key={d.Date} value={d.Date}>
                  {d.Date} ({d.InvoicesCount} bills)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadData(selectedDate === 'ALL' ? '' : selectedDate)}
            disabled={loading}
            sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<ExportIcon />}
            onClick={handleExport}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              textTransform: 'none',
              bgcolor: '#2563EB',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              '&:hover': { bgcolor: '#1D4ED8' }
            }}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* KPI Metric Strip */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Total Revenue */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Gross Sales
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#2563EB', mt: 0.5 }}>
                    ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#DBEAFE', color: '#2563EB', width: 42, height: 42 }}>
                  <RevenueIcon fontSize="small" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Invoices */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F3FF 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Invoices Billed
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#7C3AED', mt: 0.5 }}>
                    {totalBills} Bills
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#EDE9FE', color: '#7C3AED', width: 42, height: 42 }}>
                  <InvoicesIcon fontSize="small" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cash Collections */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #ECFDF5 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Cash Collections
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                    ₹{totalCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#D1FAE5', color: '#059669', width: 42, height: 42 }}>
                  <CashIcon fontSize="small" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* UPI Collections */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    UPI Digital
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#D97706', mt: 0.5 }}>
                    ₹{totalUpi.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 42, height: 42 }}>
                  <UpiIcon fontSize="small" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* GST Tax Collected */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Tax Collected
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#16A34A', mt: 0.5 }}>
                    ₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#DCFCE7', color: '#16A34A', width: 42, height: 42 }}>
                  <TaxIcon fontSize="small" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Daily Data Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 3,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Calendar Date</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Invoices Count</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Cash Tender (₹)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>UPI Tender (₹)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>GST Collected (₹)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Gross Revenue (₹)</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Audit Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} sx={{ color: '#2563EB', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: '#6B7280' }}>
                    Compiling daily ledger...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
                    No recorded sales found for selected period
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.Date}
                  hover
                  sx={{
                    '&:hover': { bgcolor: '#F8FAFC' },
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <TableCell sx={{ fontWeight: 700, color: '#1E293B', py: 1.8 }}>
                    {row.Date}
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.8 }}>
                    <Chip
                      label={`${row.InvoicesCount} bills`}
                      size="small"
                      sx={{ bgcolor: '#EEF2FF', color: '#4338CA', fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#059669', py: 1.8 }}>
                    ₹{Number(row.CashTotal || 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#D97706', py: 1.8 }}>
                    ₹{Number(row.UpiTotal || 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#16A34A', py: 1.8 }}>
                    ₹{Number(row.TaxCollected || 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#2563EB', fontSize: '1rem', py: 1.8 }}>
                    ₹{Number(row.GrandTotal || 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.8 }}>
                    <Tooltip title="View Invoices for this date">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ViewIcon />}
                        onClick={() => handleOpenDayInvoices(row)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          borderRadius: 2,
                          borderColor: '#CBD5E1',
                          color: '#334155',
                          '&:hover': { bgcolor: '#F1F5F9', borderColor: '#94A3B8' }
                        }}
                      >
                        Invoices
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Date Invoices Inspection Dialog */}
      <Dialog
        open={dayDialog}
        onClose={() => setDayDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827' }}>
              Invoices for {selectedDayRow?.Date}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              Total Bills: {selectedDayRow?.InvoicesCount} | Total Revenue: ₹{Number(selectedDayRow?.GrandTotal || 0).toFixed(2)}
            </Typography>
          </Box>
          <IconButton onClick={() => setDayDialog(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingDayInvoices ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={30} sx={{ color: '#2563EB' }} />
            </Box>
          ) : dayInvoices.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#6B7280', textAlign: 'center', py: 3 }}>
              No individual invoices found for this date.
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #E5E7EB' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Tender</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Tax (₹)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Total (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dayInvoices.map((inv) => {
                    const docNo = inv.DocumentNumber || inv.documentnumber || inv.Id || inv.id;
                    const mode = inv.ModeOfPayment ?? inv.modeofpayment ?? 0;
                    const tax = Number(inv.Cgst || inv.cgst || 0) + Number(inv.Sgst || inv.sgst || 0) + Number(inv.Igst || inv.igst || 0);
                    const amt = Number(inv.Amount || inv.amount || 0);

                    return (
                      <TableRow key={inv.Id || inv.id || docNo} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E293B' }}>
                          {docNo}
                        </TableCell>
                        <TableCell sx={{ color: '#64748B' }}>
                          {inv.Date || inv.date ? new Date(inv.Date || inv.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={mode === 0 ? 'Cash' : mode === 1 ? 'UPI' : 'Card'}
                            size="small"
                            sx={{
                              bgcolor: mode === 0 ? '#DCFCE7' : '#DBEAFE',
                              color: mode === 0 ? '#15803D' : '#1D4ED8',
                              fontWeight: 700,
                              fontSize: '0.72rem'
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#64748B' }}>
                          ₹{tax.toFixed(2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#0F172A' }}>
                          ₹{amt.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setDayDialog(false)} sx={{ bgcolor: '#1E293B' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
