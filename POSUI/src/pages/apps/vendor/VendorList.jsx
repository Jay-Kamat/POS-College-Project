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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import vendorService from '../../../_api/vendorService';

export default function VendorList() {
  const [vendors, setVendors] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [pin, setPin] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const loadData = async () => {
    const list = await vendorService.getVendors();
    setVendors(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddVendor = async () => {
    if (!name || !mobile) {
      setToast({ open: true, message: 'Vendor name and mobile are required.', severity: 'warning' });
      return;
    }
    await vendorService.createVendor({ Name: name, City: city, Pin: pin, MobileNumber: mobile, Email: email });
    setToast({ open: true, message: `Vendor "${name}" created!`, severity: 'success' });
    setOpen(false);
    setName(''); setCity(''); setPin(''); setMobile(''); setEmail('');
    loadData();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 700 }}>
            Vendor Directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage external supplier entities and procurement channels.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Add Vendor
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Vendor Code</TableCell>
              <TableCell>Business Name</TableCell>
              <TableCell>City & PIN</TableCell>
              <TableCell>Mobile Number</TableCell>
              <TableCell>Email</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vendors.map((v) => (
              <TableRow key={v.Id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#3B5BDB' }}>
                  {v.VendorCode}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{v.Name}</TableCell>
                <TableCell>{v.City} {v.Pin ? `(${v.Pin})` : ''}</TableCell>
                <TableCell>{v.MobileNumber}</TableCell>
                <TableCell>{v.Email || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Supplier Profile</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Vendor Name" margin="normal" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField fullWidth label="City" margin="normal" value={city} onChange={(e) => setCity(e.target.value)} />
          <TextField fullWidth label="PIN Code" margin="normal" value={pin} onChange={(e) => setPin(e.target.value)} />
          <TextField fullWidth label="Contact Mobile" margin="normal" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <TextField fullWidth label="Email" margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddVendor}>Save Vendor</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
