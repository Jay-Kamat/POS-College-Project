import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Grid,
  Select,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  CancelOutlined as CancelIcon,
  Print as PrintIcon,
  WhatsApp as WhatsAppIcon,
  Receipt as ReceiptIcon,
  ReceiptLong as ThermalIcon,
  Description as A4Icon,
  Visibility as ViewIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  AttachMoney as SalesIcon,
  AccountBalanceWallet as CashIcon,
  QrCode2 as UpiIcon,
  EventNote as DateIcon
} from '@mui/icons-material';
import invoiceService from '../../../_api/invoiceService';
import whatsappService from '../../../_api/whatsappService';
import { printThermalReceipt, printA4Invoice } from '../../../utils/printService';
import { formatQtyWithUnit } from '../../../utils/uomHelper';

export default function InvoiceList() {
  const navigate = useNavigate();

  // State
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    TotalInvoices: 0,
    ActiveInvoices: 0,
    CancelledInvoices: 0,
    TotalSales: 0,
    CashSales: 0,
    UpiSales: 0,
    CardSales: 0,
    TotalTax: 0
  });
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'cancelled'
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | '0' | '1' | '2'
  const [dateRangePreset, setDateRangePreset] = useState('all'); // 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // UI Dialogs
  const [printAnchor, setPrintAnchor] = useState({ el: null, invoice: null });
  const [cancelModal, setCancelModal] = useState({ open: false, invoice: null, reason: '' });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  // Compute actual date filters based on preset
  const computedDates = useMemo(() => {
    const now = new Date();
    if (dateRangePreset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      return { start: todayStr, end: todayStr };
    }
    if (dateRangePreset === 'yesterday') {
      const yest = new Date(now.getTime() - 86400000);
      const yestStr = yest.toISOString().split('T')[0];
      return { start: yestStr, end: yestStr };
    }
    if (dateRangePreset === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      return { start: weekAgo.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    }
    if (dateRangePreset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: firstDay.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    }
    if (dateRangePreset === 'custom') {
      return { start: startDate, end: endDate };
    }
    return { start: '', end: '' };
  }, [dateRangePreset, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        invoiceService.getInvoices({
          search,
          status: statusFilter,
          paymentMode: paymentFilter,
          startDate: computedDates.start,
          endDate: computedDates.end
        }),
        invoiceService.getInvoiceStats()
      ]);
      setInvoices(list || []);
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setToast({ open: true, message: 'Failed to fetch invoices', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setPage(0);
  }, [search, statusFilter, paymentFilter, computedDates]);

  // Actions
  const handleOpenCancel = (invoice, e) => {
    if (e) e.stopPropagation();
    setCancelModal({ open: true, invoice, reason: '' });
  };

  const handleConfirmCancel = async () => {
    if (cancelModal.reason.trim().length < 10) {
      setToast({ open: true, message: 'Cancellation reason must be at least 10 characters.', severity: 'error' });
      return;
    }
    try {
      await invoiceService.cancelInvoice(cancelModal.invoice.Id || cancelModal.invoice.id, cancelModal.reason);
      setToast({ open: true, message: `Invoice ${cancelModal.invoice.DocumentNumber || cancelModal.invoice.document_number} cancelled and stock restored.`, severity: 'success' });
      setCancelModal({ open: false, invoice: null, reason: '' });
      loadData();
    } catch (err) {
      setToast({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleSendWhatsApp = async (inv, e) => {
    if (e) e.stopPropagation();
    setToast({ open: true, message: `Sending receipt to ${inv.MobileNumber || inv.mobile_number}...`, severity: 'info' });
    const res = await whatsappService.sendInvoiceReceipt(inv);
    if (res.success) {
      setToast({ open: true, message: 'WhatsApp receipt sent successfully!', severity: 'success' });
    } else {
      setToast({ open: true, message: res.error || 'Failed to dispatch WhatsApp receipt.', severity: 'warning' });
    }
  };

  const handleExportCSV = () => {
    if (invoices.length === 0) {
      setToast({ open: true, message: 'No invoices available to export', severity: 'warning' });
      return;
    }

    const headers = [
      'Invoice Number',
      'Date',
      'Time',
      'Customer Name',
      'Mobile Number',
      'Payment Mode',
      'Items Count',
      'Taxable Subtotal (₹)',
      'CGST (₹)',
      'SGST (₹)',
      'Round Off (₹)',
      'Grand Total (₹)',
      'Status',
      'Cancellation Reason'
    ];

    const rows = invoices.map(inv => {
      const d = new Date(inv.Date || inv.date);
      const dateStr = d.toLocaleDateString('en-IN');
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const mode = (inv.ModeOfPayment === 0 || inv.mode_of_payment === 0) ? 'Cash' : ((inv.ModeOfPayment === 1 || inv.mode_of_payment === 1) ? 'UPI' : 'Card');
      const status = (inv.RecordStatus === 1 || inv.record_status === 1) ? 'Cancelled' : 'Paid';
      const itemsCount = inv.Items?.length || 0;

      return [
        `"${inv.DocumentNumber || inv.document_number}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${(inv.CustomerName || inv.customer_name || 'Walk-in').replace(/"/g, '""')}"`,
        `"${inv.MobileNumber || inv.mobile_number || ''}"`,
        `"${mode}"`,
        itemsCount,
        Number(inv.Subtotal || inv.subtotal || 0).toFixed(2),
        Number(inv.Cgst || inv.cgst || 0).toFixed(2),
        Number(inv.Sgst || inv.sgst || 0).toFixed(2),
        Number(inv.RoundOff || inv.round_off || 0).toFixed(2),
        Number(inv.Amount || inv.amount || 0).toFixed(2),
        `"${status}"`,
        `"${(inv.CancellationReason || inv.cancellation_reason || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const todayStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `DailyMart_Sales_Invoices_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToast({ open: true, message: `Exported ${invoices.length} invoices to CSV.`, severity: 'success' });
  };

  // Pagination slice
  const paginatedInvoices = useMemo(() => {
    const start = page * rowsPerPage;
    return invoices.slice(start, start + rowsPerPage);
  }, [invoices, page, rowsPerPage]);

  return (
    <Box>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 700, color: '#111827' }}>
            Sales Invoices
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive transaction ledger, GST compliance, receipt reprint, and audit controls.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ fontWeight: 600 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ExportIcon />}
            onClick={handleExportCSV}
            sx={{ fontWeight: 600, bgcolor: '#3B5BDB', '&:hover': { bgcolor: '#2B44B8' } }}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* KPI Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Total Sales */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #E3E8EF', bgcolor: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                Total Revenue
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: '#EBFBEE', color: '#2F9E44' }}>
                <SalesIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1F2937' }}>
              ₹{Number(stats.TotalSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stats.ActiveInvoices || 0} active transactions
            </Typography>
          </Paper>
        </Grid>

        {/* Total Invoices */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #E3E8EF', bgcolor: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                Total Bills
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: '#EEF2FF', color: '#3B5BDB' }}>
                <ReceiptIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1F2937' }}>
              {stats.TotalInvoices || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tax Collected: ₹{Number(stats.TotalTax || 0).toFixed(2)}
            </Typography>
          </Paper>
        </Grid>

        {/* Cash Sales */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #E3E8EF', bgcolor: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                Cash Collections
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: '#E7F5FF', color: '#1C7ED6' }}>
                <CashIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1F2937' }}>
              ₹{Number(stats.CashSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Physical counter cash
            </Typography>
          </Paper>
        </Grid>

        {/* UPI Sales */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #E3E8EF', bgcolor: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                UPI / Digital
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: '#F3F0FF', color: '#7950F2' }}>
                <UpiIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1F2937' }}>
              ₹{Number(stats.UpiSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              QR & Online gateway
            </Typography>
          </Paper>
        </Grid>

        {/* Cancelled Invoices */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #E3E8EF', bgcolor: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                Cancelled Bills
              </Typography>
              <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: '#FFE3E3', color: '#E03131' }}>
                <CancelIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#E03131' }}>
              {stats.CancelledInvoices || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Reversed & Restocked
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, border: '1px solid #E3E8EF' }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search Term */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by invoice #, customer name, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#9CA3AF' }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
            />
          </Grid>

          {/* Date Range Preset */}
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateRangePreset}
                label="Date Range"
                onChange={(e) => setDateRangePreset(e.target.value)}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="yesterday">Yesterday</MenuItem>
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="custom">Custom Date</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Payment Mode */}
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Payment Mode</InputLabel>
              <Select
                value={paymentFilter}
                label="Payment Mode"
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <MenuItem value="all">All Modes</MenuItem>
                <MenuItem value="0">Cash Only</MenuItem>
                <MenuItem value="1">UPI Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Status Filter Chips */}
          <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
            <Chip
              label={`All (${invoices.length})`}
              clickable
              color={statusFilter === 'all' ? 'primary' : 'default'}
              onClick={() => setStatusFilter('all')}
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label="Active (Paid)"
              clickable
              color={statusFilter === 'active' ? 'success' : 'default'}
              onClick={() => setStatusFilter('active')}
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label="Cancelled"
              clickable
              color={statusFilter === 'cancelled' ? 'error' : 'default'}
              onClick={() => setStatusFilter('cancelled')}
              sx={{ fontWeight: 600 }}
            />
          </Grid>
        </Grid>

        {/* Custom Date Range Pickers (conditional) */}
        {dateRangePreset === 'custom' && (
          <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: '1px solid #F1F5F9', alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              type="date"
              label="From Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 180 }}
            />
            <TextField
              size="small"
              type="date"
              label="To Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 180 }}
            />
            <Button
              size="small"
              variant="text"
              onClick={() => { setStartDate(''); setEndDate(''); }}
            >
              Clear Dates
            </Button>
          </Box>
        )}
      </Paper>

      {/* Invoices Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #E3E8EF' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Invoice #</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Date & Time</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Customer</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Items</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Payment Mode</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Subtotal</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>GST (₹)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 8, color: '#9CA3AF' }}>
                  <ReceiptIcon sx={{ fontSize: 52, mb: 1, color: '#CBD5E1' }} />
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#475569' }}>
                    No invoices found
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: '#94A3B8' }}>
                    Try adjusting search keywords or selecting "All Invoices" filter.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedInvoices.map((inv) => {
                const id = inv.Id || inv.id;
                const docNum = inv.DocumentNumber || inv.document_number;
                const d = new Date(inv.Date || inv.date);
                const isCancelled = (inv.RecordStatus === 1 || inv.record_status === 1);
                const mode = (inv.ModeOfPayment === 0 || inv.mode_of_payment === 0) ? 'Cash' : ((inv.ModeOfPayment === 1 || inv.mode_of_payment === 1) ? 'UPI' : 'Card');
                const subtotal = Number(inv.Subtotal || inv.subtotal || 0);
                const tax = Number(inv.Cgst || inv.cgst || 0) + Number(inv.Sgst || inv.sgst || 0) + Number(inv.Igst || inv.igst || 0);
                const totalAmt = Number(inv.Amount || inv.amount || 0);
                const itemsCount = inv.Items?.length || 0;

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
                    {/* Invoice Number */}
                    <TableCell sx={{ fontWeight: 700, color: isCancelled ? '#E03131' : '#3B5BDB' }}>
                      {docNum}
                    </TableCell>

                    {/* Date & Time */}
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {d.toLocaleDateString('en-IN')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {inv.CustomerName || inv.customer_name || 'Walk-in Customer'}
                      </Typography>
                      {(inv.MobileNumber || inv.mobile_number) && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          +91 {inv.MobileNumber || inv.mobile_number}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Items */}
                    <TableCell>
                      <Chip
                        label={`${itemsCount} ${itemsCount === 1 ? 'item' : 'items'}`}
                        size="small"
                        sx={{ bgcolor: '#F1F5F9', fontWeight: 600, fontSize: 11 }}
                      />
                    </TableCell>

                    {/* Payment Mode */}
                    <TableCell>
                      <Chip
                        label={mode}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: mode === 'Cash' ? '#E7F5FF' : (mode === 'UPI' ? '#F3F0FF' : '#FFF4E6'),
                          color: mode === 'Cash' ? '#1C7ED6' : (mode === 'UPI' ? '#7950F2' : '#E8590C')
                        }}
                      />
                    </TableCell>

                    {/* Subtotal */}
                    <TableCell align="right" sx={{ color: '#475569', fontWeight: 500 }}>
                      ₹{subtotal.toFixed(2)}
                    </TableCell>

                    {/* GST */}
                    <TableCell align="right" sx={{ color: '#475569', fontWeight: 500 }}>
                      ₹{tax.toFixed(2)}
                    </TableCell>

                    {/* Net Amount */}
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: 15, color: isCancelled ? '#C92A2A' : '#111827' }}>
                      ₹{totalAmt.toFixed(2)}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {!isCancelled ? (
                        <Chip
                          label="Paid"
                          size="small"
                          sx={{ bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 700, px: 0.5 }}
                        />
                      ) : (
                        <Tooltip title={inv.CancellationReason || inv.cancellation_reason || 'Cancelled'}>
                          <Chip
                            label="Cancelled"
                            size="small"
                            sx={{ bgcolor: '#FFE3E3', color: '#E03131', fontWeight: 700, px: 0.5 }}
                          />
                        </Tooltip>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="View Invoice">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/apps/invoice/${id}`)}
                            sx={{ color: '#3B5BDB', '&:hover': { bgcolor: '#EEF2FF' } }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Print Options">
                          <IconButton
                            size="small"
                            onClick={(e) => setPrintAnchor({ el: e.currentTarget, invoice: inv })}
                            sx={{ color: '#F59F00', '&:hover': { bgcolor: '#FFF9DB' } }}
                          >
                            <PrintIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {(inv.MobileNumber || inv.mobile_number) && (
                          <Tooltip title="Share via WhatsApp">
                            <IconButton
                              size="small"
                              onClick={(e) => handleSendWhatsApp(inv, e)}
                              sx={{ color: '#25D366', '&:hover': { bgcolor: '#EBFBEE' } }}
                            >
                              <WhatsAppIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {!isCancelled && (
                          <Tooltip title="Soft Cancel (Restores Stock)">
                            <IconButton
                              size="small"
                              onClick={(e) => handleOpenCancel(inv, e)}
                              sx={{ color: '#EF4444', '&:hover': { bgcolor: '#FFE3E3' } }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={invoices.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Cancel Invoice Modal */}
      <Dialog open={cancelModal.open} onClose={() => setCancelModal({ ...cancelModal, open: false })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#E03131', pb: 1 }}>
          Cancel Invoice {cancelModal.invoice?.DocumentNumber || cancelModal.invoice?.document_number}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2.5 }}>
            <strong>Soft Cancellation:</strong> This action will mark this invoice as cancelled and automatically reverse inventory stock back to catalog. The invoice sequence will remain intact for statutory audit compliance.
          </Alert>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Mandatory Cancellation Reason (Min 10 characters)"
            placeholder="e.g. Customer returned goods at counter, wrong billing item selected..."
            value={cancelModal.reason}
            onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
            helperText={`${cancelModal.reason.trim().length}/10 characters minimum`}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setCancelModal({ ...cancelModal, open: false })}>
            Dismiss
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmCancel}
            disabled={cancelModal.reason.trim().length < 10}
            sx={{ fontWeight: 700 }}
          >
            Confirm & Restore Stock
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print Options Dropdown Menu */}
      <Menu
        anchorEl={printAnchor.el}
        open={Boolean(printAnchor.el)}
        onClose={() => setPrintAnchor({ el: null, invoice: null })}
        PaperProps={{ sx: { width: 280, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #F1F5F9' }}>
          <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>
            Print Invoice
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1F2937' }}>
            {printAnchor.invoice?.DocumentNumber || printAnchor.invoice?.document_number}
          </Typography>
        </Box>
        <MenuItem
          onClick={() => {
            printThermalReceipt(printAnchor.invoice);
            setPrintAnchor({ el: null, invoice: null });
          }}
          sx={{ py: 1.2 }}
        >
          <ListItemIcon><ThermalIcon fontSize="small" sx={{ color: '#F59F00' }} /></ListItemIcon>
          <ListItemText primary="Print Thermal (80mm)" secondary="Fast POS counter slip" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            printA4Invoice(printAnchor.invoice);
            setPrintAnchor({ el: null, invoice: null });
          }}
          sx={{ py: 1.2 }}
        >
          <ListItemIcon><A4Icon fontSize="small" sx={{ color: '#3B5BDB' }} /></ListItemIcon>
          <ListItemText primary="Print A4 Tax Invoice" secondary="GST compliant tax invoice" />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            const id = printAnchor.invoice?.Id || printAnchor.invoice?.id;
            if (id) navigate(`/apps/invoice/${id}`);
            setPrintAnchor({ el: null, invoice: null });
          }}
          sx={{ py: 1.2 }}
        >
          <ListItemIcon><ViewIcon fontSize="small" sx={{ color: '#4B5563' }} /></ListItemIcon>
          <ListItemText primary="View Full Document" secondary="Inspect line items & tax slabs" />
        </MenuItem>
      </Menu>

      {/* Toast Alert */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
