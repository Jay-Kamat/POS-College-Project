import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert
} from '@mui/material';
import { Add as AddIcon, Description as PoIcon } from '@mui/icons-material';
import purchaseOrderService from '../../../_api/purchaseOrderService';
import vendorService from '../../../_api/vendorService';
import productService from '../../../_api/productService';

export default function PurchaseOrderList() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [vendorId, setVendorId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [qty, setQty] = useState(50);
  const [rate, setRate] = useState(30);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const loadData = async () => {
    const list = await purchaseOrderService.getPurchaseOrders();
    setPurchaseOrders(list);
    const vnds = await vendorService.getVendors();
    setVendors(vnds);
    const prods = await productService.getProducts();
    setProducts(prods);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePO = async () => {
    const vnd = vendors.find(v => v.Id === vendorId);
    const prod = products.find(p => p.Id === selectedProdId);
    if (!vnd || !prod) {
      setToast({ open: true, message: 'Please select a vendor and product.', severity: 'warning' });
      return;
    }

    const newPo = await purchaseOrderService.createPurchaseOrder({
      VendorId: vnd.Id,
      VendorName: vnd.Name,
      StoreId: 'store_mum_01',
      TotalAmount: qty * rate,
      Items: [
        {
          ProductId: prod.Id,
          ProductName: prod.Name,
          Quantity: qty,
          Rate: rate,
          DeliveryDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0]
        }
      ]
    });

    setToast({ open: true, message: `PO ${newPo.DocumentNumber} created!`, severity: 'success' });
    setDialogOpen(false);
    loadData();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 700 }}>
            Purchase Orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Issue procurement orders to external suppliers and track fulfillment status.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ fontWeight: 600 }}
        >
          New Purchase Order
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>PO Number</TableCell>
              <TableCell>Issue Date</TableCell>
              <TableCell>Supplier / Vendor</TableCell>
              <TableCell align="right">Total Value (₹)</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchaseOrders.map((po) => (
              <TableRow key={po.Id} hover>
                <TableCell sx={{ fontWeight: 600, color: '#3B5BDB' }}>
                  {po.DocumentNumber}
                </TableCell>
                <TableCell>{new Date(po.Date).toLocaleDateString('en-IN')}</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{po.VendorName}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  ₹{po.TotalAmount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={po.Status}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      bgcolor: po.Status === 'Received' ? '#EBFBEE' : '#FFF9DB',
                      color: po.Status === 'Received' ? '#2F9E44' : '#F59F00'
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create PO Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create Purchase Order</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Supplier</InputLabel>
            <Select value={vendorId} label="Supplier" onChange={(e) => setVendorId(e.target.value)}>
              {vendors.map((v) => (
                <MenuItem key={v.Id} value={v.Id}>{v.Name} ({v.City})</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Product</InputLabel>
            <Select value={selectedProdId} label="Product" onChange={(e) => {
              setSelectedProdId(e.target.value);
              const p = products.find(x => x.Id === e.target.value);
              if (p) setRate(p.Cost);
            }}>
              {products.map((p) => (
                <MenuItem key={p.Id} value={p.Id}>{p.Name} (₹{p.Cost})</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Order Quantity"
              type="number"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
            />
            <TextField
              fullWidth
              label="Agreed Rate (₹)"
              type="number"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleCreatePO}>
            Save & Issue PO
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
