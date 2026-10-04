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
  TableContainer,
  Chip
} from '@mui/material';
import { FileDownload as ExportIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import reportService from '../../../_api/reportService';
import { exportToCsv } from '../../../utils/exportCsv';

export default function VendorWiseExpiredStockReport() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await reportService.getVendorWiseExpiredStockReport();
      setData(res);
    }
    load();
  }, []);

  const totalAtRisk = data.reduce((s, d) => s + d.TotalLossValue, 0);

  const handleExport = () => {
    exportToCsv(
      'Vendor_Wise_Expired_Stock_Report',
      data,
      [
        { key: 'VendorName', label: 'Supplier' },
        { key: 'ProductName', label: 'Product' },
        { key: 'BatchBarcode', label: 'Batch Barcode' },
        { key: 'ExpiryDate', label: 'Expiry Date' },
        { key: 'Quantity', label: 'Stock on Shelf' },
        { key: 'TotalLossValue', label: 'Value at Cost (INR)' }
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
            Vendor-Wise Expired / Expiring Stock
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip
            label={`Total Value at Risk: ₹${totalAtRisk.toFixed(2)}`}
            color="error"
            sx={{ fontWeight: 700 }}
          />
          <Button variant="contained" color="primary" startIcon={<ExportIcon />} onClick={handleExport}>
            Export to CSV
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Supplier / Vendor</TableCell>
              <TableCell>Product Name</TableCell>
              <TableCell>Batch Barcode</TableCell>
              <TableCell>Expiry Date</TableCell>
              <TableCell align="center">Shelf Status</TableCell>
              <TableCell align="center">Quantity</TableCell>
              <TableCell align="right">Value at Cost (₹)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.Id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{row.VendorName}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#1F2937' }}>{row.ProductName}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{row.BatchBarcode}</TableCell>
                <TableCell>{row.ExpiryDate}</TableCell>
                <TableCell align="center">
                  {row.IsOverdue ? (
                    <Chip label="Critical Expiry" size="small" sx={{ bgcolor: '#FFE3E3', color: '#E03131', fontWeight: 700 }} />
                  ) : (
                    <Chip label="Expiring Soon" size="small" sx={{ bgcolor: '#FFF9DB', color: '#D9480F', fontWeight: 700 }} />
                  )}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>{row.Quantity}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#E03131' }}>
                  ₹{row.TotalLossValue.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
