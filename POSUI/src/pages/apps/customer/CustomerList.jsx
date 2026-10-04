import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
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
  Snackbar,
  Alert
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import customerService from '../../../_api/customerService';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Maharashtra');

  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const loadData = async () => {
    const list = await customerService.getCustomers(search);
    setCustomers(list);
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleAdd = async () => {
    if (!name || !mobile || mobile.length !== 10) {
      setToast({ open: true, message: 'Valid name and 10-digit mobile are required.', severity: 'warning' });
      return;
    }
    await customerService.createCustomer({ Name: name, MobileNumber: mobile, GstNumber: gstin, State: state });
    setToast({ open: true, message: `Customer "${name}" added!`, severity: 'success' });
    setOpen(false);
    setName(''); setMobile(''); setGstin('');
    loadData();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 700 }}>
            Customer Directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage retail shoppers, B2B tax client GSTIN profiles, and purchase frequencies.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Add Customer
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          size="small"
          placeholder="Search by customer name or 10-digit mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 380 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9CA3AF' }} /></InputAdornment>
          }}
        />
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer Name</TableCell>
              <TableCell>Mobile Number</TableCell>
              <TableCell>GSTIN (B2B)</TableCell>
              <TableCell>State</TableCell>
              <TableCell align="center">Total Visits</TableCell>
              <TableCell align="right">Total Spend</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.Id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{c.Name}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 500 }}>+91 {c.MobileNumber}</TableCell>
                <TableCell>
                  {c.GstNumber ? (
                    <Chip label={c.GstNumber} size="small" sx={{ bgcolor: '#EEF2FF', color: '#3B5BDB', fontWeight: 600 }} />
                  ) : (
                    <Typography variant="caption" color="text.secondary">Retail B2C</Typography>
                  )}
                </TableCell>
                <TableCell>{c.State}</TableCell>
                <TableCell align="center">
                  <Chip label={c.TotalVisits || 1} size="small" sx={{ bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 700 }} />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  ₹{(c.TotalSpend || 0).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Customer Profile</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Full Name" margin="normal" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField fullWidth label="10-digit Mobile Number" margin="normal" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <TextField fullWidth label="GSTIN (Optional for B2B)" margin="normal" value={gstin} onChange={(e) => setGstin(e.target.value)} />
          <TextField fullWidth label="State" margin="normal" value={state} onChange={(e) => setState(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}>Save Customer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
