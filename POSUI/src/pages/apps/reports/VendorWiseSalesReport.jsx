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
  TableContainer,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  FileDownload as ExportIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Storefront as VendorIcon,
  ShoppingBag as UnitsIcon,
  CurrencyRupee as RevenueIcon,
  AccountBalanceWallet as MarginIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import reportService from '../../../_api/reportService';
import { exportToCsv } from '../../../utils/exportCsv';

export default function VendorWiseSalesReport() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('All');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await reportService.getVendorWiseSalesReport();
      setData(res || []);
    } catch (err) {
      console.error('Failed to load vendor-wise sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Aggregates
  const totalVendors = data.length;
  const totalUnits = data.reduce((s, d) => s + Number(d.TotalQuantity || 0), 0);
  const totalGrossSales = data.reduce((s, d) => s + Number(d.SalesValue || 0), 0);
  const totalMargin = data.reduce((s, d) => s + Number(d.MarginEarned || (d.SalesValue * 0.15) || 0), 0);

  // Filtered
  const filteredData = data.filter((row) => {
    if (cityFilter !== 'All' && (row.City || '').toLowerCase() !== cityFilter.toLowerCase()) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const codeMatch = (row.VendorCode || '').toLowerCase().includes(q);
      const nameMatch = (row.VendorName || '').toLowerCase().includes(q);
      const cityMatch = (row.City || '').toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !cityMatch) return false;
    }
    return true;
  });

  // Unique cities for filter chips
  const cities = Array.from(new Set(data.map((d) => d.City).filter(Boolean)));

  const handleExport = () => {
    exportToCsv(
      'Vendor_Wise_Sales_Performance_Report',
      filteredData,
      [
        { key: 'VendorCode', label: 'Vendor Code' },
        { key: 'VendorName', label: 'Vendor Name' },
        { key: 'City', label: 'City' },
        { key: 'ItemsSold', label: 'Items Billed Count' },
        { key: 'TotalQuantity', label: 'Total Units Sold' },
        { key: 'SalesValue', label: 'Gross Sales Value (INR)' },
        { key: 'MarginEarned', label: 'Estimated Margin (INR)' }
      ]
    );
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/apps/reports')}
            sx={{
              color: '#4B5563',
              bgcolor: '#F3F4F6',
              fontWeight: 600,
              borderRadius: 2,
              '&:hover': { bgcolor: '#E5E7EB' }
            }}
          >
            Hub
          </Button>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
              Vendor-Wise Sales Performance
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              Procurement brand audit, supplier revenue contribution, and estimated gross margin yields.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
            sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ExportIcon />}
            onClick={handleExport}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              textTransform: 'none',
              bgcolor: '#059669',
              boxShadow: '0 4px 12px rgba(5,150,105,0.25)',
              '&:hover': { bgcolor: '#047857' }
            }}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* KPI Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Card 1: Suppliers Analyzed */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Suppliers Analyzed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', mt: 0.5 }}>
                    {totalVendors}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    Active Vendor Partners
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 46, height: 46 }}>
                  <VendorIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Units Sold */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Total Units Sold
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                    {totalUnits.toFixed(1)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#16A34A', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    Billed Quantities
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#DCFCE7', color: '#059669', width: 46, height: 46 }}>
                  <UnitsIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Gross Sales Value */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Gross Sales Yield
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#2563EB', mt: 0.5 }}>
                    ₹{totalGrossSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    Retail Turnover
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#DBEAFE', color: '#2563EB', width: 46, height: 46 }}>
                  <RevenueIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Est Margin */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FAF5FF 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Est. Margin (15%)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#7C3AED', mt: 0.5 }}>
                    ₹{totalMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#7C3AED', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    Gross Profit Contribution
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#F3E8FF', color: '#7C3AED', width: 46, height: 46 }}>
                  <MarginIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label="All Locations"
            onClick={() => setCityFilter('All')}
            sx={{
              fontWeight: 600,
              borderRadius: 2,
              bgcolor: cityFilter === 'All' ? '#1E293B' : '#F1F5F9',
              color: cityFilter === 'All' ? '#FFFFFF' : '#475569'
            }}
          />
          {cities.map((ct) => (
            <Chip
              key={ct}
              label={ct}
              onClick={() => setCityFilter(ct)}
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                bgcolor: cityFilter === ct ? '#1E293B' : '#F1F5F9',
                color: cityFilter === ct ? '#FFFFFF' : '#475569'
              }}
            />
          ))}
        </Box>

        <TextField
          size="small"
          placeholder="Search vendor name, code, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 280 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#9CA3AF', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <ClearIcon
                  sx={{ cursor: 'pointer', fontSize: 16, color: '#9CA3AF' }}
                  onClick={() => setSearch('')}
                />
              </InputAdornment>
            ) : null
          }}
        />
      </Paper>

      {/* Vendor Sales Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 3,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        <Table sx={{ minWidth: 750 }}>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Supplier Code & Brand</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Operating City</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Products Billed</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Total Units Sold</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Gross Sales Value (₹)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Est. Margin (₹)</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8, width: 140 }}>Sales Share</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} sx={{ color: '#059669', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: '#6B7280' }}>
                    Compiling supplier sales performance...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
                    No vendor sales records found matching filters
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => {
                const salesVal = Number(row.SalesValue || 0);
                const marginVal = Number(row.MarginEarned ?? (salesVal * 0.15) ?? 0);
                const sharePct = totalGrossSales > 0 ? (salesVal / totalGrossSales) * 100 : 0;

                return (
                  <TableRow
                    key={row.VendorCode}
                    hover
                    sx={{
                      '&:hover': { bgcolor: '#F8FAFC' },
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <TableCell sx={{ py: 1.8 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            bgcolor: '#EEF2FF',
                            color: '#4338CA',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            width: 38,
                            height: 38
                          }}
                        >
                          {row.VendorCode.replace('VND-', '')}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                            {row.VendorName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace' }}>
                            {row.VendorCode}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ py: 1.8 }}>
                      <Chip
                        label={row.City || 'Mumbai'}
                        size="small"
                        sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 600 }}
                      />
                    </TableCell>

                    <TableCell align="center" sx={{ py: 1.8 }}>
                      <Chip
                        label={`${row.ItemsSold || 0} items`}
                        size="small"
                        sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell align="center" sx={{ fontWeight: 700, color: '#1E293B', py: 1.8 }}>
                      {Number(row.TotalQuantity || 0).toFixed(1)}
                    </TableCell>

                    <TableCell align="right" sx={{ fontWeight: 800, color: '#059669', fontSize: '1rem', py: 1.8 }}>
                      ₹{salesVal.toFixed(2)}
                    </TableCell>

                    <TableCell align="right" sx={{ fontWeight: 700, color: '#7C3AED', py: 1.8 }}>
                      ₹{marginVal.toFixed(2)}
                    </TableCell>

                    <TableCell sx={{ py: 1.8 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, sharePct)}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: '#E2E8F0',
                              '& .MuiLinearProgress-bar': { bgcolor: '#059669' }
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', minWidth: 32 }}>
                          {sharePct.toFixed(0)}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
