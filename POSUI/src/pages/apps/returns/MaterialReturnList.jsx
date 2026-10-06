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
import { Add as AddIcon, AssignmentReturn as ReturnIcon, Print as PrintIcon } from '@mui/icons-material';
import returnService from '../../../_api/returnService';
import vendorService from '../../../_api/vendorService';
import productService from '../../../_api/productService';
import { printDebitNote } from '../../../utils/printService';

export default function MaterialReturnList() {
  const [returnNotes, setReturnNotes] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [reasonId, setReasonId] = useState('');
  const [prodId, setProdId] = useState('');
  const [qty, setQty] = useState(10);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const loadData = async () => {
    const notes = await returnService.getReturnNotes();
    setReturnNotes(notes);
    const rs = await returnService.getReturnReasons();
    setReasons(rs);
    const vnds = await vendorService.getVendors();
    setVendors(vnds);
    const prods = await productService.getProducts();
    setProducts(prods);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateReturn = async () => {
    const vnd = vendors.find(v => v.Id === vendorId);
    const rsn = reasons.find(r => r.Id === reasonId);
    const prd = products.find(p => p.Id === prodId);

    if (!vnd || !rsn || !prd) {
      setToast({ open: true, message: 'Please fill in all return note fields.', severity: 'warning' });
      return;
    }

    const newNote = await returnService.createReturnNote({
      VendorId: vnd.Id,
      VendorName: vnd.Name,
      StoreId: 'store_mum_01',
      MaterialReturnId: rsn.Id,
      ReturnReason: rsn.Name,
      TotalReturnAmount: qty * prd.Cost,
      Items: [
        {
          ProductId: prd.Id,
          ProductName: prd.Name,
          BatchBarcode: prd.ProductNumber,
          Quantity: qty,
          Rate: prd.Cost,
          Total: qty * prd.Cost
        }
      ]
    });

    setToast({ open: true, message: `Material Return Note ${newNote.DocumentNumber} created!`, severity: 'success' });
    setDialogOpen(false);
    loadData();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 700 }}>
            Vendor Material Return Notes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Process outward return dockets for damaged, expired, or defective supplier inventory.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ fontWeight: 600 }}
        >
          New Material Return Note
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Return Docket No</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Supplier / Vendor</TableCell>
              <TableCell>Return Reason</TableCell>
              <TableCell align="right">Debit Value (₹)</TableCell>
              <TableCell>Fulfillment Status</TableCell>
              <TableCell align="center">Print Note</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {returnNotes.map((note) => (
              <TableRow key={note.Id} hover>
                <TableCell sx={{ fontWeight: 600, color: '#3B5BDB' }}>
                  {note.DocumentNumber}
                </TableCell>
                <TableCell>{new Date(note.Date).toLocaleDateString('en-IN')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{note.VendorName}</TableCell>
                <TableCell>
                  <Chip label={note.ReturnReason} size="small" sx={{ bgcolor: '#FFF9DB', color: '#D9480F', fontWeight: 600 }} />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  ₹{note.TotalReturnAmount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Chip label={note.Status} size="small" sx={{ bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 600 }} />
                </TableCell>
                <TableCell align="center">
                  <Button size="small" startIcon={<PrintIcon />} onClick={() => printDebitNote(note)} sx={{ fontSize: 12 }}>
                    Print Debit Note
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Return Note Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create Material Return Note</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Vendor</InputLabel>
            <Select value={vendorId} label="Select Vendor" onChange={(e) => setVendorId(e.target.value)}>
              {vendors.map(v => <MenuItem key={v.Id} value={v.Id}>{v.Name}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Return Reason Master</InputLabel>
            <Select value={reasonId} label="Return Reason Master" onChange={(e) => setReasonId(e.target.value)}>
              {reasons.map(r => <MenuItem key={r.Id} value={r.Id}>{r.Name}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Select Defective / Expired Product</InputLabel>
            <Select value={prodId} label="Select Defective / Expired Product" onChange={(e) => setProdId(e.target.value)}>
              {products.map(p => <MenuItem key={p.Id} value={p.Id}>{p.Name} (Stock: {p.StockQuantity})</MenuItem>)}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Return Quantity"
            type="number"
            margin="normal"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleCreateReturn}>
            Generate Return Note
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
