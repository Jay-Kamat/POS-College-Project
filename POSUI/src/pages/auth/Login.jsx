import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { setAuth, setActiveStore } from '../../store/authSlice';
import apiClient, { setAuthTokens } from '../../_api/apiClient';

const PRECONFIGURED_CREDENTIALS = [
  { role: 'Admin', email: 'admin@dailymart.in', pass: 'Admin@Pass123', color: 'primary' },
  { role: 'Store Manager', email: 'manager@dailymart.in', pass: 'Manager@Pass123', color: 'success' },
  { role: 'Cashier', email: 'cashier@dailymart.in', pass: 'Cashier@Pass123', color: 'info' },
  { role: 'Inventory', email: 'inventory@dailymart.in', pass: 'Inventory@Pass123', color: 'warning' }
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('admin@dailymart.in');
  const [password, setPassword] = useState('Admin@Pass123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const executeAuth = async (authEmail, authPassword) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.post('/api/auth/login', {
        email: authEmail.trim(),
        password: authPassword
      });

      const token = response.token || response.Token;
      const refreshToken = response.refreshToken || response.RefreshToken;
      const user = response.user || response.User;
      const permissions = response.permissions || response.Permissions || [];

      if (!token || !user) {
        throw new Error('Authentication succeeded but response was malformed.');
      }

      setAuthTokens(token, refreshToken);

      dispatch(setAuth({
        token,
        refreshToken,
        user: {
          uid: user.id || user.Id,
          email: user.email || user.Email,
          displayName: user.displayName || user.DisplayName || user.name || user.Name,
          role: user.role || user.Role,
          storeId: user.storeId || user.StoreId,
          storeName: user.storeName || user.StoreName
        },
        permissions
      }));

      if (user.storeId) {
        dispatch(setActiveStore({
          id: user.storeId || user.StoreId,
          name: user.storeName || user.StoreName || 'DailyMart Store'
        }));
      }

      const role = user.role || user.Role;
      const from = location.state?.from?.pathname;

      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else if (role === 'Cashier') {
        navigate('/apps/bucket', { replace: true });
      } else if (role === 'Inventory' || role === 'Inventory Manager') {
        navigate('/apps/materialInward', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Login failure:', err);
      if (err.status === 423) {
        setErrorMessage('Account is temporarily locked due to consecutive failed login attempts. Please wait 15 minutes.');
      } else if (err.status === 401) {
        setErrorMessage('Invalid email or password. Please verify credentials.');
      } else {
        setErrorMessage(err.message || 'Unable to connect to the authentication server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }
    executeAuth(email, password);
  };

  const handleFillCredentials = (item) => {
    setEmail(item.email);
    setPassword(item.pass);
    setErrorMessage('');
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            component="img"
            src="/favicon.svg"
            alt="POS Logo"
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'white',
              p: 0.5,
              objectFit: 'contain',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          />
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
          © 2026 POS & Billing System. Production PostgreSQL Backend Architecture.
        </Typography>
      </Box>

      {/* Right Login Form */}
      <Box sx={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Paper sx={{ p: 4, width: '100%', maxWidth: 440, borderRadius: 3, boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#1F2937' }}>
            Sign In
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Authenticate to access your store terminal or administrative hub.
          </Typography>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Corporate Email Address"
              margin="normal"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ mt: 3, mb: 2, py: 1.3, fontWeight: 700, borderRadius: 2 }}
            >
              {loading ? 'Authenticating...' : 'Sign In to System'}
            </Button>
          </Box>

          <Divider sx={{ my: 2.5 }}>
            <Typography variant="caption" color="text.secondary">
              Seeded Production Credentials
            </Typography>
          </Divider>

          {/* Quick-fill credential chips for seeded users */}
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B', display: 'block', mb: 1.5, textAlign: 'center' }}>
            Click to fill pre-configured user credentials:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            {PRECONFIGURED_CREDENTIALS.map((cred) => (
              <Chip
                key={cred.role}
                label={cred.role}
                clickable
                color={cred.color}
                variant={email === cred.email ? 'filled' : 'outlined'}
                onClick={() => handleFillCredentials(cred)}
                size="small"
                sx={{ fontWeight: 600, px: 0.5 }}
              />
            ))}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
