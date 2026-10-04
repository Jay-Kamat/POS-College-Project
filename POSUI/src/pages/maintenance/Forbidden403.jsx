import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Block as BlockIcon } from '@mui/icons-material';

export default function Forbidden403() {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <Paper sx={{ p: 5, textAlign: 'center', maxWidth: 450, borderRadius: 3 }}>
        <BlockIcon sx={{ fontSize: 64, color: '#E03131', mb: 2 }} />
        <Typography variant="h2" sx={{ fontWeight: 700, mb: 1 }}>
          403 - Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your active staff role does not have authorization to access this module. Please switch roles or contact your administrator.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate('/apps/bucket')}>
          Return to POS Terminal
        </Button>
      </Paper>
    </Box>
  );
}
