import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Button,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  PointOfSale as PosIcon,
  ReceiptLong as InvoiceIcon,
  Inventory2 as ProductIcon,
  Storefront as StoreIcon,
  LocalShipping as VendorIcon,
  Description as PoIcon,
  QrCodeScanner as InwardIcon,
  People as CustomerIcon,
  Settings as SettingsIcon,
  WhatsApp as WhatsAppIcon,
  ChevronLeft as ChevronLeftIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Lock as LockIcon,
  AddCircleOutline as AddIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { setRole, setActiveStore, logout } from '../../store/authSlice';
import { clearAuth } from '../../_api/apiClient';
import settingService from '../../_api/settingService';

const DRAWER_WIDTH = 250;

const INDIAN_STATES = [
  'Maharashtra', 'Gujarat', 'Karnataka', 'Delhi', 'Tamil Nadu',
  'Telangana', 'Rajasthan', 'Uttar Pradesh', 'West Bengal', 'Kerala',
  'Madhya Pradesh', 'Punjab', 'Haryana', 'Bihar', 'Odisha', 'Goa',
  'Andhra Pradesh', 'Assam'
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, activeStore } = useSelector(state => state.auth);

  const [open, setOpen] = useState(true);
  const [roleAnchor, setRoleAnchor] = useState(null);
  const [storeAnchor, setStoreAnchor] = useState(null);
  const [userAnchor, setUserAnchor] = useState(null);
  const [availableStores, setAvailableStores] = useState([]);

  const handleLogout = () => {
    setUserAnchor(null);
    dispatch(logout());
    clearAuth();
    navigate('/login', { replace: true });
  };

  // Create New Outlet Dialog State
  const [createOutletOpen, setCreateOutletOpen] = useState(false);
  const [creatingStore, setCreatingStore] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [newStore, setNewStore] = useState({
    Name: '',
    LongName: '',
    Address: '',
    State: 'Maharashtra',
    Country: 'India',
    GstNumber: '',
    FoodLicenseNumber: '',
    MobileNumber: '',
    PhoneNumber: '',
    Email: '',
    InvoicePrefix: 'INV',
    ReceiptFooterText: 'Thank you for shopping with us! No exchange after 7 days.',
    PaperSize: '80mm'
  });

  const handleCreateOutlet = async () => {
    if (!newStore.Name.trim()) {
      setToast({ open: true, message: 'Display Store Name is required.', severity: 'warning' });
      return;
    }
    setCreatingStore(true);
    try {
      const created = await settingService.createStore({
        ...newStore,
        Id: `store_${Date.now()}`
      });
      setCreateOutletOpen(false);
      setNewStore({
        Name: '',
        LongName: '',
        Address: '',
        State: 'Maharashtra',
        Country: 'India',
        GstNumber: '',
        FoodLicenseNumber: '',
        MobileNumber: '',
        PhoneNumber: '',
        Email: '',
        InvoicePrefix: 'INV',
        ReceiptFooterText: 'Thank you for shopping with us! No exchange after 7 days.',
        PaperSize: '80mm'
      });
      const updatedList = await settingService.getStores();
      setAvailableStores(updatedList || []);
      if (created) {
        dispatch(setActiveStore({
          id: created.Id || created.id,
          name: created.Name || created.name,
          address: created.Address || created.address,
          state: created.State || created.state,
          gstin: created.GstNumber || created.gstNumber,
          fssai: created.FoodLicenseNumber || created.foodLicenseNumber,
          phone: created.MobileNumber || created.mobileNumber
        }));
      }
      setToast({ open: true, message: `New store outlet "${created.Name || newStore.Name}" registered and switched!`, severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: 'Failed to create new store outlet: ' + err.message, severity: 'error' });
    } finally {
      setCreatingStore(false);
    }
  };

  useEffect(() => {
    async function loadStores() {
      try {
        const stores = await settingService.getStores();
        setAvailableStores(stores || []);
      } catch (err) {
        console.warn('Failed to load stores for topbar:', err);
      }
    }
    loadStores();
  }, []);

  const handleToggleDrawer = () => setOpen(!open);

  const navigationItems = [
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, roles: ['Admin', 'Store Manager'] },
    { text: 'POS Terminal', path: '/apps/bucket', icon: <PosIcon />, roles: ['Admin', 'Store Manager', 'Cashier'], badge: 'Live' },
    { text: 'Invoices', path: '/apps/invoice', icon: <InvoiceIcon />, roles: ['Admin', 'Store Manager', 'Cashier'] },
    { text: 'Product Catalog', path: '/apps/product', icon: <ProductIcon />, roles: ['Admin', 'Store Manager', 'Inventory', 'Inventory Manager'] },
    { text: 'Material Inward', path: '/apps/materialInward', icon: <InwardIcon />, roles: ['Admin', 'Store Manager', 'Inventory', 'Inventory Manager'] },
    { text: 'Purchase Orders', path: '/apps/purchaseOrder', icon: <PoIcon />, roles: ['Admin', 'Store Manager', 'Inventory', 'Inventory Manager'] },
    { text: 'Material Returns', path: '/apps/returns', icon: <InwardIcon />, roles: ['Admin', 'Store Manager', 'Inventory', 'Inventory Manager'] },
    { text: 'Vendors', path: '/apps/vendor', icon: <VendorIcon />, roles: ['Admin', 'Store Manager', 'Inventory', 'Inventory Manager'] },
    { text: 'Customers', path: '/apps/customer', icon: <CustomerIcon />, roles: ['Admin', 'Store Manager', 'Cashier'] },
    { text: 'Reports', path: '/apps/reports', icon: <DashboardIcon />, roles: ['Admin', 'Store Manager', 'Inventory', 'Inventory Manager'] },
    { text: 'Settings', path: '/apps/settings', icon: <SettingsIcon />, roles: ['Admin', 'Store Manager'] },
    { text: 'Users & Roles', path: '/apps/users', icon: <CustomerIcon />, roles: ['Admin', 'Store Manager'] },
  ];

  const currentRole = user?.role || 'Admin';
  const filteredNavItems = navigationItems.filter(item => 
    !user || item.roles.includes(currentRole)
  );

  const isAdmin = currentRole === 'Admin';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F5F7FB' }}>
      {/* Top Application Bar */}
      <AppBar
        position="fixed"
        className="no-print"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: '#FFFFFF',
          color: '#1F2937',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          borderBottom: '1px solid #E3E8EF'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton edge="start" onClick={handleToggleDrawer} sx={{ color: '#4B5563' }}>
              {open ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
              <Box
                component="img"
                src="/favicon.svg"
                alt="POS Logo"
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  objectFit: 'contain'
                }}
              />
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1F2937' }}>
                DailyMart
              </Typography>
            </Box>

            {/* Store Branch Badge - Interactive for Admin, Locked for other roles */}
            {isAdmin ? (
              <>
                <Tooltip title="Switch Active Outlet (Admin Exclusive)">
                  <Chip
                    icon={<StoreIcon sx={{ fontSize: 16, color: '#2563EB !important' }} />}
                    label={activeStore?.name || 'DailyMart Express (Mumbai)'}
                    deleteIcon={<ArrowDownIcon sx={{ fontSize: '18px !important', color: '#2563EB !important' }} />}
                    onDelete={(e) => setStoreAnchor(e.currentTarget)}
                    onClick={(e) => setStoreAnchor(e.currentTarget)}
                    size="small"
                    sx={{
                      bgcolor: '#EFF6FF',
                      fontWeight: 700,
                      color: '#1D4ED8',
                      border: '1px solid #BFDBFE',
                      cursor: 'pointer',
                      display: { xs: 'none', md: 'inline-flex' },
                      '&:hover': { bgcolor: '#DBEAFE' }
                    }}
                  />
                </Tooltip>
                <Menu
                  anchorEl={storeAnchor}
                  open={Boolean(storeAnchor)}
                  onClose={() => setStoreAnchor(null)}
                >
                  <MenuItem disabled sx={{ opacity: '0.85 !important', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Select Store Outlet (Admin)
                  </MenuItem>
                  {availableStores.map((st) => {
                    const isSelected = (st.Id || st.id) === (activeStore?.id || activeStore?.Id);
                    return (
                      <MenuItem
                        key={st.Id || st.id}
                        selected={isSelected}
                        onClick={() => {
                          dispatch(setActiveStore({
                            id: st.Id || st.id,
                            name: st.Name || st.name,
                            address: st.Address || st.address,
                            state: st.State || st.state,
                            gstin: st.GstNumber || st.gstNumber,
                            fssai: st.FoodLicenseNumber || st.foodLicenseNumber,
                            phone: st.MobileNumber || st.mobileNumber
                          }));
                          setStoreAnchor(null);
                        }}
                        sx={{ minWidth: 260 }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                          <StoreIcon sx={{ fontSize: 20, color: isSelected ? '#2563EB' : '#64748B' }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: isSelected ? 800 : 600, color: isSelected ? '#1E40AF' : '#1E293B' }}>
                              {st.Name || st.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                              {st.State || st.state} • GST: {st.GstNumber || st.gstNumber || 'N/A'}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    );
                  })}
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem 
                    onClick={() => { setStoreAnchor(null); setCreateOutletOpen(true); }}
                    sx={{ color: '#2563EB', fontWeight: 700, py: 1 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AddIcon sx={{ fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#2563EB' }}>
                        + Register New Store Outlet
                      </Typography>
                    </Box>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Tooltip title={`Assigned Outlet: ${activeStore?.name || 'DailyMart Store'} (Store switching is restricted to Admin)`}>
                <Chip
                  icon={<StoreIcon sx={{ fontSize: 16 }} />}
                  label={activeStore?.name || 'DailyMart Express (Mumbai)'}
                  size="small"
                  sx={{
                    bgcolor: '#F1F5F9',
                    fontWeight: 600,
                    color: '#334155',
                    border: '1px solid #E2E8F0',
                    display: { xs: 'none', md: 'inline-flex' }
                  }}
                />
              </Tooltip>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* OpenWA Gateway Indicator */}
            <Tooltip title="OpenWA Gateway: Paired & Active on :2785">
              <Chip
                icon={<WhatsAppIcon sx={{ color: '#2F9E44 !important', fontSize: 16 }} />}
                label="WhatsApp Live"
                size="small"
                sx={{ bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 600, border: '1px solid #D3F9D8', display: { xs: 'none', sm: 'inline-flex' } }}
              />
            </Tooltip>

            {/* Role Switcher for Simulation & Testing */}
            <Tooltip title="Switch Role for Simulation">
              <Chip
                label={`Role: ${currentRole}`}
                color={isAdmin ? 'primary' : (currentRole === 'Store Manager' ? 'success' : 'default')}
                onClick={(e) => setRoleAnchor(e.currentTarget)}
                sx={{ fontWeight: 700, cursor: 'pointer' }}
              />
            </Tooltip>
            <Menu
              anchorEl={roleAnchor}
              open={Boolean(roleAnchor)}
              onClose={() => setRoleAnchor(null)}
            >
              <MenuItem onClick={() => { dispatch(setRole('Admin')); setRoleAnchor(null); }}>
                Admin (Full Access & Switch Outlets)
              </MenuItem>
              <MenuItem onClick={() => { dispatch(setRole('Store Manager')); setRoleAnchor(null); }}>
                Store Manager (Edit Store Profile & Operations)
              </MenuItem>
              <MenuItem onClick={() => { dispatch(setRole('Cashier')); setRoleAnchor(null); navigate('/apps/bucket'); }}>
                Cashier (POS Terminal & Invoices)
              </MenuItem>
              <MenuItem onClick={() => { dispatch(setRole('Inventory')); setRoleAnchor(null); navigate('/apps/materialInward'); }}>
                Inventory (POs & Material Inward)
              </MenuItem>
            </Menu>

            {/* User Avatar & Profile / Logout Menu */}
            <Tooltip title={`${user?.displayName || 'User'} (${currentRole})`}>
              <IconButton onClick={(e) => setUserAnchor(e.currentTarget)} sx={{ p: 0 }}>
                <Avatar sx={{ bgcolor: isAdmin ? '#3B5BDB' : (currentRole === 'Store Manager' ? '#2F9E44' : '#E03131'), width: 36, height: 36, fontSize: 14 }}>
                  {user?.displayName ? user.displayName.charAt(0) : 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={userAnchor}
              open={Boolean(userAnchor)}
              onClose={() => setUserAnchor(null)}
              PaperProps={{ sx: { width: 230, p: 0.5, borderRadius: 2 } }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1F2937' }}>
                  {user?.displayName || 'Active Staff'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', wordBreak: 'break-all' }}>
                  {user?.email || 'user@dailymart.in'}
                </Typography>
                <Chip label={currentRole} size="small" color="primary" sx={{ mt: 0.8, height: 20, fontSize: 10, fontWeight: 700 }} />
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem onClick={handleLogout} sx={{ color: '#E03131', fontWeight: 600 }}>
                <ListItemIcon sx={{ color: '#E03131', minWidth: 28 }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Collapsible Left Navigation Drawer */}
      <Drawer
        variant="permanent"
        className="no-print"
        sx={{
          width: open ? DRAWER_WIDTH : 64,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? DRAWER_WIDTH : 64,
            boxSizing: 'border-box',
            bgcolor: '#FFFFFF',
            borderRight: '1px solid #E3E8EF',
            transition: 'width 0.2s ease-in-out',
            overflowX: 'hidden'
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', p: open ? 1.5 : 0.5 }}>
          <List>
            {filteredNavItems.map((item) => {
              const isSelected = location.pathname.startsWith(item.path);
              return (
                <ListItem key={item.text} disablePadding sx={{ display: 'block', mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    selected={isSelected}
                    sx={{
                      minHeight: 44,
                      justifyContent: open ? 'initial' : 'center',
                      px: 2,
                      borderRadius: 2,
                      bgcolor: isSelected ? '#EEF2FF !important' : 'transparent',
                      color: isSelected ? '#3B5BDB' : '#4B5563',
                      '&:hover': { bgcolor: '#F8FAFC' }
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 2 : 'auto',
                        justifyContent: 'center',
                        color: isSelected ? '#3B5BDB' : '#6B7280'
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {open && (
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: 14,
                          fontWeight: isSelected ? 600 : 500
                        }}
                      />
                    )}
                    {open && item.badge && (
                      <Chip
                        label={item.badge}
                        size="small"
                        sx={{ height: 20, fontSize: 10, bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 700 }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>

          {/* Sign Out Option at Drawer Bottom */}
          <Divider sx={{ my: 1 }} />
          <List sx={{ px: 1 }}>
            <ListItem disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                onClick={handleLogout}
                sx={{
                  minHeight: 44,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2,
                  borderRadius: 2,
                  color: '#E03131',
                  '&:hover': { bgcolor: '#FFF5F5' }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 2 : 'auto',
                    justifyContent: 'center',
                    color: '#E03131'
                  }}
                >
                  <LogoutIcon />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary="Sign Out"
                    primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Main Page Content Body */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: `calc(100% - ${open ? DRAWER_WIDTH : 64}px)` }}>
        <Toolbar />
        <Outlet />
      </Box>

      {/* Admin Quick Create Store Outlet Modal */}
      <Dialog
        open={createOutletOpen}
        onClose={() => setCreateOutletOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#1E293B', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ bgcolor: '#EFF6FF', p: 1, borderRadius: 2, display: 'flex', color: '#2563EB' }}>
              <StoreIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Register New Store Outlet</Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Create a fully isolated store outlet with independent inventory, barcodes, and billing records
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Store Display Name *"
                placeholder="e.g. DailyMart Express (Ahmedabad)"
                value={newStore.Name}
                onChange={(e) => setNewStore({ ...newStore, Name: e.target.value })}
                size="small"
                helperText="Public outlet brand title"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Legal Business Name"
                placeholder="e.g. DailyMart Retail Private Limited"
                value={newStore.LongName}
                onChange={(e) => setNewStore({ ...newStore, LongName: e.target.value })}
                size="small"
                helperText="Entity title printed on tax invoices"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Store Physical Address *"
                placeholder="Shop 104, City Mall, Ring Road, Ahmedabad"
                value={newStore.Address}
                onChange={(e) => setNewStore({ ...newStore, Address: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>State (GST State)</InputLabel>
                <Select
                  value={newStore.State}
                  label="State (GST State)"
                  onChange={(e) => setNewStore({ ...newStore, State: e.target.value })}
                >
                  {INDIAN_STATES.map((st) => (
                    <MenuItem key={st} value={st}>{st}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="GSTIN (15 Digits)"
                placeholder="24AABCU9603R1Z9"
                value={newStore.GstNumber}
                onChange={(e) => setNewStore({ ...newStore, GstNumber: e.target.value.toUpperCase() })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="FSSAI License Number"
                placeholder="11522001000999"
                value={newStore.FoodLicenseNumber}
                onChange={(e) => setNewStore({ ...newStore, FoodLicenseNumber: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Invoice Prefix"
                placeholder="INV-AMD"
                value={newStore.InvoicePrefix}
                onChange={(e) => setNewStore({ ...newStore, InvoicePrefix: e.target.value.toUpperCase() })}
                size="small"
                helperText="E.g. INV-AMD gives INV-AMD-00001"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Store Mobile Number"
                placeholder="+91 98765 12345"
                value={newStore.MobileNumber}
                onChange={(e) => setNewStore({ ...newStore, MobileNumber: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Official Store Email"
                placeholder="outlet.ahmedabad@dailymart.in"
                value={newStore.Email}
                onChange={(e) => setNewStore({ ...newStore, Email: e.target.value })}
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateOutletOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleCreateOutlet}
            variant="contained"
            disabled={creatingStore || !newStore.Name.trim()}
            sx={{ bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' }, fontWeight: 700 }}
          >
            {creatingStore ? <CircularProgress size={20} color="inherit" /> : 'Register & Switch Outlet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ width: '100%', fontWeight: 600 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
