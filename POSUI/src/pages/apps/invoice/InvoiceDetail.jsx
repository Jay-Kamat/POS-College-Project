import React, { useState, useEffect, useMemo } from 'react';
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
  TableContainer,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Print as PrintIcon,
  WhatsApp as WhatsAppIcon,
  CancelOutlined as CancelIcon,
  ArrowBack as BackIcon,
  ReceiptLong as ThermalIcon,
  Description as A4Icon,
  CheckCircle as PaidIcon
} from '@mui/icons-material';
import invoiceService from '../../../_api/invoiceService';
import whatsappService from '../../../_api/whatsappService';
import { printThermalReceipt, printA4Invoice, numberToWordsINR } from '../../../utils/printService';
import { formatQtyWithUnit, getUnitMeta } from '../../../utils/uomHelper';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const inv = await invoiceService.getInvoiceById(id);
        setInvoice(inv);
      } catch (err) {
        console.error('Error fetching invoice:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Derived Values
  const isCancelled = invoice && (invoice.RecordStatus === 1 || invoice.record_status === 1);
  const docNum = invoice?.DocumentNumber || invoice?.document_number || 'N/A';
  const invDate = invoice?.Date || invoice?.date || new Date();
  const formattedDate = new Date(invDate).toLocaleDateString('en-IN');
  const formattedTime = new Date(invDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const paymentMode = (invoice?.ModeOfPayment === 0 || invoice?.mode_of_payment === 0) ? 'Cash' : ((invoice?.ModeOfPayment === 1 || invoice?.mode_of_payment === 1) ? 'UPI' : 'Card');
  const items = invoice?.Items || invoice?.items || [];

  const subtotal = Number(invoice?.Subtotal || invoice?.subtotal || 0);
  const cgst = Number(invoice?.Cgst || invoice?.cgst || 0);
  const sgst = Number(invoice?.Sgst || invoice?.sgst || 0);
  const igst = Number(invoice?.Igst || invoice?.igst || 0);
  const roundOff = Number(invoice?.RoundOff || invoice?.round_off || 0);
  const grandTotal = Number(invoice?.Amount || invoice?.amount || 0);

  // Compute GST Slabs Breakdown
  const taxSlabs = useMemo(() => {
    if (!items.length) return [];
    const map = {};
    items.forEach((item) => {
      const rate = Number(item.TaxPercent || item.tax_percent || 0);
      const key = `${rate}%`;
      const q = Number(item.Quantity || item.quantity || 1);
      const r = Number(item.Rate || item.rate || 0);
      const taxable = item.Subtotal ? Number(item.Subtotal) : (r * q);
      const itemCgst = Number(item.Cgst || item.cgst || 0);
      const itemSgst = Number(item.Sgst || item.sgst || 0);
      const itemIgst = Number(item.Igst || item.igst || 0);

      if (!map[key]) {
        map[key] = { slab: key, rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
      }
      map[key].taxable += taxable;
      map[key].cgst += itemCgst;
      map[key].sgst += itemSgst;
      map[key].igst += itemIgst;
      map[key].totalTax += (itemCgst + itemSgst + itemIgst);
    });
    return Object.values(map);
  }, [items]);

  const handleConfirmCancel = async () => {
    if (reason.trim().length < 10) {
      setToast({ open: true, message: 'Cancellation reason must be at least 10 characters.', severity: 'error' });
      return;
    }
    try {
      await invoiceService.cancelInvoice(invoice.Id || invoice.id, reason);
      setToast({ open: true, message: 'Invoice soft-cancelled and stock restored.', severity: 'success' });
      setCancelOpen(false);
      const updated = await invoiceService.getInvoiceById(id);
      setInvoice(updated);
    } catch (err) {
      setToast({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleSendWhatsApp = async () => {
    setToast({ open: true, message: `Sending receipt to ${invoice.MobileNumber || invoice.mobile_number}...`, severity: 'info' });
    const res = await whatsappService.sendInvoiceReceipt(invoice);
    if (res.success) {
      setToast({ open: true, message: 'WhatsApp receipt sent successfully!', severity: 'success' });
    } else {
      setToast({ open: true, message: res.error || 'Failed to dispatch WhatsApp message.', severity: 'warning' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#4B5563', fontWeight: 600 }}>Loading Tax Invoice...</Typography>
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ color: '#E03131', fontWeight: 700, mb: 1 }}>Invoice Not Found</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          The requested invoice with ID "{id}" could not be retrieved.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/apps/invoice')}>
          Back to Invoices
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Top Header Navigation */}
      <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/apps/invoice')}
          sx={{ color: '#4B5563', fontWeight: 600 }}
        >
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
          {(invoice.MobileNumber || invoice.mobile_number) && (
            <Button
              variant="contained"
              color="success"
              startIcon={<WhatsAppIcon />}
              onClick={handleSendWhatsApp}
              sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' }, fontWeight: 600 }}
            >
              Share WhatsApp
            </Button>
          )}
          {!isCancelled && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setCancelOpen(true)}
              sx={{ fontWeight: 600 }}
            >
              Cancel Invoice
            </Button>
          )}
        </Box>
      </Box>

      {/* Cancellation Notice Banner */}
      {isCancelled && (
        <Alert
          severity="error"
          sx={{
            maxWidth: 900,
            mx: 'auto',
            mb: 3,
            borderRadius: 2,
            border: '1px solid #FFA8A8',
            bgcolor: '#FFF5F5'
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#C92A2A' }}>
            THIS INVOICE HAS BEEN SOFT-CANCELLED
          </Typography>
          <Typography variant="body2" sx={{ color: '#495057' }}>
            <strong>Reason:</strong> {invoice.CancellationReason || invoice.cancellation_reason || 'Customer returned items at counter'}.
          </Typography>
          <Typography variant="caption" sx={{ color: '#868E96', display: 'block', mt: 0.5 }}>
            All product quantities have been automatically reversed and added back to warehouse inventory stock.
          </Typography>
        </Alert>
      )}

      {/* Formal A4 GST Tax Invoice Container */}
      <Paper
        sx={{
          p: { xs: 3, md: 5 },
          maxWidth: 900,
          mx: 'auto',
          bgcolor: '#FFFFFF',
          borderRadius: 2,
          border: '1px solid #E3E8EF',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Diagonal CANCELLED Watermark */}
        {isCancelled && (
          <Box
            sx={{
              position: 'absolute',
              top: '38%',
              left: '18%',
              transform: 'rotate(-30deg)',
              fontSize: { xs: 48, md: 80 },
              fontWeight: 900,
              color: 'rgba(224, 49, 49, 0.12)',
              pointerEvents: 'none',
              letterSpacing: 10,
              border: '8px solid rgba(224, 49, 49, 0.12)',
              px: { xs: 4, md: 8 },
              py: { xs: 1, md: 2 },
              borderRadius: 4
            }}
          >
            CANCELLED
          </Box>
        )}

        {/* Store Tax Header & Document Title */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box sx={{ maxWidth: 520 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#1F2937' }}>
              {invoice.Store?.Name || invoice.StoreName || 'DailyMart Express'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#4B5563', mt: 0.5 }}>
              {invoice.Store?.Address || invoice.StoreAddress || 'Plot 12, Commercial Hub, MG Road, Mumbai, Maharashtra 400001'}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1F2937', mt: 0.5 }}>
              GSTIN: {invoice.Store?.GstNumber || invoice.StoreGst || '27AABCU9603R1ZM'} | FSSAI: {invoice.Store?.FoodLicenseNumber || invoice.StoreFssai || '11522001000123'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#4B5563' }}>
              State: {invoice.Store?.State || 'Maharashtra'} (Code: 27) | Email: {invoice.Store?.Email || 'billing@dailymart.in'}
            </Typography>
          </Box>

          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Box sx={{ display: 'inline-block', px: 2, py: 0.5, bgcolor: '#EEF2FF', borderRadius: 1.5, mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#3B5BDB', letterSpacing: 1 }}>
                TAX INVOICE
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827' }}>
              {docNum}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Date: {formattedDate}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Time: {formattedTime}
            </Typography>
            <Box sx={{ mt: 1 }}>
              {!isCancelled ? (
                <Chip icon={<PaidIcon />} label="PAID" size="small" sx={{ bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 700 }} />
              ) : (
                <Chip label="CANCELLED" size="small" sx={{ bgcolor: '#FFE3E3', color: '#E03131', fontWeight: 700 }} />
              )}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Bill To & Payment Meta */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E2E8F0', height: '100%' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                Billed To (Customer Details)
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1F2937', mt: 0.5 }}>
                {invoice.CustomerName || invoice.customer_name || 'Walk-in Customer'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mobile: {invoice.MobileNumber || invoice.mobile_number ? `+91 ${invoice.MobileNumber || invoice.mobile_number}` : 'N/A'}
              </Typography>
              {(invoice.CustomerGst || invoice.customer_gst) && (
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#3B5BDB' }}>
                  Customer GSTIN: {invoice.CustomerGst || invoice.customer_gst}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Place of Supply: Maharashtra (27)
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E2E8F0', height: '100%' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                Payment & Billing Meta
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Mode of Payment:</Typography>
                <Chip
                  label={paymentMode}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor: paymentMode === 'Cash' ? '#E7F5FF' : '#F3F0FF',
                    color: paymentMode === 'Cash' ? '#1C7ED6' : '#7950F2'
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Payment Status:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: !isCancelled ? '#2F9E44' : '#E03131' }}>
                  {!isCancelled ? 'Received' : 'Refunded / Reversed'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">POS Terminal:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Counter 01 (Station A)</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Cashier:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Admin Cashier</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Line Items Table */}
        <TableContainer sx={{ mb: 3, border: '1px solid #E2E8F0', borderRadius: 1.5 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F1F5F9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description of Goods</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>HSN</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Qty & UoM</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Rate (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Taxable (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>GST %</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>CGST (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>SGST (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total (₹)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => {
                const u = item.Unit || item.unit || 'PCS';
                const q = Number(item.Quantity || item.quantity || 1);
                const r = Number(item.Rate || item.rate || 0);
                const itemTaxPercent = Number(item.TaxPercent || item.tax_percent || 0);
                const lineTaxable = item.Subtotal ? Number(item.Subtotal) : (r * q);
                const itemCgst = Number(item.Cgst || item.cgst || 0);
                const itemSgst = Number(item.Sgst || item.sgst || 0);
                const lineTotal = Number(item.Total || item.total || 0);

                return (
                  <TableRow key={idx} sx={{ '&:nth-of-type(even)': { bgcolor: '#F8FAFC' } }}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {item.ProductName || item.name}
                    </TableCell>
                    <TableCell align="center" sx={{ color: '#64748B', fontSize: 12 }}>
                      {item.HsnCode || '2106'}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      {formatQtyWithUnit(q, u)}
                    </TableCell>
                    <TableCell align="right">
                      ₹{r.toFixed(2)}
                      <Typography variant="caption" sx={{ display: 'block', color: '#6B7280', fontSize: 10 }}>
                        /{getUnitMeta(u).short}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">₹{lineTaxable.toFixed(2)}</TableCell>
                    <TableCell align="right">{itemTaxPercent}%</TableCell>
                    <TableCell align="right">₹{itemCgst.toFixed(2)}</TableCell>
                    <TableCell align="right">₹{itemSgst.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1F2937' }}>
                      ₹{lineTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* GST Slab Breakdown & Financial Summary Grid */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* GST Slabs Table */}
          <Grid item xs={12} md={7}>
            <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 1.5, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
                  GST Tax Slab Analysis
                </Typography>
              </Box>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, py: 0.5 }}>Slab</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, py: 0.5 }}>Taxable (₹)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, py: 0.5 }}>CGST (₹)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, py: 0.5 }}>SGST (₹)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, py: 0.5 }}>Tax (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {taxSlabs.map((s, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ py: 0.5, fontWeight: 600 }}>{s.slab}</TableCell>
                      <TableCell align="right" sx={{ py: 0.5 }}>₹{s.taxable.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ py: 0.5 }}>₹{s.cgst.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ py: 0.5 }}>₹{s.sgst.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ py: 0.5, fontWeight: 700 }}>₹{s.totalTax.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ py: 0.8, fontWeight: 800 }}>Total</TableCell>
                    <TableCell align="right" sx={{ py: 0.8, fontWeight: 800 }}>₹{subtotal.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.8, fontWeight: 800 }}>₹{cgst.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.8, fontWeight: 800 }}>₹{sgst.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.8, fontWeight: 800, color: '#3B5BDB' }}>
                      ₹{(cgst + sgst + igst).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>

            {/* Amount in words */}
            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#6B7280', display: 'block' }}>
                AMOUNT IN WORDS:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1F2937' }}>
                {numberToWordsINR(grandTotal)}
              </Typography>
            </Box>
          </Grid>

          {/* Grand Totals Box */}
          <Grid item xs={12} md={5}>
            <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Taxable Subtotal:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Central GST (CGST):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{cgst.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2" color="text.secondary">State GST (SGST):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{sgst.toFixed(2)}</Typography>
              </Box>
              {igst > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Integrated GST (IGST):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{igst.toFixed(2)}</Typography>
                </Box>
              )}
              {roundOff !== 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Round-off:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1F2937' }}>
                  GRAND TOTAL:
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, color: isCancelled ? '#C92A2A' : '#3B5BDB' }}>
                  ₹{grandTotal.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Terms, Conditions & Signatory Footer */}
        <Divider sx={{ mb: 2.5 }} />
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={8}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block' }}>
              Statutory Terms & Conditions:
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              1. Goods once sold can be exchanged within 7 days against production of original invoice.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              2. Perishable goods, cut bakery, and opened packaged items cannot be returned.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              3. This is a computer-generated GST tax invoice conforming to Rule 46 of the CGST Rules, 2017.
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
            <Box sx={{ height: 48 }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                borderTop: '1px solid #94A3B8',
                pt: 0.8,
                display: 'block',
                color: '#334155'
              }}
            >
              For {invoice.Store?.Name || invoice.StoreName || 'DailyMart Express'}
              <br />
              (Authorized Signatory)
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Cancel Modal */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#E03131', pb: 1 }}>
          Cancel Invoice {docNum}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2.5 }}>
            <strong>Stock Reversal:</strong> Soft-cancelling this invoice will preserve the document for tax audits, but will immediately credit all billed item quantities back to warehouse inventory stock.
          </Alert>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Cancellation Reason (Min 10 characters)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer returned items at billing counter due to excess purchase..."
            helperText={`${reason.trim().length}/10 characters minimum`}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setCancelOpen(false)}>Dismiss</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmCancel}
            disabled={reason.trim().length < 10}
            sx={{ fontWeight: 700 }}
          >
            Confirm & Reverse Stock
          </Button>
        </DialogActions>
      </Dialog>

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
