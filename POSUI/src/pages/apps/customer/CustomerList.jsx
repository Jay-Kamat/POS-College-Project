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
  Alert,
  Grid,
  IconButton,
  Tooltip,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Storefront as StorefrontIcon,
  AccountBalanceWallet as WalletIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  ContentCopy as CopyIcon,
  ReceiptLong as ReceiptIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Clear as ClearIcon,
  Verified as VerifiedIcon,
  WorkspacePremium as PremiumIcon
} from '@mui/icons-material';
import customerService from '../../../_api/customerService';

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

// Helper accessors for consistent data casing
const getCustId = (c) => c?.Id || c?.id || '';
const getCustName = (c) => c?.Name || c?.name || '';
const getCustMobile = (c) => c?.MobileNumber || c?.mobileNumber || c?.mobile_number || '';
const getCustGst = (c) => c?.GstNumber || c?.gstNumber || c?.gst_number || '';
const getCustState = (c) => c?.State || c?.state || 'Maharashtra';
const getCustCountry = (c) => c?.Country || c?.country || 'India';
const getCustVisits = (c) => Number(c?.TotalVisits ?? c?.totalVisits ?? c?.total_visits ?? 1);
const getCustSpend = (c) => Number(c?.TotalSpend ?? c?.totalSpend ?? c?.total_spend ?? 0);
const getCustCreated = (c) => c?.Created || c?.created || c?.created_at || '';

