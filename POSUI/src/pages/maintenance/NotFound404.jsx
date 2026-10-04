import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';

export default function NotFound404() {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <Paper sx={{ p: 5, textAlign: 'center', maxWidth: 450, borderRadius: 3 }}>
        <ErrorIcon sx={{ fontSize: 64, color: '#3B5BDB', mb: 2 }} />
        <Typography variant="h2" sx={{ fontWeight: 700, mb: 1 }}>
          404 - Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          The requested system route does not exist.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Paper>
    </Box>
  );
}
