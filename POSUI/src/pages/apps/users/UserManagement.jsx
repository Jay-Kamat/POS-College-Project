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
  AlertTitle
} from '@mui/material';
import {
  PersonAdd as InviteIcon,
  People as UsersIcon,
  Security as MatrixIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import userService from '../../../_api/userService';

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [isMatrixDirty, setIsMatrixDirty] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Cashier');

  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const loadData = async () => {
    const u = await userService.getUsers();
    setUsers(u);
    const m = await userService.getPermissionsMatrix();
    setMatrix(m);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = async () => {
    if (!newUserName || !newUserEmail) {
      setToast({ open: true, message: 'Please enter staff name and email.', severity: 'warning' });
      return;
    }
    await userService.inviteUser({
      Name: newUserName,
      Email: newUserEmail,
      Role: newUserRole,
      Store: 'DailyMart Express (Mumbai)'
    });
    setToast({ open: true, message: `Staff invitation sent to ${newUserEmail}!`, severity: 'success' });
    setInviteOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    loadData();
  };

  const handleTogglePermission = (modIndex, role, perm) => {
    const updated = JSON.parse(JSON.stringify(matrix));
    updated[modIndex][role][perm] = !updated[modIndex][role][perm];
    setMatrix(updated);
    setIsMatrixDirty(true);
  };

  const handleSaveMatrix = async () => {
    await userService.savePermissionsMatrix(matrix);
    setIsMatrixDirty(false);
    setToast({ open: true, message: 'Role permissions matrix updated successfully!', severity: 'success' });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 700 }}>
            User Management & Roles
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage authenticated staff accounts and configure granular RBAC permission matrix.
          </Typography>
        </Box>
        {activeTab === 0 && (
          <Button variant="contained" color="primary" startIcon={<InviteIcon />} onClick={() => setInviteOpen(true)}>
            Invite Staff Member
          </Button>
        )}
      </Box>

      {/* External Vendor Policy Banner */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>External Vendor Policy</AlertTitle>
        Vendors are external counterparty suppliers and <strong>have no system login credentials</strong>. They appear only as master records for PO delivery and Material Return Notes.
      </Alert>

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{ borderBottom: '1px solid #E3E8EF', px: 2 }}
        >
          <Tab icon={<UsersIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Staff Accounts" />
          <Tab icon={<MatrixIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Roles & Permissions Matrix" />
        </Tabs>

        {/* TAB 0: Staff Users */}
        {activeTab === 0 && (
          <TableContainer sx={{ p: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Staff Member Name</TableCell>
                  <TableCell>Email Address</TableCell>
                  <TableCell>Assigned Role</TableCell>
                  <TableCell>Branch Store</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Active</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.Id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{u.Name}</TableCell>
                    <TableCell>{u.Email}</TableCell>
                    <TableCell>
                      <Chip
                        label={u.Role}
                        size="small"
                        color={u.Role === 'Admin' ? 'primary' : u.Role === 'Cashier' ? 'success' : 'warning'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>{u.Store}</TableCell>
                    <TableCell>
                      <Chip label={u.Status} size="small" sx={{ bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell sx={{ color: '#6B7280', fontSize: 13 }}>{u.LastLogin}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* TAB 1: Permissions Matrix */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            {isMatrixDirty && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: '#FFF9DB', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#D9480F' }}>
                  You have unsaved changes to role permission rules.
                </Typography>
                <Button variant="contained" color="warning" startIcon={<SaveIcon />} onClick={handleSaveMatrix}>
                  Save Matrix Changes
                </Button>
              </Box>
            )}

            <TableContainer sx={{ border: '1px solid #E3E8EF', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700 }}>System Module / Page</TableCell>
                    <TableCell align="center" sx={{ bgcolor: '#EEF2FF', color: '#3B5BDB', fontWeight: 700 }}>Admin (View/Edit)</TableCell>
                    <TableCell align="center" sx={{ bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 700 }}>Cashier (View/Edit)</TableCell>
                    <TableCell align="center" sx={{ bgcolor: '#FFF9DB', color: '#D9480F', fontWeight: 700 }}>Inventory Manager (View/Edit)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matrix.map((row, idx) => (
                    <TableRow key={row.module} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{row.module}</TableCell>
                      <TableCell align="center">
                        <Checkbox checked={row.admin.view} disabled color="primary" size="small" />
                        <Typography variant="caption" sx={{ color: '#3B5BDB', fontWeight: 600 }}>Full Control</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={row.cashier.view}
                          onChange={() => handleTogglePermission(idx, 'cashier', 'view')}
                          color="success"
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={row.inventory.view}
                          onChange={() => handleTogglePermission(idx, 'inventory', 'view')}
                          color="warning"
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* Invite Staff Dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Invite Staff Member</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Full Name"
            margin="normal"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <TextField
            fullWidth
            label="Corporate Email"
            margin="normal"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Assigned Role</InputLabel>
            <Select value={newUserRole} label="Assigned Role" onChange={(e) => setNewUserRole(e.target.value)}>
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Cashier">Cashier</MenuItem>
              <MenuItem value="Inventory Manager">Inventory Manager</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleInvite}>Send Invitation</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
