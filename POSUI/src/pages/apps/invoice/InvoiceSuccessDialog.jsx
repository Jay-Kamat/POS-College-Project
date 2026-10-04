import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Divider,
  Paper,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  WhatsApp as WhatsAppIcon,
  Print as PrintIcon,
  AddShoppingCart as NewBillIcon
} from '@mui/icons-material';
import whatsappService from '../../../_api/whatsappService';

export default function InvoiceSuccessDialog({ open, invoice, onClose }) {
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [waStatus, setWaStatus] = useState(null); // 'success' | 'error' | null
  const [waError, setWaError] = useState('');

  const handleShareWhatsApp = async () => {
    setIsSendingWa(true);
    setWaStatus(null);
    setWaError('');

    const res = await whatsappService.sendInvoiceReceipt(invoice);
    setIsSendingWa(false);
    if (res.success) {
      setWaStatus('success');
    } else {
      setWaStatus('error');
      setWaError(res.error || 'WhatsApp gateway unreachable on port 2785');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
        <CheckIcon sx={{ fontSize: 64, color: '#2F9E44', mb: 1 }} />
        <Typography variant="h3" sx={{ fontWeight: 700, color: '#1F2937' }}>
          Payment Successful!
        </Typography>
        <Typography variant="body2" sx={{ color: '#6B7280' }}>
          Invoice <strong>{invoice.DocumentNumber}</strong> has been generated and saved.
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 4, pb: 1 }}>
        {/* Receipt Preview Card */}
        <Paper
          sx={{
            p: 2.5,
            bgcolor: '#F8FAFC',
            border: '1px dashed #CBD5E1',
            borderRadius: 2,
            fontFamily: 'monospace'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {invoice.StoreName}
            </Typography>
            <Typography variant="caption" sx={{ color: '#4B5563', display: 'block' }}>
              {invoice.StoreAddress}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              GSTIN: {invoice.StoreGst} | FSSAI: {invoice.StoreFssai}
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, mb: 0.5 }}>
            <span>Invoice No: <strong>{invoice.DocumentNumber}</strong></span>
            <span>Mode: <strong>{invoice.ModeOfPayment === 0 ? 'Cash' : 'UPI'}</strong></span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, mb: 1 }}>
            <span>Customer: {invoice.CustomerName}</span>
            <span>Ph: {invoice.MobileNumber || 'N/A'}</span>
          </Box>
          <Divider sx={{ my: 1 }} />

          {/* Items */}
          <Box sx={{ mb: 1 }}>
            {invoice.Items.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, py: 0.3 }}>
                <span>{item.ProductName} x {item.Quantity}</span>
                <span>₹{item.Total.toFixed(2)}</span>
              </Box>
            ))}
          </Box>
          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>Subtotal:</span>
            <span>₹{invoice.Subtotal.toFixed(2)}</span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>CGST:</span>
            <span>₹{invoice.Cgst.toFixed(2)}</span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>SGST:</span>
            <span>₹{invoice.Sgst.toFixed(2)}</span>
          </Box>
          {invoice.RoundOff !== 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Round-off:</span>
              <span>₹{invoice.RoundOff.toFixed(2)}</span>
            </Box>
          )}
          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#1F2937' }}>
            <span>GRAND TOTAL:</span>
            <span>₹{invoice.Amount.toFixed(2)}</span>
          </Box>
        </Paper>

        {/* WhatsApp Delivery Feedback */}
        {waStatus === 'success' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            WhatsApp receipt sent successfully to +91{invoice.MobileNumber}!
          </Alert>
        )}
        {waStatus === 'error' && (
          <Alert severity="warning" sx={{ mt: 2 }} action={
            <Button color="inherit" size="small" onClick={handleShareWhatsApp}>
              Retry
            </Button>
          }>
            {waError}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Print Receipt
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={isSendingWa ? <CircularProgress size={16} color="inherit" /> : <WhatsAppIcon />}
            onClick={handleShareWhatsApp}
            disabled={isSendingWa || !invoice.MobileNumber}
            sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' } }}
          >
            Share WhatsApp
          </Button>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<NewBillIcon />}
          onClick={onClose}
          sx={{ fontWeight: 700, px: 3 }}
        >
          New Bill
        </Button>
      </DialogActions>
    </Dialog>
  );
}
