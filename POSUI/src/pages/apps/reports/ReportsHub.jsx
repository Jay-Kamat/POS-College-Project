import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button
} from '@mui/material';
import {
  Today as DailyIcon,
  Store as VendorSalesIcon,
  HourglassBottom as ExpiredIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';

export default function ReportsHub() {
  const navigate = useNavigate();

  const reportCards = [
    {
      title: 'Daily Sales Report',
      description: 'Transaction counts, payment splits (Cash vs UPI), tax breakdowns, and daily gross revenues.',
      path: '/apps/dailySales',
      icon: <DailyIcon sx={{ fontSize: 36, color: '#3B5BDB' }} />,
      color: '#3B5BDB'
    },
    {
      title: 'Vendor-Wise Sales',
      description: 'Sales volume and revenue performance broken down by supplying vendor and brand.',
      path: '/apps/vendorWiseSale',
      icon: <VendorSalesIcon sx={{ fontSize: 36, color: '#12B886' }} />,
      color: '#12B886'
    },
    {
      title: 'Vendor-Wise Expired Stock',
      description: 'Audits of inventory nearing or past shelf-life expiry with cost value impact and return readiness.',
      path: '/apps/vendorWiseExpiredStock',
      icon: <ExpiredIcon sx={{ fontSize: 36, color: '#F59F00' }} />,
      color: '#F59F00'
    }
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontWeight: 700 }}>
          Reports & Financial Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Statutory GST sales reports, supplier analytics, and shelf-life compliance audits.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {reportCards.map((r) => (
          <Grid item xs={12} md={4} key={r.title}>
            <Card
              sx={{
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  borderColor: r.color
                }
              }}
            >
              <CardContent>
                <Box sx={{ mb: 2 }}>{r.icon}</Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {r.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {r.description}
                </Typography>
              </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  endIcon={<ArrowIcon />}
                  onClick={() => navigate(r.path)}
                  sx={{ borderColor: '#CBD5E1', color: '#1F2937', fontWeight: 600 }}
                >
                  View Report
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
