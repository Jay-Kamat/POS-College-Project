import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
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
  Checkbox,
  Snackbar,
  Alert,
  AlertTitle,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
  Avatar,
  Tooltip,
  Divider,
  Stack
} from '@mui/material';
import {
  PersonAdd as InviteIcon,
  People as UsersIcon,
  Security as MatrixIcon,
  Save as SaveIcon,
  AdminPanelSettings as AdminIcon,
  PointOfSale as CashierIcon,
  Inventory2 as InventoryIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  CheckCircle as CheckIcon,
  Lock as LockIcon,
  Store as StoreIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import userService from '../../../_api/userService';

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 3, admins: 1, cashiers: 1, inventoryManagers: 1 });
  const [matrix, setMatrix] = useState([]);
  const [isMatrixDirty, setIsMatrixDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Invite Modal State
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Cashier');
  const [newUserStore, setNewUserStore] = useState('DailyMart Express (Mumbai)');

  // Edit / Role Change Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editRole, setEditRole] = useState('Cashier');
  const [editStatus, setEditStatus] = useState('Active');

  // Delete Confirmation Modal State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const loadData = async () => {
    try {
      const [u, s, m] = await Promise.all([
        userService.getUsers(),
        userService.getUserStats(),
        userService.getPermissionsMatrix()
      ]);
      setUsers(u || []);
      if (s) setStats(s);
      setMatrix(m || []);
      setIsMatrixDirty(false);
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setToast({ open: true, message: 'Please enter staff member name and corporate email.', severity: 'warning' });
      return;
    }
    try {
      const created = await userService.inviteUser({
        Name: newUserName.trim(),
        Email: newUserEmail.trim(),
        Role: newUserRole,
        Store: newUserStore
      });
      setToast({ open: true, message: `Staff account created for ${created.Name || newUserName}!`, severity: 'success' });
      setInviteOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('Cashier');
      await loadData();
    } catch (err) {
      setToast({ open: true, message: 'Failed to create user account.', severity: 'error' });
    }
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditRole(user.Role || 'Cashier');
    setEditStatus(user.Status || 'Active');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    try {
      await userService.updateUser(selectedUser.Id, {
        Name: selectedUser.Name,
        Email: selectedUser.Email,
        Role: editRole,
        Store: selectedUser.Store,
        Status: editStatus
      });
      setToast({ open: true, message: `Updated credentials for ${selectedUser.Name}.`, severity: 'success' });
      setEditOpen(false);
      setSelectedUser(null);
      await loadData();
    } catch (err) {
      setToast({ open: true, message: 'Failed to update user profile.', severity: 'error' });
    }
  };

  const handleOpenDelete = (user) => {
    setUserToDelete(user);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await userService.deleteUser(userToDelete.Id);
      setToast({ open: true, message: `User account ${userToDelete.Name} removed.`, severity: 'success' });
      setDeleteOpen(false);
      setUserToDelete(null);
      await loadData();
    } catch (err) {
      setToast({ open: true, message: 'Failed to delete user.', severity: 'error' });
    }
  };

  const handleTogglePermission = (modIndex, role, action) => {
    const updated = JSON.parse(JSON.stringify(matrix));
    if (!updated[modIndex][role]) {
      updated[modIndex][role] = {};
    }
    updated[modIndex][role][action] = !updated[modIndex][role][action];
    setMatrix(updated);
    setIsMatrixDirty(true);
  };

  const handleSaveMatrix = async () => {
    try {
      await userService.savePermissionsMatrix(matrix);
      setIsMatrixDirty(false);
      setToast({ open: true, message: 'Role permissions matrix updated & synchronized with backend!', severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: 'Failed to save permissions matrix.', severity: 'error' });
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (u.Name || '').toLowerCase().includes(q) ||
      (u.Email || '').toLowerCase().includes(q) ||
      (u.Role || '').toLowerCase().includes(q) ||
      (u.Store || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (roleFilter === 'ADMIN') return (u.Role || '').toLowerCase() === 'admin';
    if (roleFilter === 'CASHIER') return (u.Role || '').toLowerCase() === 'cashier';
    if (roleFilter === 'INVENTORY') return (u.Role || '').toLowerCase().includes('inventory');
    if (roleFilter === 'ACTIVE') return (u.Status || '').toLowerCase() === 'active';
    return true;
  });

  const getRoleBadgeColor = (role) => {
    const r = (role || '').toLowerCase();
    if (r === 'admin') return { bg: '#EEF2FF', text: '#3B5BDB', border: '#C5D2FC' };
    if (r === 'cashier') return { bg: '#EBFBEE', text: '#2F9E44', border: '#B2F2BB' };
    return { bg: '#FFF9DB', text: '#D9480F', border: '#FFE066' };
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.5px' }}>
            User Management & RBAC Security
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Manage authenticated staff credentials, store branch assignments, and configure granular role-based permissions.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ borderColor: '#CBD5E1', color: '#475569', '&:hover': { borderColor: '#94A3B8' } }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<InviteIcon />}
            onClick={() => setInviteOpen(true)}
            sx={{
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
              background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #4338CA 0%, #2563EB 100%)' }
            }}
          >
            Invite Staff Member
          </Button>
        </Stack>
      </Box>

      {/* 4 Executive KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              border: '1px solid #E2E8F0',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Active Staff
              </Typography>
              <Avatar sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', width: 40, height: 40 }}>
                <UsersIcon sx={{ fontSize: 22 }} />
              </Avatar>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#1E293B', mb: 0.5 }}>
              {stats.totalUsers || users.length}
            </Typography>
            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600 }}>
              ● Authorized store personnel
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              border: '1px solid #E2E8F0',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Administrators
              </Typography>
              <Avatar sx={{ bgcolor: '#EDE9FE', color: '#7C3AED', width: 40, height: 40 }}>
                <AdminIcon sx={{ fontSize: 22 }} />
              </Avatar>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#1E293B', mb: 0.5 }}>
              {stats.admins || 1}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
              Full system governance & config
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              border: '1px solid #E2E8F0',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Counter Cashiers
              </Typography>
              <Avatar sx={{ bgcolor: '#DCFCE7', color: '#15803D', width: 40, height: 40 }}>
                <CashierIcon sx={{ fontSize: 22 }} />
              </Avatar>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#1E293B', mb: 0.5 }}>
              {stats.cashiers || 1}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
              POS checkout & receipt issuing
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              border: '1px solid #E2E8F0',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Inventory Officers
              </Typography>
              <Avatar sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 40, height: 40 }}>
                <InventoryIcon sx={{ fontSize: 22 }} />
              </Avatar>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#1E293B', mb: 0.5 }}>
              {stats.inventoryManagers || 1}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
              Material inward, stock & returns
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* External Vendor Policy Banner */}
      <Alert
        severity="info"
        icon={<LockIcon sx={{ fontSize: 22 }} />}
        sx={{
          mb: 3,
          borderRadius: 2.5,
          border: '1px solid #BFDBFE',
          bgcolor: '#EFF6FF',
          '& .MuiAlert-message': { width: '100%' }
        }}
      >
        <AlertTitle sx={{ fontWeight: 700, color: '#1E40AF', mb: 0.2 }}>
          Security & Counterparty Access Policy
        </AlertTitle>
        <Typography variant="body2" sx={{ color: '#1E3A8A' }}>
          External Counterparty Vendors (e.g. <em>Hindustan Unilever, Amul Dairy</em>) are commercial suppliers and <strong>have zero login credentials</strong> to the internal POS terminal or back-office. Only authorized staff members assigned above are granted authenticated access according to the granular RBAC permissions below.
        </Typography>
      </Alert>

      {/* Tabs & Main Workspace */}
      <Paper sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{
            borderBottom: '1px solid #E2E8F0',
            bgcolor: '#F8FAFC',
            px: 2,
            '& .MuiTab-root': { fontWeight: 700, py: 2, textTransform: 'none', fontSize: '0.95rem' }
          }}
        >
          <Tab
            icon={<UsersIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={`Staff Accounts Directory (${users.length})`}
          />
          <Tab
            icon={<MatrixIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label="Granular RBAC Permissions Matrix"
          />
        </Tabs>

        {/* TAB 0: Staff Directory */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            {/* Filter & Search Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <TextField
                placeholder="Search staff by name, email, or role..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: { xs: '100%', sm: 340 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94A3B8' }} />
                    </InputAdornment>
                  )
                }}
              />

              <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5 }}>
                {[
                  { label: 'All Staff', key: 'ALL' },
                  { label: 'Admins', key: 'ADMIN' },
                  { label: 'Cashiers', key: 'CASHIER' },
                  { label: 'Inventory', key: 'INVENTORY' },
                  { label: 'Active Only', key: 'ACTIVE' }
                ].map((chip) => (
                  <Chip
                    key={chip.key}
                    label={chip.label}
                    onClick={() => setRoleFilter(chip.key)}
                    color={roleFilter === chip.key ? 'primary' : 'default'}
                    variant={roleFilter === chip.key ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Staff Data Table */}
            <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Staff Member</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Email Address</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Assigned Role</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Branch Store</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Last Active</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography variant="body1" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                          No staff members found matching your search.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => {
                      const badge = getRoleBadgeColor(u.Role);
                      return (
                        <TableRow key={u.Id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                sx={{
                                  width: 36,
                                  height: 36,
                                  bgcolor: badge.bg,
                                  color: badge.text,
                                  border: `1px solid ${badge.border}`,
                                  fontSize: 13,
                                  fontWeight: 800
                                }}
                              >
                                {getInitials(u.Name)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                                  {u.Name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                                  ID: {u.Id}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EmailIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                              <Typography variant="body2" sx={{ color: '#334155' }}>
                                {u.Email}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={u.Role}
                              size="small"
                              sx={{
                                bgcolor: badge.bg,
                                color: badge.text,
                                border: `1px solid ${badge.border}`,
                                fontWeight: 700,
                                fontSize: 12
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <StoreIcon sx={{ fontSize: 16, color: '#64748B' }} />
                              <Typography variant="body2" sx={{ color: '#475569' }}>
                                {u.Store || 'DailyMart Express (Mumbai)'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={u.Status || 'Active'}
                              size="small"
                              icon={<CheckIcon sx={{ fontSize: '14px !important', color: '#16A34A !important' }} />}
                              sx={{
                                bgcolor: '#F0FDF4',
                                color: '#16A34A',
                                border: '1px solid #BBF7D0',
                                fontWeight: 700,
                                fontSize: 12
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#64748B', fontSize: 13 }}>
                            {u.LastLogin || 'Never'}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Edit Role / Credentials">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEdit(u)}
                                  sx={{ color: '#4F46E5', '&:hover': { bgcolor: '#EEF2FF' } }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remove Staff Account">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDelete(u)}
                                  sx={{ color: '#EF4444', '&:hover': { bgcolor: '#FEE2E2' } }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 1: Granular Permissions Matrix */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            {/* Dirty Changes Banner */}
            {isMatrixDirty && (
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  bgcolor: '#FFFBEB',
                  borderRadius: 2.5,
                  border: '1px solid #FDE68A',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#B45309' }}>
                    Unsaved Permission Modifications
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#92400E' }}>
                    You have made changes to the RBAC matrix. Click 'Save Matrix Changes' to persist updates to the database.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveMatrix}
                  sx={{
                    bgcolor: '#D97706',
                    '&:hover': { bgcolor: '#B45309' },
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
                  }}
                >
                  Save Matrix Changes
                </Button>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B' }}>
                Module-Level Role Permissions (Admin vs Cashier vs Inventory Manager)
              </Typography>
              {!isMatrixDirty && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveMatrix}
                  size="small"
                  sx={{ fontWeight: 700 }}
                >
                  Save Matrix Changes
                </Button>
              )}
            </Box>

            <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', width: '30%', py: 1.5 }}>
                      System Module / Capability
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', fontWeight: 800, borderLeft: '1px solid #E2E8F0' }}
                    >
                      Admin (Full Governance)
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 800, borderLeft: '1px solid #E2E8F0' }}
                    >
                      Cashier (POS & Billing)
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ bgcolor: '#FFFBEB', color: '#D97706', fontWeight: 800, borderLeft: '1px solid #E2E8F0' }}
                    >
                      Inventory Manager (Stock & POs)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matrix.map((row, idx) => {
                    const cashierPerm = row.cashier || {};
                    const invPerm = row.inventory || {};
                    return (
                      <TableRow key={row.module || idx} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell sx={{ fontWeight: 700, color: '#1E293B', py: 1.8 }}>
                          {row.module}
                        </TableCell>

                        {/* Admin Column: Always Full Control */}
                        <TableCell align="center" sx={{ bgcolor: '#F8FAFC', borderLeft: '1px solid #E2E8F0' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <CheckIcon sx={{ fontSize: 18, color: '#4F46E5' }} />
                            <Typography variant="caption" sx={{ color: '#4F46E5', fontWeight: 700 }}>
                              Full Control
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Cashier Column */}
                        <TableCell align="center" sx={{ borderLeft: '1px solid #E2E8F0' }}>
                          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                            <Tooltip title="Toggle Cashier View / Access">
                              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                <Checkbox
                                  checked={!!cashierPerm.view}
                                  onChange={() => handleTogglePermission(idx, 'cashier', 'view')}
                                  color="success"
                                  size="small"
                                />
                                <Typography variant="caption" sx={{ color: cashierPerm.view ? '#059669' : '#94A3B8', fontWeight: 600 }}>
                                  {cashierPerm.view ? 'Enabled' : 'Disabled'}
                                </Typography>
                              </Box>
                            </Tooltip>
                          </Stack>
                        </TableCell>

                        {/* Inventory Manager Column */}
                        <TableCell align="center" sx={{ borderLeft: '1px solid #E2E8F0' }}>
                          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                            <Tooltip title="Toggle Inventory Manager View / Access">
                              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                <Checkbox
                                  checked={!!invPerm.view}
                                  onChange={() => handleTogglePermission(idx, 'inventory', 'view')}
                                  color="warning"
                                  size="small"
                                />
                                <Typography variant="caption" sx={{ color: invPerm.view ? '#D97706' : '#94A3B8', fontWeight: 600 }}>
                                  {invPerm.view ? 'Enabled' : 'Disabled'}
                                </Typography>
                              </Box>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* Invite Staff Member Dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#1E293B', pb: 1 }}>
          Invite & Onboard Staff Member
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
            Provision a new staff account with assigned role and store branch credentials.
          </Typography>
          <TextField
            fullWidth
            label="Full Name *"
            placeholder="e.g. Ananya Deshmukh"
            margin="normal"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <TextField
            fullWidth
            label="Corporate Email *"
            placeholder="e.g. ananya@dailymart.in"
            margin="normal"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Assigned Role *</InputLabel>
            <Select value={newUserRole} label="Assigned Role *" onChange={(e) => setNewUserRole(e.target.value)}>
              <MenuItem value="Admin">Administrator (Full Control)</MenuItem>
              <MenuItem value="Cashier">Front-Counter Cashier (POS & Billing)</MenuItem>
              <MenuItem value="Inventory Manager">Inventory Officer (Stock & POs)</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Branch Store Assignment *</InputLabel>
            <Select value={newUserStore} label="Branch Store Assignment *" onChange={(e) => setNewUserStore(e.target.value)}>
              <MenuItem value="DailyMart Express (Mumbai)">DailyMart Express (Mumbai - Flagship)</MenuItem>
              <MenuItem value="DailyMart Superstore (Pune)">DailyMart Superstore (Pune)</MenuItem>
              <MenuItem value="DailyMart Central (Nagpur)">DailyMart Central (Nagpur)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setInviteOpen(false)} sx={{ color: '#64748B' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleInvite}
            sx={{ fontWeight: 700 }}
          >
            Create Staff Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role / Account Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#1E293B', pb: 1 }}>
          Edit Staff Role & Access
        </DialogTitle>
        <DialogContent dividers>
          {selectedUser && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                {selectedUser.Name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                {selectedUser.Email} • {selectedUser.Store}
              </Typography>
            </Box>
          )}
          <FormControl fullWidth margin="normal">
            <InputLabel>Assigned Role</InputLabel>
            <Select value={editRole} label="Assigned Role" onChange={(e) => setEditRole(e.target.value)}>
              <MenuItem value="Admin">Administrator</MenuItem>
              <MenuItem value="Cashier">Cashier</MenuItem>
              <MenuItem value="Inventory Manager">Inventory Manager</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Account Status</InputLabel>
            <Select value={editStatus} label="Account Status" onChange={(e) => setEditStatus(e.target.value)}>
              <MenuItem value="Active">Active (Permitted)</MenuItem>
              <MenuItem value="Suspended">Suspended (Blocked)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: '#64748B' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveEdit} sx={{ fontWeight: 700 }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#EF4444' }}>
          Deactivate Staff Account?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Are you sure you want to deactivate and remove access for{' '}
            <strong>{userToDelete?.Name}</strong> ({userToDelete?.Email})?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} sx={{ fontWeight: 700 }}>
            Confirm Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast({ ...toast, open: false })}
          sx={{ borderRadius: 2, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
