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
  Alert,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  Menu,
  MenuItem,
  Divider,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  LocalShipping as VendorIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  LocationCity as CityIcon,
  Description as PoIcon,
  QrCodeScanner as InwardIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Place as PlaceIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import vendorService from '../../../_api/vendorService';

export default function VendorList() {
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({
    TotalVendors: 0,
    TotalCities: 0,
    TotalPurchaseOrders: 0,
    TotalInwards: 0
  });
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('All');

  // Modals & Menus
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedRowVendor, setSelectedRowVendor] = useState(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNote, setFormNote] = useState('');

  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, vendorStats] = await Promise.all([
        vendorService.getVendors(),
        vendorService.getVendorStats()
      ]);
      setVendors(list);
      setStats(vendorStats);
    } catch (err) {
      console.error('Error loading vendors:', err);
      setToast({ open: true, message: 'Failed to load vendors.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Vendors
  const filteredVendors = vendors.filter(v => {
    if (selectedCityFilter !== 'All' && v.City !== selectedCityFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = v.Name?.toLowerCase().includes(q);
      const codeMatch = v.VendorCode?.toLowerCase().includes(q);
      const cityMatch = v.City?.toLowerCase().includes(q);
      const phoneMatch = v.MobileNumber?.toLowerCase().includes(q);
      if (!nameMatch && !codeMatch && !cityMatch && !phoneMatch) return false;
    }
    return true;
  });

  const availableCities = Array.from(new Set(vendors.map(v => v.City).filter(Boolean)));

  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setSelectedVendor(null);
    setFormName('');
    setFormCode('');
    setFormCity('Mumbai');
    setFormPin('400001');
    setFormAddress('');
    setFormMobile('+91 ');
    setFormEmail('');
    setFormNote('Standard Net 15 days payment terms');
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (vendor) => {
    setDialogMode('edit');
    setSelectedVendor(vendor);
    setFormName(vendor.Name || '');
    setFormCode(vendor.VendorCode || '');
    setFormCity(vendor.City || '');
    setFormPin(vendor.Pin || '');
    setFormAddress(vendor.Address || '');
    setFormMobile(vendor.MobileNumber || '');
    setFormEmail(vendor.Email || '');
    setFormNote(vendor.Note || '');
    setDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleSaveVendor = async () => {
    if (!formName.trim() || !formMobile.trim()) {
      setToast({ open: true, message: 'Vendor business name and contact mobile are required.', severity: 'warning' });
      return;
    }

    try {
      if (dialogMode === 'add') {
        const created = await vendorService.createVendor({
          Name: formName.trim(),
          VendorCode: formCode.trim() || undefined,
          City: formCity.trim(),
          Pin: formPin.trim(),
          Address: formAddress.trim(),
          MobileNumber: formMobile.trim(),
          Email: formEmail.trim(),
          Note: formNote.trim()
        });
        setToast({ open: true, message: `Supplier "${created.Name}" registered successfully!`, severity: 'success' });
      } else {
        const updated = await vendorService.updateVendor(selectedVendor.Id, {
          Name: formName.trim(),
          VendorCode: formCode.trim() || selectedVendor.VendorCode,
          City: formCity.trim(),
          Pin: formPin.trim(),
          Address: formAddress.trim(),
          MobileNumber: formMobile.trim(),
          Email: formEmail.trim(),
          Note: formNote.trim()
        });
        setToast({ open: true, message: `Supplier "${updated.Name}" updated successfully!`, severity: 'success' });
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving vendor:', err);
      setToast({ open: true, message: 'Failed to save vendor: ' + err.message, severity: 'error' });
    }
  };

  const handleDeleteVendor = async () => {
    if (!vendorToDelete) return;
    try {
      await vendorService.deleteVendor(vendorToDelete.Id);
      setToast({ open: true, message: `Supplier "${vendorToDelete.Name}" deactivated.`, severity: 'success' });
      setDeleteConfirmOpen(false);
      setVendorToDelete(null);
      loadData();
    } catch (err) {
      console.error('Error deleting vendor:', err);
      setToast({ open: true, message: 'Failed to deactivate supplier.', severity: 'error' });
    }
  };

  const handleViewVendor = (v) => {
    setSelectedVendor(v);
    setViewDialogOpen(true);
    setMenuAnchor(null);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: '#0EA5E9',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
              }}
            >
              <VendorIcon />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.5px' }}>
              Vendor Directory
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Manage external supplier profiles, verified procurement channels, contacts, and delivery agreements.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#0EA5E9',
              boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)',
              '&:hover': { bgcolor: '#0284C7' }
            }}
          >
            Add Supplier Profile
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                bgcolor: '#F0F9FF',
                color: '#0EA5E9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <VendorIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Active Suppliers
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.2 }}>
                {stats.TotalVendors}
              </Typography>
              <Typography variant="caption" sx={{ color: '#0EA5E9', fontWeight: 500 }}>
                Verified vendor directory
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                bgcolor: '#ECFDF5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CityIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Supply Cities
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.2 }}>
                {stats.TotalCities}
              </Typography>
              <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 500 }}>
                Regional distribution nodes
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                bgcolor: '#FFF9DB',
                color: '#F59F00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PoIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Purchase Orders
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.2 }}>
                {stats.TotalPurchaseOrders}
              </Typography>
              <Typography variant="caption" sx={{ color: '#F59F00', fontWeight: 500 }}>
                Linked procurement orders
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                bgcolor: '#F3F0FF',
                color: '#7950F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <InwardIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Inward Consignments
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.2 }}>
                {stats.TotalInwards}
              </Typography>
              <Typography variant="caption" sx={{ color: '#7950F2', fontWeight: 500 }}>
                Audited receiving dockets
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          border: '1px solid #E2E8F0',
          bgcolor: '#FFFFFF',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Chip
            label="All Cities"
            onClick={() => setSelectedCityFilter('All')}
            variant={selectedCityFilter === 'All' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: 600,
              borderRadius: 2,
              cursor: 'pointer',
              bgcolor: selectedCityFilter === 'All' ? '#0EA5E9' : 'transparent',
              color: selectedCityFilter === 'All' ? '#FFFFFF' : '#475569',
              borderColor: selectedCityFilter === 'All' ? '#0EA5E9' : '#CBD5E1'
            }}
          />
          {availableCities.map(city => (
            <Chip
              key={city}
              label={city}
              onClick={() => setSelectedCityFilter(city)}
              variant={selectedCityFilter === city ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                cursor: 'pointer',
                bgcolor: selectedCityFilter === city ? '#0EA5E9' : 'transparent',
                color: selectedCityFilter === city ? '#FFFFFF' : '#475569',
                borderColor: selectedCityFilter === city ? '#0EA5E9' : '#CBD5E1',
                '&:hover': { bgcolor: selectedCityFilter === city ? '#0284C7' : '#F1F5F9' }
              }}
            />
          ))}
        </Box>

        <TextField
          size="small"
          placeholder="Search Vendor, Code, Mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94A3B8' }} />
              </InputAdornment>
            )
          }}
          sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Paper>

      {/* Main Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
        }}
      >
        <Table sx={{ minWidth: 800 }}>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Vendor Code</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Business / Supplier Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Location & Address</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Contact Phone</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Email Address</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Terms / Notes</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                  <VendorIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
                  <Typography variant="body1" sx={{ color: '#64748B', fontWeight: 600 }}>
                    No suppliers found matching your query.
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    Try clearing search criteria or add a new supplier profile.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((v) => (
                <TableRow
                  key={v.Id}
                  hover
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <TableCell>
                    <Box
                      onClick={() => handleViewVendor(v)}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        fontWeight: 700,
                        color: '#0EA5E9',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontSize: '0.95rem',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      {v.VendorCode}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          bgcolor: '#E0F2FE',
                          color: '#0284C7'
                        }}
                      >
                        {v.Name ? v.Name.charAt(0).toUpperCase() : 'V'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                          {v.Name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          ID: {v.Id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PlaceIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                      <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>
                        {v.City || 'N/A'} {v.Pin ? `(${v.Pin})` : ''}
                      </Typography>
                    </Box>
                    {v.Address && (
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', maxWidth: 220, noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {v.Address}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PhoneIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                      <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
                        {v.MobileNumber || 'N/A'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <EmailIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                      <Typography variant="body2" sx={{ color: '#475569' }}>
                        {v.Email || 'N/A'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {v.Note ? (
                      <Chip
                        label={v.Note}
                        size="small"
                        sx={{ bgcolor: '#F8FAFC', color: '#475569', fontWeight: 500, maxWidth: 180 }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">Standard</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                      <Tooltip title="View Profile">
                        <IconButton
                          size="small"
                          onClick={() => handleViewVendor(v)}
                          sx={{ color: '#0EA5E9', '&:hover': { bgcolor: '#F0F9FF' } }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Edit Profile">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEditDialog(v)}
                          sx={{ color: '#64748B', '&:hover': { bgcolor: '#F1F5F9' } }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="More Options">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setSelectedRowVendor(v);
                            setMenuAnchor(e.currentTarget);
                          }}
                          sx={{ color: '#64748B' }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Row Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{ elevation: 3, sx: { borderRadius: 2, minWidth: 180, p: 0.5 } }}
      >
        <MenuItem
          onClick={() => {
            if (selectedRowVendor) handleViewVendor(selectedRowVendor);
          }}
          sx={{ gap: 1.5, py: 1 }}
        >
          <ViewIcon fontSize="small" sx={{ color: '#0EA5E9' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>View Details</Typography>
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (selectedRowVendor) handleOpenEditDialog(selectedRowVendor);
          }}
          sx={{ gap: 1.5, py: 1 }}
        >
          <EditIcon fontSize="small" sx={{ color: '#4361EE' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Edit Profile</Typography>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={() => {
            if (selectedRowVendor) {
              setVendorToDelete(selectedRowVendor);
              setDeleteConfirmOpen(true);
              setMenuAnchor(null);
            }
          }}
          sx={{ gap: 1.5, py: 1, color: '#E03131' }}
        >
          <DeleteIcon fontSize="small" sx={{ color: '#E03131' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Deactivate Supplier</Typography>
        </MenuItem>
      </Menu>

      {/* Add / Edit Supplier Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#1E293B', pb: 1 }}>
          {dialogMode === 'add' ? 'Register New Supplier Profile' : `Edit Supplier: ${selectedVendor?.Name}`}
        </DialogTitle>
        <DialogContent dividers sx={{ borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', py: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Supplier / Business Name *"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Fresh Dairy Co-operative Ltd"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Vendor Code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="Auto-generated (e.g. VND-104)"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Contact Mobile *"
                value={formMobile}
                onChange={(e) => setFormMobile(e.target.value)}
                placeholder="+91 98220 12345"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="City *"
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                placeholder="e.g. Mumbai"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="PIN Code"
                value={formPin}
                onChange={(e) => setFormPin(e.target.value)}
                placeholder="400001"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Official Email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="orders@supplier.com"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Business Street Address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="Plot / Sector / Industrial Area"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Commercial Terms / Contract Notes"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="e.g. Net 15 days, morning 7 AM delivery"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveVendor}
            sx={{
              bgcolor: '#0EA5E9',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              px: 3,
              boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)',
              '&:hover': { bgcolor: '#0284C7' }
            }}
          >
            {dialogMode === 'add' ? 'Save Supplier' : 'Update Profile'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Supplier Profile Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#1E293B', pb: 1 }}>
          Supplier Profile Dossier
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedVendor && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    bgcolor: '#0EA5E9',
                    color: '#FFFFFF'
                  }}
                >
                  {selectedVendor.Name?.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                    {selectedVendor.Name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={selectedVendor.VendorCode}
                      size="small"
                      sx={{ bgcolor: '#F0F9FF', color: '#0284C7', fontWeight: 700, fontFamily: 'monospace' }}
                    />
                    <Chip
                      label="Active Supplier"
                      size="small"
                      sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 700 }}
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Phone / Mobile
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', mt: 0.3 }}>
                    {selectedVendor.MobileNumber || 'Not configured'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Email Address
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', mt: 0.3 }}>
                    {selectedVendor.Email || 'Not configured'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Operating City
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', mt: 0.3 }}>
                    {selectedVendor.City} {selectedVendor.Pin ? `(${selectedVendor.Pin})` : ''}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Registration ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', mt: 0.3 }}>
                    {selectedVendor.Id}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Premises Address
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', mt: 0.3 }}>
                    {selectedVendor.Address || 'No street address recorded'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC' }}>
                    <Typography variant="caption" sx={{ color: '#0EA5E9', fontWeight: 700, textTransform: 'uppercase' }}>
                      Payment & Contract Terms
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#334155', mt: 0.5, fontWeight: 500 }}>
                      {selectedVendor.Note || 'Standard retail distribution terms apply.'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setViewDialogOpen(false);
              if (selectedVendor) handleOpenEditDialog(selectedVendor);
            }}
            sx={{ bgcolor: '#0EA5E9', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Edit Profile
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#E03131' }}>
          Deactivate Supplier?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to deactivate <strong>{vendorToDelete?.Name}</strong> ({vendorToDelete?.VendorCode})? This vendor will be archived from active procurement queries.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteVendor}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Confirm Deactivation
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
          sx={{ borderRadius: 2, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
