import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Save as SaveIcon,
  Store as StoreIcon,
  Percent as TaxIcon,
  Receipt as ReceiptIcon,
  WhatsApp as WhatsAppIcon,
  Add as AddIcon
} from '@mui/icons-material';
import settingService from '../../../_api/settingService';
import whatsappService from '../../../_api/whatsappService';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState({
    Name: 'DailyMart Express',
    LongName: 'DailyMart Retail Private Limited',
    Address: 'Plot 12, Commercial Hub, MG Road, Mumbai',
    MobileNumber: '+91 98765 43210',
    PhoneNumber: '022-28765432',
    Email: 'mumbai01@dailymart.in',
    FoodLicenseNumber: '11522001000123',
    GstNumber: '27AABCU9603R1ZM',
    Country: 'India',
    State: 'Maharashtra',
    InvoicePrefix: 'INV',
    ReceiptFooterText: 'Thank you for shopping with us! No exchange after 7 days.',
    PaperSize: '80mm',
    EnableWhatsAppReceipt: true
  });

  const [taxRates, setTaxRates] = useState([]);
  const [waStatus, setWaStatus] = useState({ isReady: false, authenticated: false });
  const [addTaxOpen, setAddTaxOpen] = useState(false);
  const [newTax, setNewTax] = useState({ Name: '', IGST: 18, CGST: 9, SGST: 9 });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    async function load() {
      const p = await settingService.getStoreProfile();
      setProfile(p);
      const rates = await settingService.getTaxRates();
      setTaxRates(rates);
      const wa = await whatsappService.checkStatus();
      setWaStatus(wa);
    }
    load();
  }, []);

  const handleSaveProfile = async () => {
    await settingService.updateStoreProfile(profile);
    setToast({ open: true, message: 'Store profile settings saved successfully!', severity: 'success' });
  };

  const handleAddTaxRate = async () => {
    await settingService.addTaxRate(newTax);
    const updated = await settingService.getTaxRates();
    setTaxRates(updated);
    setAddTaxOpen(false);
    setToast({ open: true, message: 'Tax rate slab added.', severity: 'success' });
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" sx={{ fontWeight: 700 }}>
          Store Settings & Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure legal entity data, Indian GST tax slabs, receipt formatting, and WhatsApp gateway pairing.
        </Typography>
      </Box>

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{ borderBottom: '1px solid #E3E8EF', px: 2 }}
        >
          <Tab icon={<StoreIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Store Profile" />
          <Tab icon={<TaxIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="GST Tax Slabs" />
          <Tab icon={<ReceiptIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Receipt & Printing" />
          <Tab icon={<WhatsAppIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="WhatsApp Gateway" />
        </Tabs>

        {/* TAB 0: Store Profile */}
        {activeTab === 0 && (
          <Box sx={{ p: 4 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Display Store Name"
                  value={profile.Name}
                  onChange={(e) => setProfile({ ...profile, Name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Registered Legal Entity Name"
                  value={profile.LongName}
                  onChange={(e) => setProfile({ ...profile, LongName: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="GSTIN (15 characters)"
                  value={profile.GstNumber}
                  onChange={(e) => setProfile({ ...profile, GstNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="FSSAI Food License Number"
                  value={profile.FoodLicenseNumber}
                  onChange={(e) => setProfile({ ...profile, FoodLicenseNumber: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Physical Store Address"
                  value={profile.Address}
                  onChange={(e) => setProfile({ ...profile, Address: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="State"
                  value={profile.State}
                  onChange={(e) => setProfile({ ...profile, State: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Operational Mobile"
                  value={profile.MobileNumber}
                  onChange={(e) => setProfile({ ...profile, MobileNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Contact Email"
                  value={profile.Email}
                  onChange={(e) => setProfile({ ...profile, Email: e.target.value })}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleSaveProfile} sx={{ px: 4 }}>
                Save Profile Changes
              </Button>
            </Box>
          </Box>
        )}

        {/* TAB 1: GST Tax Rates */}
        {activeTab === 1 && (
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Statutory GST Tax Rates
              </Typography>
              <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setAddTaxOpen(true)}>
                Add Slab
              </Button>
            </Box>

            <TableContainer sx={{ border: '1px solid #E3E8EF', borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tax Slab Title</TableCell>
                    <TableCell align="center">IGST (Inter-State)</TableCell>
                    <TableCell align="center">CGST (Central)</TableCell>
                    <TableCell align="center">SGST (State)</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {taxRates.map((t) => (
                    <TableRow key={t.Id}>
                      <TableCell sx={{ fontWeight: 600 }}>{t.Name}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{t.IGST}%</TableCell>
                      <TableCell align="center">{t.CGST}%</TableCell>
                      <TableCell align="center">{t.SGST}%</TableCell>
                      <TableCell>
                        <Chip label="Active" size="small" sx={{ bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 600 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 2: Receipt & Printing */}
        {activeTab === 2 && (
          <Box sx={{ p: 4, maxWidth: 640 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Thermal Printer Paper Width</InputLabel>
              <Select
                value={profile.PaperSize}
                label="Thermal Printer Paper Width"
                onChange={(e) => setProfile({ ...profile, PaperSize: e.target.value })}
              >
                <MenuItem value="58mm">58mm (Small Counter Receipt)</MenuItem>
                <MenuItem value="80mm">80mm (Standard POS Thermal Slip)</MenuItem>
                <MenuItem value="A4">A4 Full Tax Invoice</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Receipt Footer Disclaimer / Terms"
              multiline
              rows={2}
              margin="normal"
              value={profile.ReceiptFooterText}
              onChange={(e) => setProfile({ ...profile, ReceiptFooterText: e.target.value })}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={profile.EnableWhatsAppReceipt}
                  onChange={(e) => setProfile({ ...profile, EnableWhatsAppReceipt: e.target.checked })}
                  color="primary"
                />
              }
              label="Enable automated WhatsApp receipt dispatch on invoice creation"
              sx={{ mt: 2, display: 'block' }}
            />

            <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleSaveProfile} sx={{ mt: 3 }}>
              Save Receipt Preferences
            </Button>
          </Box>
        )}

        {/* TAB 3: WhatsApp Gateway */}
        {activeTab === 3 && (
          <Box sx={{ p: 4 }}>
            <Box sx={{ p: 3, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E3E8EF', maxWidth: 540 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <WhatsAppIcon sx={{ color: '#25D366', fontSize: 32 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    OpenWA Local WhatsApp Gateway
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Local Node.js microservice on Port 2785 (API) and Port 2886 (Dashboard)
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ my: 2 }}>
                <Chip
                  label={waStatus.isReady ? "Gateway Connected & Active" : "Gateway Offline on :2785"}
                  color={waStatus.isReady ? "success" : "error"}
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              <Typography variant="body2" sx={{ color: '#4B5563', mb: 2 }}>
                To link a new smartphone or renew your WhatsApp Web session:
              </Typography>

              <Button
                variant="outlined"
                color="primary"
                href="http://localhost:2886"
                target="_blank"
                sx={{ mr: 2 }}
              >
                Open QR Pairing Dashboard (Port 2886)
              </Button>

              <Button
                variant="contained"
                color="success"
                onClick={async () => {
                  const s = await whatsappService.checkStatus();
                  setWaStatus(s);
                  setToast({ open: true, message: 'Gateway pinged successfully.', severity: 'info' });
                }}
              >
                Refresh Connection
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Add Tax Slab Dialog */}
      <Dialog open={addTaxOpen} onClose={() => setAddTaxOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Tax Slab</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Slab Name (e.g. GST 12%)"
            margin="normal"
            value={newTax.Name}
            onChange={(e) => setNewTax({ ...newTax, Name: e.target.value })}
          />
          <TextField
            fullWidth
            label="Total IGST %"
            type="number"
            margin="normal"
            value={newTax.IGST}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              setNewTax({ ...newTax, IGST: val, CGST: val / 2, SGST: val / 2 });
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddTaxOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTaxRate}>Add Slab</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
