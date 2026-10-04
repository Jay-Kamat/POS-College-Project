import React, { useState } from 'react';
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
  Badge
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
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';
import { setRole } from '../../store/authSlice';

const DRAWER_WIDTH = 250;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, activeStore } = useSelector(state => state.auth);

  const [open, setOpen] = useState(true);
  const [roleAnchor, setRoleAnchor] = useState(null);

  const handleToggleDrawer = () => setOpen(!open);

  const navigationItems = [
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, roles: ['Admin'] },
    { text: 'POS Terminal', path: '/apps/bucket', icon: <PosIcon />, roles: ['Admin', 'Cashier'], badge: 'Live' },
    { text: 'Invoices', path: '/apps/invoice', icon: <InvoiceIcon />, roles: ['Admin', 'Cashier'] },
    { text: 'Product Catalog', path: '/apps/product', icon: <ProductIcon />, roles: ['Admin', 'Inventory Manager'] },
    { text: 'Material Inward', path: '/apps/materialInward', icon: <InwardIcon />, roles: ['Admin', 'Inventory Manager'] },
    { text: 'Purchase Orders', path: '/apps/purchaseOrder', icon: <PoIcon />, roles: ['Admin', 'Inventory Manager'] },
    { text: 'Material Returns', path: '/apps/returns', icon: <InwardIcon />, roles: ['Admin', 'Inventory Manager'] },
    { text: 'Vendors', path: '/apps/vendor', icon: <VendorIcon />, roles: ['Admin', 'Inventory Manager'] },
    { text: 'Customers', path: '/apps/customer', icon: <CustomerIcon />, roles: ['Admin', 'Cashier'] },
    { text: 'Reports', path: '/apps/reports', icon: <DashboardIcon />, roles: ['Admin', 'Inventory Manager'] },
    { text: 'Settings', path: '/apps/settings', icon: <SettingsIcon />, roles: ['Admin'] },
    { text: 'Users & Roles', path: '/apps/users', icon: <CustomerIcon />, roles: ['Admin'] },
  ];

  const filteredNavItems = navigationItems.filter(item => 
    !user || item.roles.includes(user.role)
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F5F7FB' }}>
      {/* Top Application Bar */}
      <AppBar
        position="fixed"
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  bgcolor: '#3B5BDB',
                  color: 'white',
                  fontWeight: 700,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1.5,
                  fontSize: 16
                }}
              >
                POS
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1F2937' }}>
                DailyMart
              </Typography>
            </Box>

            {/* Store Branch Badge */}
            <Chip
              icon={<StoreIcon sx={{ fontSize: 16 }} />}
              label={`${activeStore.name} (Mumbai)`}
              size="small"
              sx={{ bgcolor: '#F1F5F9', fontWeight: 500, color: '#334155' }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* OpenWA Gateway Indicator */}
            <Tooltip title="OpenWA Gateway: Paired & Active on :2785">
              <Chip
                icon={<WhatsAppIcon sx={{ color: '#2F9E44 !important', fontSize: 16 }} />}
                label="WhatsApp Live"
                size="small"
                sx={{ bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 600, border: '1px solid #D3F9D8' }}
              />
            </Tooltip>

            {/* Role Switcher for instant pairing / testing */}
            <Tooltip title="Switch Role for Simulation">
              <Chip
                label={`Role: ${user?.role || 'Admin'}`}
                color="primary"
                onClick={(e) => setRoleAnchor(e.currentTarget)}
                sx={{ fontWeight: 600, cursor: 'pointer' }}
              />
            </Tooltip>
            <Menu
              anchorEl={roleAnchor}
              open={Boolean(roleAnchor)}
              onClose={() => setRoleAnchor(null)}
            >
              <MenuItem onClick={() => { dispatch(setRole('Admin')); setRoleAnchor(null); }}>
                Admin (Full Access)
              </MenuItem>
              <MenuItem onClick={() => { dispatch(setRole('Cashier')); setRoleAnchor(null); navigate('/apps/bucket'); }}>
                Cashier (POS Terminal & Invoices)
              </MenuItem>
              <MenuItem onClick={() => { dispatch(setRole('Inventory Manager')); setRoleAnchor(null); navigate('/apps/materialInward'); }}>
                Inventory Manager (POs & Inward)
              </MenuItem>
            </Menu>

            {/* User Avatar */}
            <Avatar sx={{ bgcolor: '#3B5BDB', width: 36, height: 36, fontSize: 14 }}>
              {user?.displayName ? user.displayName.charAt(0) : 'J'}
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Collapsible Left Navigation Drawer */}
      <Drawer
        variant="permanent"
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
        </Box>
      </Drawer>

      {/* Main Page Content Body */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: `calc(100% - ${open ? DRAWER_WIDTH : 64}px)` }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
