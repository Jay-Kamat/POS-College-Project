import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
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

export default function VendorWiseSalesReport() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await reportService.getVendorWiseSalesReport();
      setData(res);
    }
    load();
  }, []);

  const handleExport = () => {
    exportToCsv(
      'Vendor_Wise_Sales_Report',
      data,
      [
        { key: 'VendorCode', label: 'Vendor Code' },
        { key: 'VendorName', label: 'Vendor Name' },
        { key: 'City', label: 'City' },
        { key: 'TotalQuantity', label: 'Total Units Sold' },
        { key: 'SalesValue', label: 'Total Sales Value (INR)' }
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
            Vendor-Wise Sales Performance
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<ExportIcon />} onClick={handleExport}>
          Export to CSV
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Vendor Code</TableCell>
              <TableCell>Vendor Business Name</TableCell>
              <TableCell>City</TableCell>
              <TableCell align="center">Products Billed</TableCell>
              <TableCell align="center">Total Quantity Sold</TableCell>
              <TableCell align="right">Gross Sales Value (₹)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.VendorCode} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#3B5BDB' }}>
                  {row.VendorCode}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{row.VendorName}</TableCell>
                <TableCell>{row.City}</TableCell>
                <TableCell align="center">{row.ItemsSold}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>{row.TotalQuantity}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#2F9E44', fontSize: 15 }}>
                  ₹{row.SalesValue.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
