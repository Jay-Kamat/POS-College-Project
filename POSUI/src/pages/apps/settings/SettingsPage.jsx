import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
  Alert,
  Avatar,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Store as StoreIcon,
  Percent as TaxIcon,
  Receipt as ReceiptIcon,
  WhatsApp as WhatsAppIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Badge as BadgeIcon,
  Print as PrintIcon,
  QrCodeScanner as QrCodeIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  BatteryChargingFull as BatteryIcon,
  OpenInNew as OpenInNewIcon,
  Lock as LockIcon,
  Star as StarIcon
} from '@mui/icons-material';
import settingService from '../../../_api/settingService';
import whatsappService from '../../../_api/whatsappService';
import { setActiveStore } from '../../../store/authSlice';

const INDIAN_STATES = [
  'Maharashtra',
  'Gujarat',
  'Karnataka',
  'Delhi',
  'Tamil Nadu',
  'Telangana',
  'Rajasthan',
  'Uttar Pradesh',
  'West Bengal',
  'Kerala',
  'Madhya Pradesh',
  'Punjab',
  'Haryana',
  'Bihar',
  'Odisha',
  'Goa',
  'Andhra Pradesh',
  'Assam'
];

export default function SettingsPage() {
  const dispatch = useDispatch();
  const { user, activeStore } = useSelector(state => state.auth);

  const currentRole = user?.role || 'Admin';
  const isAdmin = currentRole === 'Admin';
  const isStoreManager = currentRole === 'Store Manager';
  const canEditProfile = isAdmin || isStoreManager;

  const [activeTab, setActiveTab] = useState(0);
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(activeStore?.id || 'store_mum_01');
  const [createStoreOpen, setCreateStoreOpen] = useState(false);
  const [newStore, setNewStore] = useState({
    Name: '',
    LongName: '',
    Address: '',
    State: 'Maharashtra',
    GstNumber: '',
    FoodLicenseNumber: '',
    MobileNumber: '',
    PhoneNumber: '',
    Email: '',
    InvoicePrefix: 'INV'
  });

  const [profile, setProfile] = useState({
    Id: 'store_mum_01',
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
  const [waStatus, setWaStatus] = useState({ isReady: true, isConnected: false, phoneConnected: false, pairedNumber: null, batteryPercent: 98 });
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [loadingPairingCode, setLoadingPairingCode] = useState(false);
  const [testPhone, setTestPhone] = useState('9876543210');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const [addTaxOpen, setAddTaxOpen] = useState(false);
  const [newTax, setNewTax] = useState({ Name: '', IGST: 12, CGST: 6, SGST: 6 });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [saving, setSaving] = useState(false);

  // Load stores list and target store profile
  useEffect(() => {
    async function load() {
      try {
        const storeList = await settingService.getStores();
        setStores(storeList || []);

        const targetId = isAdmin 
          ? (selectedStoreId || activeStore?.id || storeList[0]?.Id || 'store_mum_01')
          : (activeStore?.id || 'store_mum_01');
        
        setSelectedStoreId(targetId);

        const p = await settingService.getStoreProfile(targetId);
        if (p) {
          setProfile({
            Id: p.Id || p.id || targetId,
            Name: p.Name || p.name || 'DailyMart Express',
            LongName: p.LongName || p.longName || 'DailyMart Retail Private Limited',
            Address: p.Address || p.address || 'Plot 12, Commercial Hub, MG Road, Mumbai',
            MobileNumber: p.MobileNumber || p.mobileNumber || '+91 98765 43210',
            PhoneNumber: p.PhoneNumber || p.phoneNumber || '022-28765432',
            Email: p.Email || p.email || 'mumbai01@dailymart.in',
            FoodLicenseNumber: p.FoodLicenseNumber || p.foodLicenseNumber || '11522001000123',
            GstNumber: p.GstNumber || p.gstNumber || '27AABCU9603R1ZM',
            Country: p.Country || p.country || 'India',
            State: p.State || p.state || 'Maharashtra',
            InvoicePrefix: p.InvoicePrefix || p.invoicePrefix || 'INV',
            ReceiptFooterText: p.ReceiptFooterText || p.receiptFooterText || 'Thank you for shopping with us! No exchange after 7 days.',
            PaperSize: p.PaperSize || p.paperSize || '80mm',
            EnableWhatsAppReceipt: p.EnableWhatsAppReceipt ?? p.enableWhatsAppReceipt ?? true
          });
        }

        const rates = await settingService.getTaxRates();
        setTaxRates(rates || []);

        const wa = await whatsappService.checkStatus();
        if (wa) {
          setWaStatus(wa);
          if (wa.qrDataUrl) {
            setQrCodeUrl(wa.qrDataUrl);
          } else {
            const qr = await whatsappService.getQrCode();
            if (qr) setQrCodeUrl(qr);
          }
        }
      } catch (err) {
        console.warn('Failed to load initial settings:', err);
      }
    }
    load();
  }, [isAdmin]);

  // Real-time polling when WhatsApp tab is active and phone is not yet connected
  useEffect(() => {
    if (activeTab !== 3) return;

    const poll = async () => {
      try {
        const wa = await whatsappService.checkStatus();
        if (wa) {
          setWaStatus(wa);
          if (wa.qrDataUrl) {
            setQrCodeUrl(wa.qrDataUrl);
          }
        }
      } catch (err) {
        console.warn('WhatsApp polling tick notice:', err.message);
      }
    };

    poll();
    const interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleRefreshQr = async () => {
    setRefreshingQr(true);
    try {
      await whatsappService.refreshQr();
      const wa = await whatsappService.checkStatus();
      if (wa) {
        setWaStatus(wa);
        if (wa.qrDataUrl) setQrCodeUrl(wa.qrDataUrl);
      }
      setToast({ open: true, message: 'WhatsApp pairing status & QR code refreshed.', severity: 'success' });
    } catch (e) {
      setToast({ open: true, message: 'Failed to refresh gateway status.', severity: 'error' });
    } finally {
      setRefreshingQr(false);
    }
  };

  const handleRequestPairingCode = async () => {
    const rawNum = pairingPhone.trim();
    if (!rawNum || rawNum.length < 10) {
      setToast({ open: true, message: 'Please enter a valid 10-digit mobile number for pairing.', severity: 'warning' });
      return;
    }
    setLoadingPairingCode(true);
    try {
      const res = await whatsappService.requestPairingCode(rawNum);
      if (res?.pairingCode) {
        setPairingCode(res.pairingCode);
        setToast({ open: true, message: `Pairing Code generated: ${res.pairingCode}`, severity: 'success' });
      } else if (res?.message) {
        setToast({ open: true, message: res.message, severity: 'info' });
      }
    } catch (err) {
      setToast({ open: true, message: 'Failed to request code: ' + err.message, severity: 'error' });
    } finally {
      setLoadingPairingCode(false);
    }
  };

  const handleResetSession = async () => {
    if (!window.confirm('Reset WhatsApp pairing session and wipe credentials?')) return;
    try {
      await whatsappService.resetSession();
      setQrCodeUrl('');
      setPairingCode('');
      setToast({ open: true, message: 'Session reset initiated. Generating fresh QR code...', severity: 'info' });
      setTimeout(handleRefreshQr, 1200);
    } catch (err) {
      setToast({ open: true, message: 'Reset failed: ' + err.message, severity: 'error' });
    }
  };

  const handleSendTestReceipt = async () => {
    if (!testPhone || testPhone.trim().length < 10) {
      setToast({ open: true, message: 'Please enter a valid 10-digit mobile number.', severity: 'warning' });
      return;
    }
    setSendingTest(true);
    try {
      const res = await whatsappService.sendTestMessage(
        testPhone,
        `*${profile.Name || 'DailyMart Express'}*\nTax Invoice Receipt Dispatch Test\n--------------------------------\nStatus: ✅ Gateway Connected & Paired\nTimestamp: ${new Date().toLocaleTimeString('en-IN')}\nStore GSTIN: ${profile.GstNumber || '27AABCU9603R1ZM'}\nThank you for choosing DailyMart!`
      );
      setTestResult({
        success: true,
        recipient: testPhone,
        messageId: res.messageId,
        time: new Date().toLocaleTimeString('en-IN')
      });
      setToast({ open: true, message: `Test WhatsApp receipt dispatched to +91 ${testPhone.trim()}!`, severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: 'Failed to dispatch test message.', severity: 'error' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSelectStore = async (storeId) => {
    setSelectedStoreId(storeId);
    try {
      const p = await settingService.getStoreProfile(storeId);
      if (p) {
        setProfile({
          Id: p.Id || p.id || storeId,
          Name: p.Name || p.name || '',
          LongName: p.LongName || p.longName || '',
          Address: p.Address || p.address || '',
          MobileNumber: p.MobileNumber || p.mobileNumber || '',
          PhoneNumber: p.PhoneNumber || p.phoneNumber || '',
          Email: p.Email || p.email || '',
          FoodLicenseNumber: p.FoodLicenseNumber || p.foodLicenseNumber || '',
          GstNumber: p.GstNumber || p.gstNumber || '',
          Country: p.Country || p.country || 'India',
          State: p.State || p.state || 'Maharashtra',
          InvoicePrefix: p.InvoicePrefix || p.invoicePrefix || 'INV',
          ReceiptFooterText: p.ReceiptFooterText || p.receiptFooterText || '',
          PaperSize: p.PaperSize || p.paperSize || '80mm',
          EnableWhatsAppReceipt: p.EnableWhatsAppReceipt ?? p.enableWhatsAppReceipt ?? true
        });
      }
    } catch (err) {
      console.error('Failed to load store profile:', err);
    }
  };

  const handleMakeActiveStore = () => {
    dispatch(setActiveStore({
      id: profile.Id || selectedStoreId,
      name: profile.Name,
      address: profile.Address,
      state: profile.State,
      gstin: profile.GstNumber,
      fssai: profile.FoodLicenseNumber,
      phone: profile.MobileNumber
    }));
    setToast({ open: true, message: `"${profile.Name}" is now the active POS Terminal outlet!`, severity: 'success' });
  };

  const handleCreateStore = async () => {
    if (!newStore.Name.trim()) {
      setToast({ open: true, message: 'Display Store Name is required.', severity: 'warning' });
      return;
    }
    try {
      const created = await settingService.createStore({
        ...newStore,
        Id: `store_${Date.now()}`
      });
      setCreateStoreOpen(false);
      setNewStore({
        Name: '',
        LongName: '',
        Address: '',
        State: 'Maharashtra',
        GstNumber: '',
        FoodLicenseNumber: '',
        MobileNumber: '',
        PhoneNumber: '',
        Email: '',
        InvoicePrefix: 'INV'
      });
      const updatedList = await settingService.getStores();
      setStores(updatedList);
      if (created?.Id) {
        await handleSelectStore(created.Id);
      }
      setToast({ open: true, message: `New store branch "${created.Name || newStore.Name}" registered!`, severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: 'Failed to create new store outlet.', severity: 'error' });
    }
  };

  const handleSaveProfile = async () => {
    if (!canEditProfile) {
      setToast({ open: true, message: 'Access Denied: Store profile can only be edited by Store Manager or Admin.', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      const updated = await settingService.updateStoreProfile({
        ...profile,
        Id: selectedStoreId || profile.Id || 'store_mum_01'
      });
      if (updated) {
        setProfile((prev) => ({ ...prev, ...updated }));
        // If this store is currently active in Redux, update activeStore too!
        if ((updated.Id || updated.id) === (activeStore?.id || activeStore?.Id)) {
          dispatch(setActiveStore({
            id: updated.Id || updated.id,
            name: updated.Name || updated.name,
            address: updated.Address || updated.address,
            state: updated.State || updated.state,
            gstin: updated.GstNumber || updated.gstNumber,
            fssai: updated.FoodLicenseNumber || updated.foodLicenseNumber,
            phone: updated.MobileNumber || updated.mobileNumber
          }));
        }
      }
      const updatedStores = await settingService.getStores();
      setStores(updatedStores || []);
      setToast({ open: true, message: `Store profile for "${profile.Name}" saved to database successfully!`, severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: 'Failed to update store profile.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddTaxRate = async () => {
    if (!newTax.Name.trim()) {
      setToast({ open: true, message: 'Tax slab name is required.', severity: 'warning' });
      return;
    }
    try {
      await settingService.addTaxRate({
        Name: newTax.Name.trim(),
        IGST: Number(newTax.IGST || 0),
        CGST: Number(newTax.CGST || 0),
        SGST: Number(newTax.SGST || 0)
      });
      const updated = await settingService.getTaxRates();
      setTaxRates(updated || []);
      setAddTaxOpen(false);
      setNewTax({ Name: '', IGST: 12, CGST: 6, SGST: 6 });
      setToast({ open: true, message: `Tax slab "${newTax.Name}" registered.`, severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: 'Failed to add tax slab.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      {/* Header */}
      <Box sx={{ mb: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
            Store Settings & Configuration
          </Typography>
          <Chip
            label="System Master"
            size="small"
            sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', fontWeight: 700, fontSize: '0.75rem' }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
          Legal entity records, statutory GST tax slabs, POS receipt formatting, and local WhatsApp gateway pairing.
        </Typography>
      </Box>

      {/* Main Settings Panel */}
      <Paper
        sx={{
          borderRadius: 3,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            borderBottom: '1px solid #E5E7EB',
            px: 2,
            bgcolor: '#F8FAFC',
            '& .MuiTab-root': {
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.9rem',
              py: 2,
              minHeight: 52
            }
          }}
        >
          <Tab icon={<StoreIcon sx={{ fontSize: 19 }} />} iconPosition="start" label="Store Profile" />
          <Tab icon={<TaxIcon sx={{ fontSize: 19 }} />} iconPosition="start" label="GST Tax Slabs" />
          <Tab icon={<ReceiptIcon sx={{ fontSize: 19 }} />} iconPosition="start" label="Receipt & Printing" />
          <Tab icon={<WhatsAppIcon sx={{ fontSize: 19 }} />} iconPosition="start" label="WhatsApp Gateway" />
        </Tabs>

        {/* TAB 0: Store Profile */}
        {activeTab === 0 && (
          <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            {/* Top Toolbar: Store Selection (Admin Only) */}
            {isAdmin && (
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: 2.5,
                  bgcolor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <FormControl size="small" sx={{ minWidth: 290 }}>
                    <InputLabel id="admin-store-select-label">Select Store Outlet (Admin Exclusive)</InputLabel>
                    <Select
                      labelId="admin-store-select-label"
                      value={selectedStoreId}
                      label="Select Store Outlet (Admin Exclusive)"
                      onChange={(e) => handleSelectStore(e.target.value)}
                      sx={{ bgcolor: '#FFFFFF', fontWeight: 600 }}
                    >
                      {stores.map((s) => {
                        const sid = s.Id || s.id;
                        const isActive = sid === (activeStore?.id || activeStore?.Id);
                        return (
                          <MenuItem key={sid} value={sid}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', justifyContent: 'space-between' }}>
                              <span>{s.Name || s.name}</span>
                              {isActive && (
                                <Chip label="Active Outlet" size="small" color="primary" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                              )}
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>

                  {selectedStoreId !== (activeStore?.id || activeStore?.Id) ? (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<StarIcon />}
                      onClick={handleMakeActiveStore}
                      sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#3B5BDB', color: '#3B5BDB' }}
                    >
                      Set as Active POS Outlet
                    </Button>
                  ) : (
                    <Chip
                      icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                      label="Currently Active POS Outlet"
                      color="success"
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateStoreOpen(true)}
                    sx={{ bgcolor: '#3B5BDB', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#2B44B8' } }}
                  >
                    + Register New Store Branch
                  </Button>
                </Box>
              </Paper>
            )}

            {/* Store Manager Edit Authorization Card */}
            {isStoreManager && (
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: 2.5,
                  bgcolor: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#16A34A', width: 42, height: 42 }}>
                    <StoreIcon sx={{ color: 'white' }} />
                  </Avatar>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#166534' }}>
                        Assigned Outlet: {profile.Name}
                      </Typography>
                      <Chip label="Store Manager" size="small" sx={{ bgcolor: '#DCFCE7', color: '#15803D', fontWeight: 700 }} />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#15803D' }}>
                      As Store Manager, you are authorized to edit and update your store profile, legal credentials, GSTIN, receipt terms, and contact numbers.
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  icon={<CheckCircleIcon sx={{ color: '#16A34A !important' }} />}
                  label="Profile Editing Enabled"
                  variant="outlined"
                  sx={{ fontWeight: 700, color: '#166534', borderColor: '#86EFAC', bgcolor: 'white' }}
                />
              </Paper>
            )}

            {/* Read-Only Notice for Cashier or Inventory */}
            {!canEditProfile && (
              <Alert severity="info" icon={<LockIcon />} sx={{ mb: 3, borderRadius: 2 }}>
                <strong>Read-Only View:</strong> You are signed in as <strong>{currentRole}</strong>. Store profile settings can only be edited by the <strong>Store Manager</strong> or <strong>Admin</strong>.
              </Alert>
            )}

            {/* Store Profile Header Card */}
            <Paper
              sx={{
                p: 2.5,
                mb: 3.5,
                borderRadius: 2.5,
                background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: '#2563EB',
                    width: 56,
                    height: 56,
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(37,99,235,0.4)'
                  }}
                >
                  {(profile.Name || 'DM').slice(0, 2).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {profile.Name || 'Store Outlet'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                    {profile.LongName || 'Registered Entity'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#CBD5E1' }}>
                      GSTIN: {profile.GstNumber || 'Not specified'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>•</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#CBD5E1' }}>
                      FSSAI: {profile.FoodLicenseNumber || 'Not specified'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: '15px !important', color: '#10B981 !important' }} />}
                label={profile.Id === (activeStore?.id || activeStore?.Id) ? "Active POS Terminal Outlet" : "Registered Outlet"}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              />
            </Paper>

            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  disabled={!canEditProfile}
                  label="Display Store Name"
                  placeholder="e.g. DailyMart Express"
                  value={profile.Name}
                  onChange={(e) => setProfile({ ...profile, Name: e.target.value })}
                  helperText="Printed on thermal receipts and header bars"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  disabled={!canEditProfile}
                  label="Registered Legal Entity Name"
                  placeholder="e.g. DailyMart Retail Private Limited"
                  value={profile.LongName}
                  onChange={(e) => setProfile({ ...profile, LongName: e.target.value })}
                  helperText="Used on statutory A4 GST Tax Invoices"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  disabled={!canEditProfile}
                  label="GSTIN (15 characters)"
                  placeholder="e.g. 27AABCU9603R1ZM"
                  value={profile.GstNumber}
                  onChange={(e) => setProfile({ ...profile, GstNumber: e.target.value.toUpperCase().slice(0, 15) })}
                  helperText="State-wise Goods & Services Tax Identification Number"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  disabled={!canEditProfile}
                  label="FSSAI Food License Number"
                  placeholder="e.g. 11522001000123"
                  value={profile.FoodLicenseNumber}
                  onChange={(e) => setProfile({ ...profile, FoodLicenseNumber: e.target.value })}
                  helperText="Food Safety and Standards Authority of India Registration"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  disabled={!canEditProfile}
                  label="Physical Store Address"
                  placeholder="e.g. Plot 12, Commercial Hub, MG Road, Mumbai"
                  value={profile.Address}
                  onChange={(e) => setProfile({ ...profile, Address: e.target.value })}
                  helperText="Physical premises printed on bills and debit return notes"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth disabled={!canEditProfile}>
                  <InputLabel>State / Province</InputLabel>
                  <Select
                    value={profile.State}
                    label="State / Province"
                    onChange={(e) => setProfile({ ...profile, State: e.target.value })}
                  >
                    {INDIAN_STATES.map((st) => (
                      <MenuItem key={st} value={st}>
                        {st}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  disabled={!canEditProfile}
                  label="Operational Mobile"
                  placeholder="e.g. +91 98765 43210"
                  value={profile.MobileNumber}
                  onChange={(e) => setProfile({ ...profile, MobileNumber: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  disabled={!canEditProfile}
                  label="Landline / Phone"
                  placeholder="e.g. 022-28765432"
                  value={profile.PhoneNumber}
                  onChange={(e) => setProfile({ ...profile, PhoneNumber: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  disabled={!canEditProfile}
                  label="Contact Email"
                  placeholder="e.g. billing@dailymart.in"
                  value={profile.Email}
                  onChange={(e) => setProfile({ ...profile, Email: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  value={profile.Country}
                  onChange={(e) => setProfile({ ...profile, Country: e.target.value })}
                  disabled
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                {canEditProfile ? "Changes will reflect on POS receipts, statutory invoices, and tax returns." : "Profile locked for your role."}
              </Typography>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveProfile}
                disabled={saving || !canEditProfile}
                sx={{
                  px: 4,
                  py: 1.2,
                  borderRadius: 2,
                  bgcolor: '#2563EB',
                  fontWeight: 700,
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                  '&:hover': { bgcolor: '#1D4ED8' }
                }}
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </Box>
          </Box>
        )}

        {/* TAB 1: GST Tax Rates */}
        {activeTab === 1 && (
          <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827' }}>
                  Statutory GST Tax Rates Master
                </Typography>
                <Typography variant="body2" sx={{ color: '#6B7280' }}>
                  Central Goods & Services Tax (CGST) and State GST (SGST) apply equally for intra-state sales, while IGST applies for inter-state orders.
                </Typography>
              </Box>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => setAddTaxOpen(true)}
                sx={{
                  bgcolor: '#2563EB',
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#1D4ED8' }
                }}
              >
                Add Tax Slab
              </Button>
            </Box>

            <TableContainer sx={{ border: '1px solid #E5E7EB', borderRadius: 2.5, overflow: 'hidden' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Tax Slab Title</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>IGST (Integrated)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>CGST (Central 50%)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>SGST (State 50%)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {taxRates.map((t) => (
                    <TableRow key={t.Id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>{t.Name}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${Number(t.IGST || 0).toFixed(1)}%`}
                          size="small"
                          sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: '#475569' }}>
                        {Number(t.CGST || 0).toFixed(1)}%
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: '#475569' }}>
                        {Number(t.SGST || 0).toFixed(1)}%
                      </TableCell>
                      <TableCell align="center">
                        <Chip label="Active" size="small" sx={{ bgcolor: '#DCFCE7', color: '#15803D', fontWeight: 700 }} />
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
          <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Grid container spacing={4}>
              {/* Form Controls */}
              <Grid item xs={12} md={7}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', mb: 2.5 }}>
                  POS Receipt & Thermal Printing
                </Typography>

                <FormControl fullWidth sx={{ mb: 2.5 }}>
                  <InputLabel>Thermal Printer Paper Width</InputLabel>
                  <Select
                    value={profile.PaperSize}
                    label="Thermal Printer Paper Width"
                    onChange={(e) => setProfile({ ...profile, PaperSize: e.target.value })}
                  >
                    <MenuItem value="58mm">58mm (Compact Mobile / Bluetooth Slip)</MenuItem>
                    <MenuItem value="80mm">80mm (Standard POS Counter Thermal Roll)</MenuItem>
                    <MenuItem value="A4">A4 Full Sheet (Office Tax Invoice)</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Invoice Document Number Prefix"
                  placeholder="e.g. INV"
                  value={profile.InvoicePrefix}
                  onChange={(e) => setProfile({ ...profile, InvoicePrefix: e.target.value.toUpperCase() })}
                  helperText="Generated as INV-2627-XXXXXX on sequential billing"
                  sx={{ mb: 2.5 }}
                />

                <TextField
                  fullWidth
                  label="Receipt Footer Disclaimer / Terms"
                  multiline
                  rows={3}
                  value={profile.ReceiptFooterText}
                  onChange={(e) => setProfile({ ...profile, ReceiptFooterText: e.target.value })}
                  helperText="Appears at the very bottom of every printed sales invoice"
                  sx={{ mb: 2.5 }}
                />

                <Card sx={{ bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2.5, p: 2, mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={profile.EnableWhatsAppReceipt}
                        onChange={(e) => setProfile({ ...profile, EnableWhatsAppReceipt: e.target.checked })}
                        color="success"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                          Automatic WhatsApp Digital Slip Delivery
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          Sends a neat formatted invoice confirmation message to the shopper's 10-digit mobile number upon checkout.
                        </Typography>
                      </Box>
                    }
                  />
                </Card>

                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveProfile}
                  sx={{
                    bgcolor: '#2563EB',
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 3.5,
                    py: 1.2
                  }}
                >
                  Save Receipt Preferences
                </Button>
              </Grid>

              {/* Live Thermal Receipt Mockup */}
              <Grid item xs={12} md={5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748B', mb: 1.5, textTransform: 'uppercase' }}>
                  Live Receipt Slip Mockup ({profile.PaperSize})
                </Typography>

                <Paper
                  sx={{
                    p: 2.5,
                    bgcolor: '#FFFDF0',
                    border: '1px dashed #CBD5E1',
                    borderRadius: 2,
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#1E293B',
                    maxWidth: 320,
                    margin: '0 auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                  }}
                >
                  <Box sx={{ textAlign: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'monospace' }}>
                      {profile.Name.toUpperCase()}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                      {profile.Address}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                      GSTIN: {profile.GstNumber}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                      FSSAI: {profile.FoodLicenseNumber}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', mb: 0.5 }}>
                    <span>INV-2627-000125</span>
                    <span>{new Date().toLocaleDateString('en-IN')}</span>
                  </Box>
                  <Box sx={{ fontSize: '0.75rem', mb: 1 }}>
                    <span>Cashier: Counter-01</span>
                  </Box>

                  <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>ITEM</span>
                    <span>QTY x RATE</span>
                    <span>TOTAL</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <span>Cow Milk 500ml</span>
                    <span>2 x 32.00</span>
                    <span>₹64.00</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <span>Whole Wheat Bread</span>
                    <span>1 x 45.00</span>
                    <span>₹45.00</span>
                  </Box>

                  <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem' }}>
                    <span>GRAND TOTAL</span>
                    <span>₹109.00</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748B' }}>
                    <span>Paid via UPI Digital</span>
                    <span>CGST/SGST incl.</span>
                  </Box>

                  <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', fontSize: '0.7rem', color: '#475569' }}>
                    {profile.ReceiptFooterText}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* TAB 3: WhatsApp Gateway */}
        {activeTab === 3 && (
          <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ bgcolor: '#25D366', color: '#FFFFFF', width: 44, height: 44 }}>
                  <WhatsAppIcon fontSize="medium" />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827' }}>
                    OpenWA WhatsApp Business Gateway
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                    Microservice running on Port 2785 (REST API) & Port 2886 (Pairing Web Server)
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mt: 1.5 }}>
                <Chip
                  icon={waStatus.phoneConnected || waStatus.isConnected ? <CheckCircleIcon sx={{ fontSize: '15px !important' }} /> : <QrCodeIcon sx={{ fontSize: '15px !important' }} />}
                  label={waStatus.phoneConnected || waStatus.isConnected ? `Linked & Active (${waStatus.pairedNumber || 'Connected'})` : 'Awaiting WhatsApp Scan / Code'}
                  color={waStatus.phoneConnected || waStatus.isConnected ? 'success' : 'warning'}
                  sx={{
                    fontWeight: 700,
                    bgcolor: waStatus.phoneConnected || waStatus.isConnected ? '#DCFCE7' : '#FEF3C7',
                    color: waStatus.phoneConnected || waStatus.isConnected ? '#15803D' : '#B45309',
                    border: waStatus.phoneConnected || waStatus.isConnected ? '1px solid #BBF7D0' : '1px solid #FDE68A'
                  }}
                />
                {waStatus.pairedNumber && (
                  <Chip
                    icon={<PhoneIcon sx={{ fontSize: '14px !important' }} />}
                    label={`Device: ${waStatus.pairedNumber}`}
                    sx={{ fontWeight: 600, bgcolor: '#F1F5F9', color: '#334155' }}
                  />
                )}
                <Chip
                  icon={<BatteryIcon sx={{ fontSize: '15px !important', color: '#16A34A !important' }} />}
                  label={`Gateway Engine: D:\\POS\\OpenWA (:2785)`}
                  sx={{ fontWeight: 600, bgcolor: '#F0FDF4', color: '#16A34A' }}
                />
              </Box>
            </Box>

            <Grid container spacing={3}>
              {/* Left Column: Live QR Code Pairing Station */}
              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid #E2E8F0',
                    bgcolor: '#FFFFFF',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                        Method 1: Scan Live QR Code
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={handleResetSession}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, fontSize: '0.75rem' }}
                        >
                          Reset Session
                        </Button>
                        <Tooltip title="Refresh Pairing QR Code">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={refreshingQr ? <CircularProgress size={14} /> : <RefreshIcon />}
                            onClick={handleRefreshQr}
                            disabled={refreshingQr}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                          >
                            Refresh QR
                          </Button>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
                      Scan the live QR code below with WhatsApp on your phone to link your receipt dispatch device.
                    </Typography>

                    {/* QR Code Container */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5 }}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: '#FFFFFF',
                          borderRadius: 3,
                          border: '2px dashed #CBD5E1',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}
                      >
                        {waStatus.phoneConnected ? (
                          <Box
                            sx={{
                              width: 220,
                              height: 220,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: '#F0FDF4',
                              borderRadius: 2
                            }}
                          >
                            <CheckCircleIcon sx={{ fontSize: 48, color: '#16A34A', mb: 1 }} />
                            <Typography variant="subtitle2" sx={{ color: '#15803D', fontWeight: 800 }}>
                              WhatsApp Connected!
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5 }}>
                              {waStatus.pairedNumber}
                            </Typography>
                          </Box>
                        ) : qrCodeUrl ? (
                          <img
                            src={qrCodeUrl}
                            alt="WhatsApp Pairing QR Code"
                            style={{
                              width: 220,
                              height: 220,
                              borderRadius: 8,
                              display: 'block'
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 220,
                              height: 220,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: '#F8FAFC',
                              borderRadius: 2
                            }}
                          >
                            <CircularProgress size={36} sx={{ color: '#25D366', mb: 1.5 }} />
                            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                              Synchronizing WhatsApp QR...
                            </Typography>
                          </Box>
                        )}
                        <Typography variant="caption" sx={{ color: '#94A3B8', mt: 1, fontWeight: 600 }}>
                          ● Synchronized with WhatsApp WebSocket
                        </Typography>
                      </Box>
                    </Box>

                    {/* Method 2: Link with Phone Number instead */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 2.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#166534', mb: 0.5 }}>
                        Method 2: Link with Phone Number (8-Digit Code)
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#15803D', display: 'block', mb: 1 }}>
                        If camera scan says "Device not found", use this direct official code instead:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                          size="small"
                          placeholder="Phone number, e.g. 9820554433"
                          value={pairingPhone}
                          onChange={(e) => setPairingPhone(e.target.value)}
                          InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
                          sx={{ flex: 1, bgcolor: '#FFFFFF', borderRadius: 1 }}
                        />
                        <Button
                          variant="contained"
                          color="success"
                          onClick={handleRequestPairingCode}
                          disabled={loadingPairingCode}
                          sx={{ fontWeight: 700, textTransform: 'none', px: 2 }}
                        >
                          {loadingPairingCode ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : 'Get Code'}
                        </Button>
                      </Box>

                      {pairingCode && (
                        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#FFFFFF', border: '2px dashed #22C55E', borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#166534', fontWeight: 800, display: 'block' }}>
                            ENTER THIS 8-DIGIT CODE IN WHATSAPP:
                          </Typography>
                          <Typography variant="h4" sx={{ letterSpacing: 4, fontWeight: 900, color: '#15803D', my: 0.5, fontFamily: 'monospace' }}>
                            {pairingCode}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>
                            On Phone: WhatsApp &rarr; Linked Devices &rarr; Link with phone number instead &rarr; Type code
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2.5, display: 'flex', gap: 1.5 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      endIcon={<OpenInNewIcon fontSize="small" />}
                      href="http://localhost:2886"
                      target="_blank"
                      sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                    >
                      Open Web Pairing Dashboard (:2886)
                    </Button>
                  </Box>
                </Paper>
              </Grid>

              {/* Right Column: Live Receipt Dispatch Simulator & Diagnostics */}
              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid #E2E8F0',
                    bgcolor: '#FFFFFF',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
                      Live Receipt Dispatcher & Diagnostics
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
                      Send an instant test WhatsApp message to verify that receipts reach customer phones.
                    </Typography>

                    {/* Phone Input */}
                    <TextField
                      fullWidth
                      size="small"
                      label="Test Recipient Mobile Number"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="9876543210"
                      sx={{ mb: 2 }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">+91</InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <PhoneIcon sx={{ color: '#94A3B8', fontSize: 18 }} />
                          </InputAdornment>
                        )
                      }}
                    />

                    {/* WhatsApp Text Preview Box */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: '#ECE5DD',
                        borderRadius: 2.5,
                        border: '1px solid #D5CDCD',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        color: '#111827',
                        lineHeight: 1.5,
                        mb: 2,
                        position: 'relative'
                      }}
                    >
                      <Box sx={{ bgcolor: '#DCF8C6', p: 1.5, borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#075E54', display: 'block' }}>
                          *{profile.Name || 'DailyMart Express'}*
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#374151', display: 'block' }}>
                          {profile.Address || 'Plot 12, MG Road, Mumbai'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#374151', display: 'block' }}>
                          GSTIN: {profile.GstNumber || '27AABCU9603R1ZM'}
                        </Typography>
                        <Divider sx={{ my: 0.5, borderColor: '#B2D8B2' }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#111827', display: 'block' }}>
                          *INVOICE: INV-2627-000125*
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#374151', display: 'block' }}>
                          1. Amul Taza Milk 500ml x 2 = ₹54.00
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#374151', display: 'block' }}>
                          2. Britannia Brown Bread x 1 = ₹55.00
                        </Typography>
                        <Divider sx={{ my: 0.5, borderColor: '#B2D8B2' }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#111827', display: 'block' }}>
                          *GRAND TOTAL: ₹109.00 (UPI Paid)*
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#075E54', display: 'block', mt: 0.5 }}>
                          Thank you for shopping with us!
                        </Typography>
                      </Box>
                    </Box>

                    {/* Test Dispatch Result Notice */}
                    {testResult && (
                      <Alert severity="success" sx={{ mb: 2, borderRadius: 2, py: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                          Dispatched successfully to +91 {testResult.recipient}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#15803D' }}>
                          ID: {testResult.messageId} • Sent at {testResult.time}
                        </Typography>
                      </Alert>
                    )}
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={sendingTest ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : <SendIcon />}
                    onClick={handleSendTestReceipt}
                    disabled={sendingTest}
                    sx={{
                      bgcolor: '#25D366',
                      '&:hover': { bgcolor: '#1EBE5B' },
                      fontWeight: 800,
                      py: 1.2,
                      borderRadius: 2,
                      boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                    }}
                  >
                    {sendingTest ? 'Sending Test Receipt...' : 'Send Test WhatsApp Receipt'}
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Add Tax Slab Dialog */}
      <Dialog
        open={addTaxOpen}
        onClose={() => setAddTaxOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#111827' }}>
          Add Statutory Tax Slab
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              fullWidth
              label="Slab Name"
              placeholder="e.g. GST 12% Standard"
              value={newTax.Name}
              onChange={(e) => setNewTax({ ...newTax, Name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Total IGST Rate (%)"
              type="number"
              placeholder="12"
              value={newTax.IGST}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setNewTax({
                  ...newTax,
                  IGST: val,
                  CGST: Number((val / 2).toFixed(2)),
                  SGST: Number((val / 2).toFixed(2))
                });
              }}
              helperText={`Auto-splits equally: CGST: ${(newTax.IGST / 2).toFixed(2)}%, SGST: ${(newTax.IGST / 2).toFixed(2)}%`}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddTaxOpen(false)} sx={{ color: '#6B7280' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddTaxRate}
            sx={{
              bgcolor: '#2563EB',
              borderRadius: 2,
              fontWeight: 700,
              '&:hover': { bgcolor: '#1D4ED8' }
            }}
          >
            Register Slab
          </Button>
        </DialogActions>
      </Dialog>

      {/* Register New Store Branch Dialog (Admin Only) */}
      <Dialog
        open={createStoreOpen}
        onClose={() => setCreateStoreOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 1 }}>
          <StoreIcon sx={{ color: '#2563EB' }} />
          <span>Register New Store Branch Outlet</span>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
            Provision a new supermarket branch or retail outlet under your corporate retail entity.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              required
              fullWidth
              size="small"
              label="Display Store Name"
              placeholder="e.g. DailyMart Express (Thane)"
              value={newStore.Name}
              onChange={(e) => setNewStore({ ...newStore, Name: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              label="Registered Legal Entity Name"
              placeholder="e.g. DailyMart Retail Private Limited"
              value={newStore.LongName}
              onChange={(e) => setNewStore({ ...newStore, LongName: e.target.value })}
            />
            <TextField
              required
              fullWidth
              size="small"
              label="Physical Premises Address"
              placeholder="e.g. Shop 4-6, Ghodbunder Rd, Thane West"
              value={newStore.Address}
              onChange={(e) => setNewStore({ ...newStore, Address: e.target.value })}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>State / Province</InputLabel>
                <Select
                  value={newStore.State}
                  label="State / Province"
                  onChange={(e) => setNewStore({ ...newStore, State: e.target.value })}
                >
                  {INDIAN_STATES.map((st) => (
                    <MenuItem key={st} value={st}>{st}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="Invoice Prefix"
                placeholder="e.g. INV-THA"
                value={newStore.InvoicePrefix}
                onChange={(e) => setNewStore({ ...newStore, InvoicePrefix: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField
                size="small"
                label="GSTIN (15 chars)"
                placeholder="e.g. 27AABCU9603R1ZP"
                value={newStore.GstNumber}
                onChange={(e) => setNewStore({ ...newStore, GstNumber: e.target.value.toUpperCase().slice(0, 15) })}
              />
              <TextField
                size="small"
                label="FSSAI License"
                placeholder="e.g. 11522001000126"
                value={newStore.FoodLicenseNumber}
                onChange={(e) => setNewStore({ ...newStore, FoodLicenseNumber: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField
                size="small"
                label="Operational Mobile"
                placeholder="e.g. +91 98200 44556"
                value={newStore.MobileNumber}
                onChange={(e) => setNewStore({ ...newStore, MobileNumber: e.target.value })}
              />
              <TextField
                size="small"
                label="Contact Email"
                placeholder="e.g. thane@dailymart.in"
                value={newStore.Email}
                onChange={(e) => setNewStore({ ...newStore, Email: e.target.value })}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateStoreOpen(false)} sx={{ color: '#6B7280' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateStore}
            sx={{ bgcolor: '#2563EB', fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#1D4ED8' } }}
          >
            Create Branch
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast({ ...toast, open: false })}
          sx={{ width: '100%', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
