import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button
} from '@mui/material';
import {
  CurrencyRupee as RupeeIcon,
  Receipt as InvoiceIcon,
  ShoppingBag as ItemIcon,
  WarningAmber as AlertIcon,
  PointOfSale as PosIcon
} from '@mui/icons-material';
import invoiceService from '../../../_api/invoiceService';
import productService from '../../../_api/productService';

export default function Dashboard() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function loadData() {
      const invs = await invoiceService.getInvoices();
      setInvoices(invs);
      const prods = await productService.getProducts();
      setProducts(prods);
    }
    loadData();
  }, []);

  const totalSales = invoices.reduce((sum, i) => sum + (i.RecordStatus === 0 ? i.Amount : 0), 0);
  const totalInvoices = invoices.filter(i => i.RecordStatus === 0).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 700 }}>
            Executive Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Today's financial metrics, sales velocity, and inventory alerts.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<PosIcon />}
          onClick={() => navigate('/apps/bucket')}
          sx={{ fontWeight: 700, px: 3, py: 1 }}
        >
          Open POS Terminal
        </Button>
      </Box>

      {/* 4 KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #3B5BDB' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600 }}>TODAY'S REVENUE</Typography>
                <RupeeIcon sx={{ color: '#3B5BDB', fontSize: 20 }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#1F2937' }}>
                ₹{totalSales.toFixed(2)}
              </Typography>
              <Chip label="+14.2% vs yesterday" size="small" sx={{ mt: 1, bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 600, height: 20, fontSize: 11 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #12B886' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600 }}>INVOICES TODAY</Typography>
                <InvoiceIcon sx={{ color: '#12B886', fontSize: 20 }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#1F2937' }}>
                {totalInvoices}
              </Typography>
              <Chip label="All settled" size="small" sx={{ mt: 1, bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 600, height: 20, fontSize: 11 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #7950F2' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600 }}>ACTIVE SKUS</Typography>
                <ItemIcon sx={{ color: '#7950F2', fontSize: 20 }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#1F2937' }}>
                {products.length}
              </Typography>
              <Chip label="100% In stock" size="small" sx={{ mt: 1, bgcolor: '#F3F0FF', color: '#7950F2', fontWeight: 600, height: 20, fontSize: 11 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #F59F00' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600 }}>EXPIRING BATCHES</Typography>
                <AlertIcon sx={{ color: '#F59F00', fontSize: 20 }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#1F2937' }}>
                {products.filter(p => p.IsExpDate && p.Days <= 5).length}
              </Typography>
              <Chip label="Attention needed" size="small" sx={{ mt: 1, bgcolor: '#FFF9DB', color: '#F59F00', fontWeight: 600, height: 20, fontSize: 11 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Two Tables Side by Side */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              Recent Sales Invoices
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Invoice No</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.slice(0, 5).map((inv) => (
                  <TableRow key={inv.Id}>
                    <TableCell sx={{ fontWeight: 600, color: '#3B5BDB' }}>{inv.DocumentNumber}</TableCell>
                    <TableCell>{inv.CustomerName}</TableCell>
                    <TableCell>
                      <Chip label={inv.ModeOfPayment === 0 ? 'Cash' : 'UPI'} size="small" />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>₹{inv.Amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip label={inv.RecordStatus === 0 ? 'Paid' : 'Cancelled'} size="small" color={inv.RecordStatus === 0 ? 'success' : 'error'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              Batches Expiring Soon (FEFO)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Shelf Life</TableCell>
                  <TableCell align="right">Stock</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.filter(p => p.IsExpDate).map((prod) => (
                  <TableRow key={prod.Id}>
                    <TableCell sx={{ fontWeight: 600 }}>{prod.Name}</TableCell>
                    <TableCell>
                      <Chip label={`${prod.Days} Days`} size="small" sx={{ bgcolor: '#FFF9DB', color: '#D9480F', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{prod.StockQuantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
