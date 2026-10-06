import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Chip,
  Alert
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { setUser } from '../../store/authSlice';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('admin@dailymart.in');
  const [password, setPassword] = useState('Password@123');

  const handleLogin = (e) => {
    e.preventDefault();
    dispatch(setUser({
      uid: 'user_admin_01',
      email: email,
      displayName: 'Jay Sharma',
      role: 'Admin'
    }));
    navigate('/dashboard');
  };

  const handleQuickDemoLogin = (role) => {
    dispatch(setUser({
      uid: `user_${role.toLowerCase().replace(' ', '_')}`,
      email: `${role.toLowerCase().replace(' ', '_')}@dailymart.in`,
      displayName: `${role} User`,
      role: role
    }));
    if (role === 'Cashier') navigate('/apps/bucket');
    else if (role === 'Inventory Manager') navigate('/apps/materialInward');
    else navigate('/dashboard');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#F5F7FB' }}>
      {/* Left Brand Panel */}
      <Box
        sx={{
          flex: 1,
          bgcolor: '#3B5BDB',
          color: 'white',
          p: 6,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ bgcolor: 'white', color: '#3B5BDB', px: 1.5, py: 0.5, borderRadius: 1.5, fontWeight: 700, fontSize: 18 }}>
            POS
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 700, color: 'white' }}>
            DailyMart Express
          </Typography>
        </Box>

        <Box>
          <Typography variant="h1" sx={{ color: 'white', fontWeight: 800, mb: 2, fontSize: 38 }}>
            Fast billing.<br />Smart inventory.
          </Typography>
          <Typography variant="body1" sx={{ color: '#DCE4F5', maxWidth: 440, fontSize: 16 }}>
            Enterprise-grade Point of Sale and GST billing system for Indian supermarkets, retail chains, and cafes.
          </Typography>
        </Box>

        <Typography variant="caption" sx={{ color: '#BAC8FF' }}>
          © 2026 POS & Billing System. PostgreSQL Backend Architecture.
        </Typography>
      </Box>

      {/* Right Login Form */}
      <Box sx={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Paper sx={{ p: 4, width: '100%', maxWidth: 420, borderRadius: 3 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: '#1F2937' }}>
            Sign In
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Access your store terminal or administrative hub.
          </Typography>

          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={() => handleQuickDemoLogin('Admin')}
            sx={{ py: 1.2, borderColor: '#CBD5E1', color: '#334155', fontWeight: 600, mb: 2.5 }}
          >
            Sign in with Google
          </Button>

          <Divider sx={{ mb: 2.5 }}>
            <Typography variant="caption" color="text.secondary">or with corporate email</Typography>
          </Divider>

          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Email Address"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.2, fontWeight: 700 }}
            >
              Sign In to System
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Quick Demo Access Bar */}
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#4B5563', display: 'block', mb: 1, textAlign: 'center' }}>
            Instant Simulator Logins:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Chip label="Admin" clickable onClick={() => handleQuickDemoLogin('Admin')} color="primary" size="small" />
            <Chip label="Cashier" clickable onClick={() => handleQuickDemoLogin('Cashier')} color="success" size="small" />
            <Chip label="Inv Manager" clickable onClick={() => handleQuickDemoLogin('Inventory Manager')} color="warning" size="small" />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