const getLoyaltyTier = (spend, visits) => {
  if (spend >= 10000 || visits >= 20) {
    return { label: 'Platinum Elite', color: '#6D28D9', bg: '#EDE9FE', border: '#C4B5FD' };
  }
  if (spend >= 4000 || visits >= 10) {
    return { label: 'Gold Member', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' };
  }
  if (spend >= 1000 || visits >= 3) {
    return { label: 'Silver Regular', color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD' };
  }
  return { label: 'Bronze Shopper', color: '#475569', bg: '#F1F5F9', border: '#E2E8F0' };
};

const getAvatarColor = (name) => {
  const colors = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2', '#4F46E5'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    b2bClients: 0,
    totalVisits: 0,
    cumulativeRevenue: 0
  });
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL'); // ALL, B2C, B2B, FREQUENT, VIP
  const [stateFilter, setStateFilter] = useState('All');

  // Add / Edit Dialog
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    gstNumber: '',
    state: 'Maharashtra'
  });
  const [formErrors, setFormErrors] = useState({});

  // Dossier Modal
  const [dossierOpen, setDossierOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Deactivate Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Toast
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        customerService.getCustomers(search),
        customerService.getCustomerStats()
      ]);
      setCustomers(list || []);
      if (statsData) {
        setStats({
          totalCustomers: statsData.totalCustomers ?? statsData.TotalCustomers ?? 0,
          b2bClients: statsData.b2bClients ?? statsData.B2bClients ?? 0,
          totalVisits: statsData.totalVisits ?? statsData.TotalVisits ?? 0,
          cumulativeRevenue: Number(statsData.cumulativeRevenue ?? statsData.CumulativeRevenue ?? 0)
        });
      }
    } catch (e) {
      console.error('Failed to load customers data:', e);
      setToast({ open: true, message: 'Failed to refresh customer records.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  // Filter list
  const filteredCustomers = customers.filter((c) => {
    const gst = getCustGst(c);
    const visits = getCustVisits(c);
    const spend = getCustSpend(c);
    const state = getCustState(c);

    // State filter
    if (stateFilter !== 'All' && state.toLowerCase() !== stateFilter.toLowerCase()) {
      return false;
    }

    // Category filter
    if (activeCategory === 'B2C' && gst.trim() !== '') return false;
    if (activeCategory === 'B2B' && gst.trim() === '') return false;
    if (activeCategory === 'FREQUENT' && visits < 5) return false;
    if (activeCategory === 'VIP' && spend < 2000) return false;

    return true;
  });

  // Open Add Dialog
  const handleOpenAdd = () => {
    setFormMode('add');
    setEditingId(null);
    setFormData({ name: '', mobileNumber: '', gstNumber: '', state: 'Maharashtra' });
    setFormErrors({});
    setFormOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (c) => {
    setFormMode('edit');
    setEditingId(getCustId(c));
    setFormData({
      name: getCustName(c),
      mobileNumber: getCustMobile(c),
      gstNumber: getCustGst(c),
      state: getCustState(c)
    });
    setFormErrors({});
    setFormOpen(true);
  };

  // Open Dossier Dialog
  const handleOpenDossier = async (c) => {
    setSelectedCustomer(c);
    setDossierOpen(true);
    setLoadingInvoices(true);
    try {
      const invList = await customerService.getCustomerInvoices(getCustId(c));
      setInvoices(invList || []);
    } catch (err) {
      console.warn('Failed to load invoices for customer:', err);
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Save Customer (Add or Edit)
  const handleSaveCustomer = async () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full customer name is required.';
    const cleanMobile = formData.mobileNumber.replace(/[^0-9]/g, '');
    if (cleanMobile.length !== 10) errors.mobileNumber = 'Please provide a valid 10-digit mobile number.';

    if (formData.gstNumber.trim() && formData.gstNumber.trim().length !== 15) {
      errors.gstNumber = 'Valid Indian GSTIN must be exactly 15 alphanumeric characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (formMode === 'add') {
        await customerService.createCustomer({
          Name: formData.name.trim(),
          MobileNumber: cleanMobile,
          GstNumber: formData.gstNumber.trim().toUpperCase(),
          State: formData.state
        });
        setToast({ open: true, message: `Customer "${formData.name}" registered successfully!`, severity: 'success' });
      } else {
        await customerService.updateCustomer(editingId, {
          Name: formData.name.trim(),
          MobileNumber: cleanMobile,
          GstNumber: formData.gstNumber.trim().toUpperCase(),
          State: formData.state
        });
        setToast({ open: true, message: `Customer "${formData.name}" updated successfully!`, severity: 'success' });
      }
      setFormOpen(false);
      loadData();
    } catch (err) {
      setToast({ open: true, message: err.message || 'Operation failed.', severity: 'error' });
    }
  };

  // Deactivate / Soft Delete
  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      await customerService.deleteCustomer(getCustId(customerToDelete));
      setToast({
        open: true,
        message: `Customer "${getCustName(customerToDelete)}" deactivated from active directory.`,
        severity: 'info'
      });
      setDeleteModalOpen(false);
      setCustomerToDelete(null);
      loadData();
    } catch (err) {
      setToast({ open: true, message: 'Failed to deactivate customer.', severity: 'error' });
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard?.writeText(text);
    setToast({ open: true, message: `${label} copied to clipboard!`, severity: 'success' });
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
              Customer Directory & CRM
            </Typography>
            <Chip
              label="Retail & B2B"
              size="small"
              sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', fontWeight: 700, fontSize: '0.75rem' }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
            Centralized shopper directory, loyalty milestones, GST compliance, and lifetime spend history.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              color: '#374151',
              borderColor: '#D1D5DB',
              '&:hover': { borderColor: '#9CA3AF', bgcolor: '#F9FAFB' }
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#2563EB',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              '&:hover': { bgcolor: '#1D4ED8' }
            }}
          >
            Add Customer
          </Button>
        </Box>
      </Box>

      {/* KPI Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Card 1: Total Registered Shoppers */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                bgcolor: '#2563EB'
              }}
            />
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>
                    Active Shoppers
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mt: 0.5 }}>
                    {stats.totalCustomers}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    Registered Profiles
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 48, height: 48 }}>
                  <PeopleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: B2B Tax Clients */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FDF4FF 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                bgcolor: '#7C3AED'
              }}
            />
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>
                    B2B Tax Clients
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mt: 0.5 }}>
                    {stats.b2bClients}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#7C3AED', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    GST Registered
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#F5F3FF', color: '#7C3AED', width: 48, height: 48 }}>
                  <BusinessIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Store Footfall / Visits */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                bgcolor: '#D97706'
              }}
            />
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>
                    Total Footfall
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mt: 0.5 }}>
                    {stats.totalVisits}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    Store Visits Logged
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 48, height: 48 }}>
                  <StorefrontIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Cumulative Customer Spend */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                bgcolor: '#059669'
              }}
            />
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>
                    Lifetime Value (LTV)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                    ₹{stats.cumulativeRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#4B5563', fontWeight: 500, mt: 0.5, display: 'block' }}>
                    Cumulative Billing
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#DCFCE7', color: '#059669', width: 48, height: 48 }}>
                  <WalletIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Category Pills & Search Controls */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2
          }}
        >
          {/* Quick Filter Tabs */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {[
              { id: 'ALL', label: `All (${customers.length})` },
              { id: 'B2C', label: `Retail B2C (${customers.filter((c) => !getCustGst(c)).length})` },
              { id: 'B2B', label: `B2B GST (${customers.filter((c) => !!getCustGst(c)).length})` },
              { id: 'FREQUENT', label: `Frequent (${customers.filter((c) => getCustVisits(c) >= 5).length})` },
              { id: 'VIP', label: `High Spend (${customers.filter((c) => getCustSpend(c) >= 2000).length})` }
            ].map((tab) => {
              const isSelected = activeCategory === tab.id;
              return (
                <Chip
                  key={tab.id}
                  label={tab.label}
                  onClick={() => setActiveCategory(tab.id)}
                  sx={{
                    fontWeight: 600,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-in-out',
                    bgcolor: isSelected ? '#1E293B' : '#F1F5F9',
                    color: isSelected ? '#FFFFFF' : '#475569',
                    border: isSelected ? '1px solid #0F172A' : '1px solid #E2E8F0',
                    '&:hover': {
                      bgcolor: isSelected ? '#0F172A' : '#E2E8F0'
                    }
                  }}
                />
              );
            })}
          </Box>

          {/* Search & State Filter */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small"
              placeholder="Search name, mobile, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: { xs: '100%', sm: 260 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#9CA3AF', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}>
                      <ClearIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>State</InputLabel>
              <Select
                value={stateFilter}
                label="State"
                onChange={(e) => setStateFilter(e.target.value)}
              >
                <MenuItem value="All">All States</MenuItem>
                {Array.from(new Set(customers.map((c) => getCustState(c)).filter(Boolean))).map((st) => (
                  <MenuItem key={st} value={st}>
                    {st}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {/* Customers Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 3,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        <Table sx={{ minWidth: 750 }}>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Shopper Profile</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Mobile & Region</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Tax & Business Classification</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Loyalty Tier</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Store Visits</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Lifetime Spend (₹)</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} sx={{ color: '#2563EB', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: '#6B7280' }}>
                    Loading customer directory...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <PeopleIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
                    No matching customers found
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                    Try adjusting search criteria or registering a new shopper profile.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((c) => {
                const id = getCustId(c);
                const name = getCustName(c);
                const mobile = getCustMobile(c);
                const gst = getCustGst(c);
                const state = getCustState(c);
                const country = getCustCountry(c);
                const visits = getCustVisits(c);
                const spend = getCustSpend(c);
                const tier = getLoyaltyTier(spend, visits);
                const avatarBg = getAvatarColor(name);
                const initials = name
                  .split(' ')
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'C';

                return (
                  <TableRow
                    key={id}
                    hover
                    sx={{
                      '&:hover': { bgcolor: '#F8FAFC' },
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {/* Shopper Profile */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            bgcolor: avatarBg,
                            color: '#FFFFFF',
                            width: 40,
                            height: 40,
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                          }}
                        >
                          {initials}
                        </Avatar>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 700,
                              color: '#1E293B',
                              cursor: 'pointer',
                              '&:hover': { color: '#2563EB' }
                            }}
                            onClick={() => handleOpenDossier(c)}
                          >
                            {name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>
                            ID: {id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Mobile & Region */}
                    <TableCell sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}
                        >
                          +91 {mobile}
                        </Typography>
                        <Tooltip title="Copy Mobile">
                          <IconButton size="small" onClick={() => handleCopy(mobile, 'Mobile number')}>
                            <CopyIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                        <LocationIcon sx={{ fontSize: 13, color: '#94A3B8' }} />
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          {state}, {country}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Tax & Business Classification */}
                    <TableCell sx={{ py: 1.5 }}>
                      {gst ? (
                        <Box>
                          <Chip
                            icon={<VerifiedIcon sx={{ fontSize: '14px !important', color: '#4F46E5 !important' }} />}
                            label={`GSTIN: ${gst}`}
                            size="small"
                            sx={{
                              bgcolor: '#EEF2FF',
                              color: '#4338CA',
                              border: '1px solid #C7D2FE',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              fontSize: '0.75rem'
                            }}
                          />
                          <Typography variant="caption" sx={{ display: 'block', color: '#6B7280', mt: 0.3 }}>
                            B2B Corporate Registered
                          </Typography>
                        </Box>
                      ) : (
                        <Box>
                          <Chip
                            label="Retail B2C"
                            size="small"
                            sx={{
                              bgcolor: '#F1F5F9',
                              color: '#475569',
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }}
                          />
                          <Typography variant="caption" sx={{ display: 'block', color: '#9CA3AF', mt: 0.3 }}>
                            Individual Shopper
                          </Typography>
                        </Box>
                      )}
                    </TableCell>

                    {/* Loyalty Tier */}
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Chip
                        icon={<PremiumIcon sx={{ fontSize: '14px !important', color: `${tier.color} !important` }} />}
                        label={tier.label}
                        size="small"
                        sx={{
                          bgcolor: tier.bg,
                          color: tier.color,
                          border: `1px solid ${tier.border}`,
                          fontWeight: 700,
                          fontSize: '0.72rem'
                        }}
                      />
                    </TableCell>

                    {/* Store Visits */}
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Chip
                        label={`${visits} visits`}
                        size="small"
                        sx={{
                          bgcolor: visits >= 10 ? '#FEF3C7' : '#F0FDF4',
                          color: visits >= 10 ? '#B45309' : '#15803D',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}
                      />
                    </TableCell>

                    {/* Lifetime Spend */}
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                        ₹{spend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                      {visits > 0 && (
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                          AOV: ₹{(spend / visits).toFixed(0)}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="View Shopper Dossier">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDossier(c)}
                            sx={{ color: '#2563EB', '&:hover': { bgcolor: '#EFF6FF' } }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Customer Details">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(c)}
                            sx={{ color: '#4B5563', '&:hover': { bgcolor: '#F3F4F6' } }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate Customer">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setCustomerToDelete(c);
                              setDeleteModalOpen(true);
                            }}
                            sx={{ color: '#EF4444', '&:hover': { bgcolor: '#FEE2E2' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Customer Profile Dossier Modal */}
      <Dialog
        open={dossierOpen}
        onClose={() => setDossierOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        {selectedCustomer && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: getAvatarColor(getCustName(selectedCustomer)),
                      color: '#FFFFFF',
                      width: 52,
                      height: 52,
                      fontSize: '1.2rem',
                      fontWeight: 800
                    }}
                  >
                    {getCustName(selectedCustomer)
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'C'}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827' }}>
                      {getCustName(selectedCustomer)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={getLoyaltyTier(getCustSpend(selectedCustomer), getCustVisits(selectedCustomer)).label}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: getLoyaltyTier(getCustSpend(selectedCustomer), getCustVisits(selectedCustomer)).bg,
                          color: getLoyaltyTier(getCustSpend(selectedCustomer), getCustVisits(selectedCustomer)).color
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#6B7280' }}>
                        ID: {getCustId(selectedCustomer)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <IconButton onClick={() => setDossierOpen(false)}>
                  <ClearIcon />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ py: 2.5 }}>
              {/* Quick Metrics Bar */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                      Lifetime Spend
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                      ₹{getCustSpend(selectedCustomer).toFixed(2)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                      Total Visits
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B', mt: 0.5 }}>
                      {getCustVisits(selectedCustomer)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                      Average Ticket
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#2563EB', mt: 0.5 }}>
                      ₹
                      {getCustVisits(selectedCustomer) > 0
                        ? (getCustSpend(selectedCustomer) / getCustVisits(selectedCustomer)).toFixed(2)
                        : '0.00'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                      Tax Status
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#7C3AED', mt: 0.5 }}>
                      {getCustGst(selectedCustomer) ? 'B2B GST' : 'Retail B2C'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Shopper Details Card */}
              <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, border: '1px solid #E5E7EB' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#374151', mb: 1.5 }}>
                  Contact & Tax Attributes
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneIcon sx={{ color: '#9CA3AF', fontSize: 18 }} />
                      <Typography variant="body2" sx={{ color: '#4B5563' }}>
                        Mobile: <strong>+91 {getCustMobile(selectedCustomer)}</strong>
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationIcon sx={{ color: '#9CA3AF', fontSize: 18 }} />
                      <Typography variant="body2" sx={{ color: '#4B5563' }}>
                        Region: <strong>{getCustState(selectedCustomer)}, {getCustCountry(selectedCustomer)}</strong>
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#4B5563' }}>
                      GSTIN:{' '}
                      {getCustGst(selectedCustomer) ? (
                        <strong style={{ fontFamily: 'monospace', color: '#4F46E5' }}>
                          {getCustGst(selectedCustomer)}
                        </strong>
                      ) : (
                        <span style={{ color: '#9CA3AF' }}>Not registered (Retail consumer)</span>
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#4B5563' }}>
                      Enrolled Since:{' '}
                      <strong>
                        {getCustCreated(selectedCustomer)
                          ? new Date(getCustCreated(selectedCustomer)).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'Recent'}
                      </strong>
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Purchase History Ledger */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <ReceiptIcon sx={{ color: '#2563EB' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827' }}>
                    Recent Sales Invoices
                  </Typography>
                </Box>

                {loadingInvoices ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={24} sx={{ color: '#2563EB' }} />
                  </Box>
                ) : invoices.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#F9FAFB', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6B7280' }}>
                      No recent digital invoices tracked under this customer record yet.
                    </Typography>
                  </Paper>
                ) : (
                  <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #E5E7EB' }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Payment Mode</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoices.map((inv) => {
                          const docNo = inv.DocumentNumber || inv.documentnumber || inv.Id || inv.id;
                          const invDate = inv.Date || inv.date;
                          const amt = Number(inv.Amount || inv.amount || 0);
                          const mode = inv.ModeOfPayment ?? inv.modeofpayment ?? 0;
                          const recStatus = inv.RecordStatus ?? inv.recordstatus ?? 0;

                          const modeLabels = ['Cash', 'UPI', 'Card', 'Split'];
                          const modeColors = ['#059669', '#2563EB', '#7C3AED', '#D97706'];

                          return (
                            <TableRow key={inv.Id || inv.id || docNo} hover>
                              <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#1E293B' }}>
                                {docNo}
                              </TableCell>
                              <TableCell sx={{ color: '#64748B' }}>
                                {invDate ? new Date(invDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '-'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={modeLabels[mode] || 'Paid'}
                                  size="small"
                                  sx={{
                                    bgcolor: '#F1F5F9',
                                    color: modeColors[mode] || '#475569',
                                    fontWeight: 700,
                                    fontSize: '0.72rem'
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                {recStatus === 0 ? (
                                  <Chip label="Completed" size="small" sx={{ bgcolor: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: '0.7rem' }} />
                                ) : (
                                  <Chip label="Cancelled" size="small" sx={{ bgcolor: '#FEE2E2', color: '#B91C1C', fontWeight: 700, fontSize: '0.7rem' }} />
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: '#0F172A' }}>
                                ₹{amt.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setDossierOpen(false);
                  handleOpenEdit(selectedCustomer);
                }}
                startIcon={<EditIcon />}
              >
                Edit Customer
              </Button>
              <Button variant="contained" onClick={() => setDossierOpen(false)} sx={{ bgcolor: '#1E293B' }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Add / Edit Customer Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#111827' }}>
          {formMode === 'add' ? 'Register New Shopper' : 'Edit Customer Profile'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              fullWidth
              label="Full Customer Name"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
              }}
              error={!!formErrors.name}
              helperText={formErrors.name}
              required
            />

            <TextField
              fullWidth
              label="10-Digit Mobile Number"
              placeholder="e.g. 9876543210"
              value={formData.mobileNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                setFormData({ ...formData, mobileNumber: val });
                if (formErrors.mobileNumber) setFormErrors({ ...formErrors, mobileNumber: '' });
              }}
              error={!!formErrors.mobileNumber}
              helperText={formErrors.mobileNumber || 'Used for instant search and SMS invoice delivery.'}
              InputProps={{
                startAdornment: <InputAdornment position="start">+91</InputAdornment>
              }}
              required
            />

            <TextField
              fullWidth
              label="GSTIN (Optional for B2B Clients)"
              placeholder="e.g. 27AABCZ1234P1ZR"
              value={formData.gstNumber}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().slice(0, 15);
                setFormData({ ...formData, gstNumber: val });
                if (formErrors.gstNumber) setFormErrors({ ...formErrors, gstNumber: '' });
              }}
              error={!!formErrors.gstNumber}
              helperText={formErrors.gstNumber || 'Required if customer needs B2B Tax Invoice with input tax credit.'}
            />

            <FormControl fullWidth>
              <InputLabel>State / Region</InputLabel>
              <Select
                value={formData.state}
                label="State / Region"
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              >
                {INDIAN_STATES.map((st) => (
                  <MenuItem key={st} value={st}>
                    {st}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFormOpen(false)} sx={{ color: '#6B7280' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCustomer}
            sx={{
              bgcolor: '#2563EB',
              px: 3,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              '&:hover': { bgcolor: '#1D4ED8' }
            }}
          >
            {formMode === 'add' ? 'Save Customer' : 'Update Profile'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#DC2626' }}>
          Deactivate Customer Profile?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#4B5563', lineHeight: 1.6 }}>
            Are you sure you want to deactivate{' '}
            <strong>{customerToDelete ? getCustName(customerToDelete) : 'this customer'}</strong>?
          </Typography>
          <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mt: 1 }}>
            This customer will be hidden from the active directory. Existing sales invoices and revenue records
            remain safely preserved for audit.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteModalOpen(false)} sx={{ color: '#6B7280' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            sx={{ fontWeight: 600 }}
          >
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notifications */}
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
