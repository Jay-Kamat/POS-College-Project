import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer
} from '@mui/material';
import { FileDownload as ExportIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import reportService from '../../../_api/reportService';
import { exportToCsv } from '../../../utils/exportCsv';

export default function DailySalesReport() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await reportService.getDailySalesReport();
      setData(res);
    }
    load();
  }, []);

  const totalRevenue = data.reduce((s, d) => s + d.GrandTotal, 0);
  const totalCash = data.reduce((s, d) => s + d.CashTotal, 0);
  const totalUpi = data.reduce((s, d) => s + d.UpiTotal, 0);
  const totalTax = data.reduce((s, d) => s + d.TaxCollected, 0);
  const totalBills = data.reduce((s, d) => s + d.InvoicesCount, 0);

  const handleExport = () => {
    exportToCsv(
      'Daily_Sales_Report',
      data,
      [
        { key: 'Date', label: 'Date' },
        { key: 'InvoicesCount', label: 'Total Invoices' },
        { key: 'CashTotal', label: 'Cash Sales (INR)' },
        { key: 'UpiTotal', label: 'UPI Sales (INR)' },
        { key: 'TaxCollected', label: 'Tax Collected (INR)' },
        { key: 'GrandTotal', label: 'Grand Total (INR)' }
      ]
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button startIcon={<BackIcon />} onClick={() => navigate('/apps/reports')} sx={{ color: '#4B5563' }}>
            Reports
          </Button>
          <Typography variant="h2" sx={{ fontWeight: 700 }}>
            Daily Sales Summary
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<ExportIcon />} onClick={handleExport}>
          Export to CSV
        </Button>
      </Box>

      {/* KPI Metric Strip */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#F8FAFC' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">TOTAL REVENUE</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#3B5BDB' }}>₹{totalRevenue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#F8FAFC' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">TOTAL INVOICES</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{totalBills}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#F8FAFC' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">CASH COLLECTIONS</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#1C7ED6' }}>₹{totalCash.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#F8FAFC' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">UPI COLLECTIONS</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#7950F2' }}>₹{totalUpi.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#F8FAFC' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">GST COLLECTED</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#2F9E44' }}>₹{totalTax.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Daily Data Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="center">Invoices Count</TableCell>
              <TableCell align="right">Cash Sales (₹)</TableCell>
              <TableCell align="right">UPI Sales (₹)</TableCell>
              <TableCell align="right">Tax Collected (₹)</TableCell>
              <TableCell align="right">Grand Total (₹)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.Date} hover>
                <TableCell sx={{ fontWeight: 600 }}>{row.Date}</TableCell>
                <TableCell align="center">{row.InvoicesCount}</TableCell>
                <TableCell align="right">₹{row.CashTotal.toFixed(2)}</TableCell>
                <TableCell align="right">₹{row.UpiTotal.toFixed(2)}</TableCell>
                <TableCell align="right">₹{row.TaxCollected.toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#3B5BDB' }}>
                  ₹{row.GrandTotal.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
