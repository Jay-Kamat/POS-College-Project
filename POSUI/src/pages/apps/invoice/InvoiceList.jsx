import React, { useState, useEffect } from 'react';
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
  ListItemText
} from '@mui/material';
import {
  Search as SearchIcon,
  CancelOutlined as CancelIcon,
  Print as PrintIcon,
  WhatsApp as WhatsAppIcon,
  Receipt as ReceiptIcon,
  ReceiptLong as ThermalIcon,
  Description as A4Icon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import invoiceService from '../../../_api/invoiceService';
import whatsappService from '../../../_api/whatsappService';
import { printThermalReceipt, printA4Invoice } from '../../../utils/printService';

export default function InvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'cancelled'
  
  const [printAnchor, setPrintAnchor] = useState({ el: null, invoice: null });
  const [cancelModal, setCancelModal] = useState({ open: false, invoice: null, reason: '' });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const loadInvoices = async () => {
    const list = await invoiceService.getInvoices({ searchTerm: search, status: statusFilter });
    setInvoices(list);
  };

  useEffect(() => {
    loadInvoices();
  }, [search, statusFilter]);

  const handleOpenCancel = (invoice) => {
    setCancelModal({ open: true, invoice, reason: '' });
  };

  const handleConfirmCancel = async () => {
    if (cancelModal.reason.trim().length < 10) {
      setToast({ open: true, message: 'Cancellation reason must be at least 10 characters.', severity: 'error' });
      return;
    }
    try {
      await invoiceService.cancelInvoice(cancelModal.invoice.Id, cancelModal.reason);
      setToast({ open: true, message: `Invoice ${cancelModal.invoice.DocumentNumber} cancelled.`, severity: 'success' });
      setCancelModal({ open: false, invoice: null, reason: '' });
      loadInvoices();
    } catch (err) {
      setToast({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleSendWhatsApp = async (inv) => {
    setToast({ open: true, message: `Sending receipt to ${inv.MobileNumber}...`, severity: 'info' });
    const res = await whatsappService.sendInvoiceReceipt(inv);
    if (res.success) {
      setToast({ open: true, message: 'WhatsApp receipt sent successfully!', severity: 'success' });
    } else {
      setToast({ open: true, message: res.error || 'Failed to send WhatsApp message.', severity: 'warning' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 700 }}>
            Sales Invoices
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View transaction history, print receipts, and manage soft cancellations.
          </Typography>
        </Box>
      </Box>

      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between', borderRadius: 2 }}>
        <TextField
          size="small"
          placeholder="Search by invoice number, customer name, mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 380 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#9CA3AF' }} />
              </InputAdornment>
            )
          }}
        />

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label="All Invoices"
            clickable
            color={statusFilter === 'all' ? 'primary' : 'default'}
            onClick={() => setStatusFilter('all')}
          />
          <Chip
            label="Active Only"
            clickable
            color={statusFilter === 'active' ? 'success' : 'default'}
            onClick={() => setStatusFilter('active')}
          />
          <Chip
            label="Cancelled Only"
            clickable
            color={statusFilter === 'cancelled' ? 'error' : 'default'}
            onClick={() => setStatusFilter('cancelled')}
          />
        </Box>
      </Paper>

      {/* Invoices Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice Number</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Payment Mode</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#9CA3AF' }}>
                  <ReceiptIcon sx={{ fontSize: 48, mb: 1, color: '#CBD5E1' }} />
                  <Typography variant="body2">No invoices found matching criteria.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.Id} hover sx={{ opacity: inv.RecordStatus === 1 ? 0.7 : 1 }}>
                  <TableCell sx={{ fontWeight: 600, color: '#3B5BDB' }}>
                    {inv.DocumentNumber}
                  </TableCell>
                  <TableCell>
                    {new Date(inv.Date).toLocaleDateString('en-IN')}, {new Date(inv.Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{inv.CustomerName}</Typography>
                    <Typography variant="caption" color="text.secondary">{inv.MobileNumber}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={inv.ModeOfPayment === 0 ? 'Cash' : 'UPI'}
                      size="small"
                      sx={{ fontWeight: 600, bgcolor: inv.ModeOfPayment === 0 ? '#E7F5FF' : '#F3F0FF', color: inv.ModeOfPayment === 0 ? '#1C7ED6' : '#7950F2' }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 15 }}>
                    ₹{inv.Amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {inv.RecordStatus === 0 ? (
                      <Chip label="Paid" size="small" sx={{ bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 600 }} />
                    ) : (
                      <Chip label="Cancelled" size="small" sx={{ bgcolor: '#FFE3E3', color: '#E03131', fontWeight: 600 }} />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Print Options">
                      <IconButton
                        size="small"
                        onClick={(e) => setPrintAnchor({ el: e.currentTarget, invoice: inv })}
                        sx={{ color: '#3B5BDB', '&:hover': { bgcolor: '#EEF2FF' } }}
                      >
                        <PrintIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    {inv.MobileNumber && (
                      <Tooltip title="Share via WhatsApp">
                        <IconButton size="small" onClick={() => handleSendWhatsApp(inv)} sx={{ color: '#25D366' }}>
                          <WhatsAppIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {inv.RecordStatus === 0 && (
                      <Tooltip title="Cancel Invoice (Soft Delete)">
                        <IconButton size="small" onClick={() => handleOpenCancel(inv)} sx={{ color: '#EF4444' }}>
                          <CancelIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Cancel Invoice Modal */}
      <Dialog open={cancelModal.open} onClose={() => setCancelModal({ ...cancelModal, open: false })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#E03131' }}>
          Cancel Invoice {cancelModal.invoice?.DocumentNumber}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Soft cancellation marks this invoice as cancelled. The sequential invoice number will never be deleted or reused.
          </Alert>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Mandatory Cancellation Reason (Min 10 characters)"
            placeholder="e.g. Customer returned items at counter due to double payment..."
            value={cancelModal.reason}
            onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCancelModal({ ...cancelModal, open: false })}>
            Dismiss
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmCancel}
            disabled={cancelModal.reason.trim().length < 10}
          >
            Confirm Soft Cancellation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print Options Dropdown Menu */}
      <Menu
        anchorEl={printAnchor.el}
        open={Boolean(printAnchor.el)}
        onClose={() => setPrintAnchor({ el: null, invoice: null })}
        PaperProps={{ sx: { width: 260, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}
      >
        <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: '#6B7280', fontWeight: 700 }}>
          {printAnchor.invoice?.DocumentNumber} PRINT OPTIONS
        </Typography>
        <MenuItem
          onClick={() => {
            printThermalReceipt(printAnchor.invoice);
            setPrintAnchor({ el: null, invoice: null });
          }}
        >
          <ListItemIcon><ThermalIcon fontSize="small" sx={{ color: '#F59F00' }} /></ListItemIcon>
          <ListItemText primary="Print Thermal (80mm)" secondary="Fast POS counter slip" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            printA4Invoice(printAnchor.invoice);
            setPrintAnchor({ el: null, invoice: null });
          }}
        >
          <ListItemIcon><A4Icon fontSize="small" sx={{ color: '#3B5BDB' }} /></ListItemIcon>
          <ListItemText primary="Print A4 Tax Invoice" secondary="Full GST compliant invoice" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (printAnchor.invoice?.Id) {
              navigate(`/apps/invoice/${printAnchor.invoice.Id}`);
            }
            setPrintAnchor({ el: null, invoice: null });
          }}
        >
          <ListItemIcon><ViewIcon fontSize="small" sx={{ color: '#4B5563' }} /></ListItemIcon>
          <ListItemText primary="View Full Document" secondary="Inspect line items" />
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
