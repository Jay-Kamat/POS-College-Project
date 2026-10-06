import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Print as PrintIcon,
  WhatsApp as WhatsAppIcon,
  CancelOutlined as CancelIcon,
  ArrowBack as BackIcon,
  ReceiptLong as ThermalIcon
} from '@mui/icons-material';
import invoiceService from '../../../_api/invoiceService';
import whatsappService from '../../../_api/whatsappService';
import { printThermalReceipt, printA4Invoice } from '../../../utils/printService';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    async function load() {
      const inv = await invoiceService.getInvoiceById(id);
      setInvoice(inv);
    }
    load();
  }, [id]);

  if (!invoice) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">Loading Invoice Details...</Typography>
      </Box>
    );
  }

  const isCancelled = invoice.RecordStatus === 1;

  const handleConfirmCancel = async () => {
    if (reason.trim().length < 10) {
      setToast({ open: true, message: 'Cancellation reason must be >= 10 characters.', severity: 'error' });
      return;
    }
    await invoiceService.cancelInvoice(invoice.Id, reason);
    setToast({ open: true, message: 'Invoice soft-cancelled.', severity: 'success' });
    setCancelOpen(false);
    const updated = await invoiceService.getInvoiceById(id);
    setInvoice(updated);
  };

  const handleSendWhatsApp = async () => {
    setToast({ open: true, message: 'Dispatching WhatsApp receipt...', severity: 'info' });
    const res = await whatsappService.sendInvoiceReceipt(invoice);
    if (res.success) {
      setToast({ open: true, message: 'WhatsApp receipt sent!', severity: 'success' });
    } else {
      setToast({ open: true, message: res.error || 'Failed to send WhatsApp message.', severity: 'warning' });
    }
  };

  return (
    <Box>
      {/* Top Header Navigation */}
      <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/apps/invoice')} sx={{ color: '#4B5563' }}>
          Back to Invoices
        </Button>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={() => printA4Invoice(invoice)}
            sx={{ fontWeight: 600, bgcolor: '#3B5BDB', '&:hover': { bgcolor: '#2B44B8' } }}
          >
            Print A4 Invoice
          </Button>
          <Button
            variant="outlined"
            startIcon={<ThermalIcon />}
            onClick={() => printThermalReceipt(invoice)}
            sx={{ fontWeight: 600 }}
          >
            Print Thermal (80mm)
          </Button>
          {invoice.MobileNumber && (
            <Button
              variant="contained"
              color="success"
              startIcon={<WhatsAppIcon />}
              onClick={handleSendWhatsApp}
              sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' } }}
            >
              Share WhatsApp
            </Button>
          )}
          {!isCancelled && (
            <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => setCancelOpen(true)}>
              Cancel Invoice
            </Button>
          )}
        </Box>
      </Box>

      {/* Formal A4 Invoice Container */}
      <Paper
        sx={{
          p: 5,
          maxWidth: 860,
          mx: 'auto',
          bgcolor: '#FFFFFF',
          borderRadius: 2,
          border: '1px solid #E3E8EF',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Diagonal CANCELLED Watermark */}
        {isCancelled && (
          <Box
            sx={{
              position: 'absolute',
              top: '40%',
              left: '20%',
              transform: 'rotate(-30deg)',
              fontSize: 84,
              fontWeight: 900,
              color: 'rgba(224, 49, 49, 0.12)',
              pointerEvents: 'none',
              letterSpacing: 10,
              border: '8px solid rgba(224, 49, 49, 0.12)',
              px: 6,
              py: 2,
              borderRadius: 4
            }}
          >
            CANCELLED
          </Box>
        )}

        {/* Store Tax Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 800, color: '#1F2937' }}>
              {invoice.StoreName || 'DailyMart Express'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#4B5563' }}>
              {invoice.StoreAddress || 'Plot 12, Commercial Hub, MG Road, Mumbai, Maharashtra 400001'}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1F2937', mt: 0.5 }}>
              GSTIN: {invoice.StoreGst || '27AABCU9603R1ZM'} | FSSAI Lic No: {invoice.StoreFssai || '11522001000123'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#4B5563' }}>
              State: Maharashtra (Code: 27) | Email: billing@dailymart.in
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#3B5BDB' }}>
              TAX INVOICE
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
              {invoice.DocumentNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Date: {new Date(invoice.Date).toLocaleDateString('en-IN')}, {new Date(invoice.Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
            {isCancelled && (
              <Chip label="CANCELLED" color="error" size="small" sx={{ fontWeight: 700, mt: 1 }} />
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Bill To Customer Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#6B7280' }}>
              BILL TO (CUSTOMER):
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {invoice.CustomerName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mobile: +91 {invoice.MobileNumber || 'N/A'}
            </Typography>
            {invoice.CustomerGst && (
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#3B5BDB' }}>
                GSTIN: {invoice.CustomerGst}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              State: {invoice.CustomerState || 'Maharashtra'} | Place of Supply: Maharashtra (27)
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#6B7280' }}>
              PAYMENT INFORMATION:
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Mode: {invoice.ModeOfPayment === 0 ? 'Cash' : 'UPI / Card'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#2F9E44', fontWeight: 600 }}>
              Status: Payment Received
            </Typography>
          </Box>
        </Box>

        {/* Line Items Table */}
        <Table sx={{ mb: 3 }} size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell>#</TableCell>
              <TableCell>Description of Goods</TableCell>
              <TableCell align="center">Qty</TableCell>
              <TableCell align="right">Rate (₹)</TableCell>
              <TableCell align="right">Taxable (₹)</TableCell>
              <TableCell align="right">CGST</TableCell>
              <TableCell align="right">SGST</TableCell>
              <TableCell align="right">Total (₹)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoice.Items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{item.ProductName}</TableCell>
                <TableCell align="center">{item.Quantity}</TableCell>
                <TableCell align="right">₹{item.Rate.toFixed(2)}</TableCell>
                <TableCell align="right">₹{(item.Rate * item.Quantity).toFixed(2)}</TableCell>
                <TableCell align="right">₹{(item.Cgst || 0).toFixed(2)}</TableCell>
                <TableCell align="right">₹{(item.Sgst || 0).toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>₹{item.Total.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Financial Totals Summary */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Box sx={{ width: 320 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2">Taxable Subtotal:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{invoice.Subtotal.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2">Total CGST:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{invoice.Cgst.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2">Total SGST:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{invoice.Sgst.toFixed(2)}</Typography>
            </Box>
            {invoice.RoundOff !== 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2">Round Off:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{invoice.RoundOff.toFixed(2)}</Typography>
              </Box>
            )}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>GRAND TOTAL:</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#3B5BDB' }}>
                ₹{invoice.Amount.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {isCancelled && invoice.CancellationReason && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <strong>Cancellation Notice:</strong> Cancelled on {new Date(invoice.CancelledAt || invoice.Updated).toLocaleString('en-IN')}. Reason: {invoice.CancellationReason}
          </Alert>
        )}

        {/* Terms & Signatory Footer */}
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>Terms & Conditions:</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              1. Goods once sold can be exchanged within 7 days against original invoice.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              2. Perishable items and cut bakery goods are non-returnable.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              3. Subject to Mumbai Jurisdiction.
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', minWidth: 160 }}>
            <Box sx={{ height: 40 }} />
            <Typography variant="caption" sx={{ fontWeight: 700, borderTop: '1px solid #9CA3AF', pt: 0.5, display: 'block' }}>
              Authorized Signatory
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Cancel Modal */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#E03131' }}>
          Cancel Invoice {invoice.DocumentNumber}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Cancellation Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Min 10 characters required..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCancelOpen(false)}>Dismiss</Button>
          <Button variant="contained" color="error" onClick={handleConfirmCancel} disabled={reason.trim().length < 10}>
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
