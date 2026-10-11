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
  Tooltip
} from '@mui/material';
import {
  FileDownload as ExportIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  WarningAmber as WarningIcon,
  Dangerous as CriticalIcon,
  Inventory2 as InventoryIcon,
  AccountBalanceWallet as LossIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  AssignmentReturn as ReturnIcon
} from '@mui/icons-material';
import reportService from '../../../_api/reportService';
import { exportToCsv } from '../../../utils/exportCsv';

export default function VendorWiseExpiredStockReport() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, CRITICAL, SOON, SAFE

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await reportService.getVendorWiseExpiredStockReport();
      setData(res || []);
    } catch (err) {
      console.error('Failed to load expired stock report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Aggregates
  const totalBatches = data.length;
  const criticalCount = data.filter((d) => (d.DaysRemaining <= 3 || d.IsOverdue)).length;
  const soonCount = data.filter((d) => (d.DaysRemaining > 3 && d.DaysRemaining <= 30)).length;
  const totalUnits = data.reduce((s, d) => s + Number(d.Quantity || 0), 0);
  const totalAtRisk = data.reduce((s, d) => s + Number(d.TotalLossValue ?? d.LossValue ?? (d.Quantity * d.CostPrice) ?? 0), 0);

  // Filtered
  const filteredData = data.filter((row) => {
    const days = Number(row.DaysRemaining ?? 0);
    const isCritical = row.IsOverdue || days <= 3;
    const isSoon = !isCritical && days <= 30;
    const isSafe = days > 30;

    if (statusFilter === 'CRITICAL' && !isCritical) return false;
    if (statusFilter === 'SOON' && !isSoon) return false;
    if (statusFilter === 'SAFE' && !isSafe) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const prodMatch = (row.ProductName || '').toLowerCase().includes(q);
      const vendMatch = (row.VendorName || '').toLowerCase().includes(q);
      const codeMatch = (row.VendorCode || '').toLowerCase().includes(q);
      const barMatch = (row.BatchBarcode || '').toLowerCase().includes(q);
      if (!prodMatch && !vendMatch && !codeMatch && !barMatch) return false;
    }
    return true;
  });

  const handleExport = () => {
    exportToCsv(
      'Vendor_Wise_Expired_Stock_Audit_Report',
      filteredData,
      [
        { key: 'VendorCode', label: 'Supplier Code' },
        { key: 'VendorName', label: 'Supplier Name' },
        { key: 'ProductName', label: 'Product Name' },
        { key: 'BatchBarcode', label: 'Batch / Barcode' },
        { key: 'ExpiryDate', label: 'Expiry Date' },
        { key: 'DaysRemaining', label: 'Days Remaining' },
        { key: 'Quantity', label: 'Shelf Stock Units' },
        { key: 'CostPrice', label: 'Unit Cost Price (INR)' },
        { key: 'TotalLossValue', label: 'Value at Cost (INR)' }
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
              Vendor-Wise Expired Stock Audit
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              Shelf-life FEFO compliance audit, perishable risk valuation, and vendor return readiness.
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
              bgcolor: '#D97706',
              boxShadow: '0 4px 12px rgba(217,119,6,0.25)',
              '&:hover': { bgcolor: '#B45309' }
            }}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* KPI Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Card 1: Batches Audited */}
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
                    Batches Audited
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', mt: 0.5 }}>
                    {totalBatches}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    {totalUnits} Units on Shelf
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 46, height: 46 }}>
                  <InventoryIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Critical Expiry */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid #FECACA',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FEF2F2 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 700, textTransform: 'uppercase' }}>
                    Critical Overdue (≤ 3d)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#DC2626', mt: 0.5 }}>
                    {criticalCount} Batches
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#B91C1C', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    Requires Urgent Pull
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#FEE2E2', color: '#DC2626', width: 46, height: 46 }}>
                  <CriticalIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Expiring Soon */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid #FED7AA',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 700, textTransform: 'uppercase' }}>
                    Expiring Soon (4–30d)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#D97706', mt: 0.5 }}>
                    {soonCount} Batches
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    FEFO Clearance Window
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 46, height: 46 }}>
                  <WarningIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Total Value at Risk */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FDF2F8 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Value At Risk (Cost)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#BE185D', mt: 0.5 }}>
                    ₹{totalAtRisk.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#BE185D', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    Potential Write-off
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#FCE7F3', color: '#BE185D', width: 46, height: 46 }}>
                  <LossIcon />
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
          {[
            { id: 'ALL', label: `All Batches (${data.length})` },
            { id: 'CRITICAL', label: `Critical Overdue (${criticalCount})` },
            { id: 'SOON', label: `Expiring Soon (${soonCount})` },
            { id: 'SAFE', label: `Safe Shelf (>30d) (${data.length - criticalCount - soonCount})` }
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <Chip
                key={tab.id}
                label={tab.label}
                onClick={() => setStatusFilter(tab.id)}
                sx={{
                  fontWeight: 600,
                  borderRadius: 2,
                  bgcolor: isSelected ? '#1E293B' : '#F1F5F9',
                  color: isSelected ? '#FFFFFF' : '#475569'
                }}
              />
            );
          })}
        </Box>

        <TextField
          size="small"
          placeholder="Search product, barcode, supplier..."
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

      {/* Expired Stock Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 3,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        <Table sx={{ minWidth: 800 }}>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Supplier Partner</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Product & SKU</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Batch Expiry Date</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Shelf Risk Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Units on Shelf</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Unit Cost (₹)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Loss Value (₹)</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} sx={{ color: '#D97706', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: '#6B7280' }}>
                    Compiling shelf-life batch audit...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
                    No stock batches found matching the selected filter
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => {
                const days = Number(row.DaysRemaining ?? 0);
                const isCritical = row.IsOverdue || days <= 3;
                const isSoon = !isCritical && days <= 30;
                const lossVal = Number(row.TotalLossValue ?? row.LossValue ?? (row.Quantity * row.CostPrice) ?? 0);

                return (
                  <TableRow
                    key={row.Id || row.BatchBarcode || row.ProductName}
                    hover
                    sx={{
                      '&:hover': { bgcolor: '#F8FAFC' },
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <TableCell sx={{ py: 1.8 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                        {row.VendorName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace' }}>
                        {row.VendorCode}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ py: 1.8 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                        {row.ProductName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>
                        {row.BatchBarcode || 'BAR-DEFAULT'}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ py: 1.8 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: isCritical ? '#DC2626' : '#334155' }}>
                        {row.ExpiryDate}
                      </Typography>
                      <Typography variant="caption" sx={{ color: isCritical ? '#DC2626' : '#64748B' }}>
                        {days <= 0 ? 'Expired Today' : `${days} days left`}
                      </Typography>
                    </TableCell>

                    <TableCell align="center" sx={{ py: 1.8 }}>
                      {isCritical ? (
                        <Chip
                          icon={<CriticalIcon sx={{ fontSize: '14px !important', color: '#DC2626 !important' }} />}
                          label="Critical Overdue"
                          size="small"
                          sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: '0.72rem' }}
                        />
                      ) : isSoon ? (
                        <Chip
                          icon={<WarningIcon sx={{ fontSize: '14px !important', color: '#D97706 !important' }} />}
                          label="Expiring Soon"
                          size="small"
                          sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 700, fontSize: '0.72rem' }}
                        />
                      ) : (
                        <Chip
                          label="Stable Shelf-Life"
                          size="small"
                          sx={{ bgcolor: '#F0FDF4', color: '#16A34A', fontWeight: 700, fontSize: '0.72rem' }}
                        />
                      )}
                    </TableCell>

                    <TableCell align="center" sx={{ fontWeight: 700, color: '#1E293B', py: 1.8 }}>
                      {row.Quantity}
                    </TableCell>

                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748B', py: 1.8 }}>
                      ₹{Number(row.CostPrice || 0).toFixed(2)}
                    </TableCell>

                    <TableCell align="right" sx={{ fontWeight: 800, color: '#BE185D', fontSize: '1rem', py: 1.8 }}>
                      ₹{lossVal.toFixed(2)}
                    </TableCell>

                    <TableCell align="center" sx={{ py: 1.8 }}>
                      <Tooltip title="Create Material Return Note for this product">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ReturnIcon />}
                          onClick={() => navigate('/apps/returns')}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 2,
                            borderColor: '#FCA5A5',
                            color: '#DC2626',
                            '&:hover': { bgcolor: '#FEE2E2', borderColor: '#F87171' }
                          }}
                        >
                          Return
                        </Button>
                      </Tooltip>
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
