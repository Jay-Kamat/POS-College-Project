import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Card,
  CardContent,
  Chip,
  Divider,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  QrCodeScanner as InwardIcon,
  Print as PrintIcon,
  CheckCircle as SuccessIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  DeleteOutline as DeleteIcon,
  Visibility as ViewIcon,
  Inventory2 as ProductIcon,
  LocalShipping as VendorIcon,
  AssignmentTurnedIn as PoIcon,
  Close as CloseIcon,
  FileDownload as ExportIcon,
  CalendarMonth as CalendarIcon,
  WarningAmber as WarningIcon
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import purchaseOrderService from '../../../_api/purchaseOrderService';
import vendorService from '../../../_api/vendorService';
import productService from '../../../_api/productService';
import materialInwardService from '../../../_api/materialInwardService';
import { printBarcodeLabels } from '../../../utils/printService';
import { getUnitMeta } from '../../../utils/uomHelper';

const steps = ['Receipt Mode & Vendor', 'Verify Quantities & Expiry', 'Generate & Print Barcodes'];

export default function MaterialInward() {
  const [currentTab, setCurrentTab] = useState(0); // 0: New Inward Wizard, 1: History List
  const [activeStep, setActiveStep] = useState(0);
  
  // Data states
  const [inwards, setInwards] = useState([]);
  const [stats, setStats] = useState({
    TotalInwards: 0,
    TodayInwards: 0,
    ActiveVendors: 0,
    PoInwards: 0
  });
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states for history
  const [search, setSearch] = useState('');

  // Wizard state
  const [mode, setMode] = useState('with_po'); // 'with_po' | 'without_po'
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  
  const [inwardItems, setInwardItems] = useState([]);

  // For adding products directly in "without_po" mode
  const [newProdId, setNewProdId] = useState('');
  const [newProdQty, setNewProdQty] = useState(10);

  // Result state after creation
  const [generatedInward, setGeneratedInward] = useState(null);

  // Docket detail view dialog state
  const [viewDocket, setViewDocket] = useState(null);

  // Toast notification
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  // Load live data from PostgreSQL API
  const loadData = async () => {
    try {
      setLoading(true);
      const [inwList, statData, poList, vndList, prodList] = await Promise.all([
        materialInwardService.getInwards(),
        materialInwardService.getInwardStats(),
        purchaseOrderService.getPurchaseOrders(),
        vendorService.getVendors(),
        productService.getProducts()
      ]);
      setInwards(inwList || []);
      if (statData) setStats(statData);
      setPurchaseOrders(poList || []);
      setVendors(vndList || []);
      setAvailableProducts(prodList || []);
    } catch (err) {
      console.error('Error loading material inward data:', err);
      setToast({ open: true, message: 'Failed to load inward data: ' + err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When PO is selected in wizard
  const handlePoSelect = (poId) => {
    setSelectedPoId(poId);
    const po = purchaseOrders.find((p) => p.Id === poId);
    if (po && po.Items) {
      setSelectedVendorId(po.VendorId);
      setInwardItems(
        po.Items.map((item) => {
          const prod = availableProducts.find((p) => p.Id === item.ProductId || p.ProductNumber === item.ProductId);
          const shelfDays = prod?.Days || 4;
          return {
            ProductId: item.ProductId,
            ProductName: item.ProductName,
            OrderedQty: Number(item.Quantity || 0),
            ReceivedQty: Number(item.Quantity || 0),
            Rate: Number(item.Rate || item.Cost || 0),
            Unit: item.Unit || prod?.Unit || 'PCS',
            ExpiryDate: new Date(Date.now() + 86400000 * shelfDays).toISOString().split('T')[0],
            Barcode: prod?.ProductNumber || `200100${String(Date.now()).slice(-6)}`
          };
        })
      );
    }
  };

  // Add product to items in "without_po" mode
  const handleAddDirectItem = () => {
    if (!newProdId) return;
    const prod = availableProducts.find((p) => p.Id === newProdId);
    if (!prod) return;

    // Check if already in list
    if (inwardItems.some((i) => i.ProductId === prod.Id)) {
      setToast({ open: true, message: 'Product is already added to inward list', severity: 'warning' });
      return;
    }

    const shelfDays = prod.Days || 7;
    const newItem = {
      ProductId: prod.Id,
      ProductName: prod.Name,
      OrderedQty: Number(newProdQty),
      ReceivedQty: Number(newProdQty),
      Rate: Number(prod.Cost || 0),
      Unit: prod.Unit || 'PCS',
      ExpiryDate: new Date(Date.now() + 86400000 * shelfDays).toISOString().split('T')[0],
      Barcode: prod.ProductNumber || `200100${String(Date.now()).slice(-6)}`
    };

    setInwardItems([...inwardItems, newItem]);
    setNewProdId('');
    setNewProdQty(10);
  };

  // Remove direct item
  const handleRemoveItem = (index) => {
    setInwardItems(inwardItems.filter((_, idx) => idx !== index));
  };

  // Wizard Navigation
  const handleNext = async () => {
    if (activeStep === 0) {
      if (mode === 'with_po' && !selectedPoId) {
        setToast({ open: true, message: 'Please select a Purchase Order', severity: 'warning' });
        return;
      }
      if (mode === 'without_po' && !selectedVendorId) {
        setToast({ open: true, message: 'Please select a Supplier / Vendor', severity: 'warning' });
        return;
      }
      if (inwardItems.length === 0) {
        setToast({ open: true, message: 'Please add at least one product to receive', severity: 'warning' });
        return;
      }
      setActiveStep(1);
    } else if (activeStep === 1) {
      // Validate quantities
      if (inwardItems.some((i) => i.ReceivedQty <= 0)) {
        setToast({ open: true, message: 'Received quantity must be greater than 0 for all items', severity: 'warning' });
        return;
      }

      // Create Inward Record and generate barcodes in PostgreSQL
      try {
        const vendor = vendors.find((v) => v.Id === selectedVendorId);
        const result = await materialInwardService.createInward({
          PurchaseOrderId: mode === 'with_po' ? selectedPoId : null,
          VendorId: selectedVendorId || 'vnd_01',
          VendorName: vendor ? vendor.Name : 'Supplier',
          IsPoAvailable: mode === 'with_po',
          Items: inwardItems
        });
        setGeneratedInward(result);
        setActiveStep(2);
        setToast({ open: true, message: 'Inward saved and stock updated in PostgreSQL!', severity: 'success' });
        loadData();
      } catch (err) {
        setToast({ open: true, message: 'Inward creation failed: ' + err.message, severity: 'error' });
      }
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedPoId('');
    setSelectedVendorId('');
    setInwardItems([]);
    setGeneratedInward(null);
  };

  // Filter history
  const filteredInwards = useMemo(() => {
    if (!search.trim()) return inwards;
    const q = search.toLowerCase();
    return inwards.filter((inw) =>
      (inw.Id && inw.Id.toLowerCase().includes(q)) ||
      (inw.VendorName && inw.VendorName.toLowerCase().includes(q)) ||
      (inw.PurchaseOrderId && inw.PurchaseOrderId.toLowerCase().includes(q))
    );
  }, [inwards, search]);

  // Export CSV of Inwards
  const handleExportCSV = () => {
    if (!inwards.length) {
      setToast({ open: true, message: 'No inward records to export', severity: 'warning' });
      return;
    }

    const headers = ['Inward Docket ID', 'Date & Time', 'Vendor Name', 'Reference PO', 'Total Items', 'Total Value (INR)'];
    const rows = inwards.map((inw) => {
      const items = Array.isArray(inw.Items) ? inw.Items : [];
      const totalVal = items.reduce((sum, itm) => sum + (Number(itm.Rate || 0) * Number(itm.ReceivedQty || 0)), 0);
      return [
        `"${inw.Id || ''}"`,
        `"${inw.Date ? new Date(inw.Date).toLocaleString('en-IN') : ''}"`,
        `"${(inw.VendorName || 'Supplier').replace(/"/g, '""')}"`,
        `"${inw.PurchaseOrderId || 'Direct Inward'}"`,
        items.length,
        totalVal.toFixed(2)
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Material_Inward_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({ open: true, message: 'Inward register exported to CSV!', severity: 'success' });
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header & Main Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <InwardIcon sx={{ fontSize: 32, color: '#10B981' }} />
            Material Inward & GRN Registry
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Receive vendor consignments, reconcile POs, track batch shelf-life expiry, and print thermal barcode stickers.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportCSV}
            sx={{
              borderColor: '#CBD5E1',
              color: '#334155',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Export Register
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setCurrentTab(0);
              handleReset();
            }}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              bgcolor: '#10B981',
              '&:hover': { bgcolor: '#059669' }
            }}
          >
            Receive Inward
          </Button>
        </Box>
      </Box>

      {/* KPI Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', height: '100%' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Inward Dockets
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
                    {stats.TotalInwards || inwards.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#10B981', display: 'flex', alignItems: 'center', mt: 0.5, fontWeight: 600 }}>
                    <SuccessIcon sx={{ fontSize: 14, mr: 0.5 }} /> Live PostgreSQL Records
                  </Typography>
                </Box>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: '#ECFDF5', color: '#10B981' }}>
                  <InwardIcon sx={{ fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', height: '100%' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Today's Receipts
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#3B82F6', mt: 0.5 }}>
                    {stats.TodayInwards || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                    Active Dock Deliveries
                  </Typography>
                </Box>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: '#EFF6FF', color: '#3B82F6' }}>
                  <CalendarIcon sx={{ fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', height: '100%' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Active Suppliers
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#8B5CF6', mt: 0.5 }}>
                    {stats.ActiveVendors || vendors.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                    Supplying Warehouses
                  </Typography>
                </Box>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: '#F5F3FF', color: '#8B5CF6' }}>
                  <VendorIcon sx={{ fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', height: '100%' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    POs Fulfilled
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
                    {stats.PoInwards || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                    Reconciled Purchase Orders
                  </Typography>
                </Box>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: '#FEF3C7', color: '#D97706' }}>
                  <PoIcon sx={{ fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2.5, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <Tabs
          value={currentTab}
          onChange={(_, val) => setCurrentTab(val)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="New Material Inward (GRN)" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab label="Inward Dockets History" sx={{ fontWeight: 700, textTransform: 'none' }} />
        </Tabs>

        {/* TAB 1: Inward Dockets History */}
        {currentTab === 1 && (
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ mb: 2.5, display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search by Inward Docket ID, PO Number, or Vendor Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: { xs: '100%', sm: 380 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94A3B8' }} />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch('')}>
                        <ClearIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
              />
            </Box>

            <TableContainer sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Docket ID</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Received Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Supplier / Vendor</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Mode & Reference</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Items Count</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Consignment Value</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={32} sx={{ color: '#10B981' }} />
                        <Typography variant="body2" sx={{ mt: 1, color: '#64748B' }}>
                          Loading material inwards from database...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredInwards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                        <InwardIcon sx={{ fontSize: 48, mb: 1, color: '#CBD5E1' }} />
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#64748B' }}>
                          No Material Inwards Found
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                          Receive your first consignment using the "New Material Inward" tab.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInwards.map((inw) => {
                      const items = Array.isArray(inw.Items) ? inw.Items : [];
                      const totalQty = items.reduce((sum, itm) => sum + (Number(itm.ReceivedQty || 0)), 0);
                      const totalVal = items.reduce((sum, itm) => sum + (Number(itm.Rate || 0) * Number(itm.ReceivedQty || 0)), 0);

                      return (
                        <TableRow key={inw.Id} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                            {inw.Id}
                          </TableCell>
                          <TableCell sx={{ color: '#334155' }}>
                            {inw.Date ? new Date(inw.Date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#0F172A' }}>
                            {inw.VendorName || 'Supplier'}
                          </TableCell>
                          <TableCell>
                            {inw.PurchaseOrderId ? (
                              <Chip
                                label={`PO: ${inw.PurchaseOrderId}`}
                                size="small"
                                sx={{ bgcolor: '#EFF6FF', color: '#2563EB', fontWeight: 600, borderRadius: 1 }}
                              />
                            ) : (
                              <Chip
                                label="Direct Inward"
                                size="small"
                                sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 600, borderRadius: 1 }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>
                              {items.length} SKUs
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>
                              ({totalQty} units)
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: '#0F172A' }}>
                            ₹{totalVal.toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                              <Tooltip title="View Docket Items & Barcodes">
                                <IconButton
                                  size="small"
                                  onClick={() => setViewDocket(inw)}
                                  sx={{ color: '#3B82F6', '&:hover': { bgcolor: '#EFF6FF' } }}
                                >
                                  <ViewIcon sx={{ fontSize: 19 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Print All Barcode Stickers">
                                <IconButton
                                  size="small"
                                  onClick={() => printBarcodeLabels(items)}
                                  sx={{ color: '#10B981', '&:hover': { bgcolor: '#ECFDF5' } }}
                                >
                                  <PrintIcon sx={{ fontSize: 19 }} />
                                </IconButton>
                              </Tooltip>
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
        )}

        {/* TAB 0: New Inward Wizard */}
        {currentTab === 0 && (
          <Box sx={{ p: 3.5 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* STEP 1: PO & Mode Selection */}
            {activeStep === 0 && (
              <Box sx={{ maxWidth: 680, mx: 'auto', py: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
                  Step 1: Select Inward Receipt Mode
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>
                  Specify whether stock is being received against an approved Purchase Order or directly from a supplier.
                </Typography>

                <FormControl fullWidth margin="normal">
                  <InputLabel>Inward Mode *</InputLabel>
                  <Select value={mode} label="Inward Mode *" onChange={(e) => {
                    setMode(e.target.value);
                    if (e.target.value === 'without_po') {
                      setSelectedPoId('');
                      setInwardItems([]);
                    }
                  }}>
                    <MenuItem value="with_po">Against an Existing Purchase Order (Recommended)</MenuItem>
                    <MenuItem value="without_po">Direct Consignment Inward (Without PO)</MenuItem>
                  </Select>
                </FormControl>

                {mode === 'with_po' ? (
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Select Purchase Order *</InputLabel>
                    <Select
                      value={selectedPoId}
                      label="Select Purchase Order *"
                      onChange={(e) => handlePoSelect(e.target.value)}
                    >
                      {purchaseOrders.map((po) => (
                        <MenuItem key={po.Id} value={po.Id}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span><strong>{po.DocumentNumber}</strong> &mdash; {po.VendorName}</span>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Chip label={po.Status || 'Sent'} size="small" sx={{ fontSize: 11, height: 20 }} />
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>₹{Number(po.TotalAmount || 0).toFixed(2)}</Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Box>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Select Supplier / Vendor *</InputLabel>
                      <Select
                        value={selectedVendorId}
                        label="Select Supplier / Vendor *"
                        onChange={(e) => setSelectedVendorId(e.target.value)}
                      >
                        {vendors.map((vnd) => (
                          <MenuItem key={vnd.Id} value={vnd.Id}>
                            {vnd.Name} {vnd.City ? `(${vnd.City})` : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Direct Product Picker */}
                    <Box sx={{ mt: 3, p: 2.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#0F172A' }}>
                        Add Consignment Products
                      </Typography>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={7}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Select Product</InputLabel>
                            <Select
                              value={newProdId}
                              label="Select Product"
                              onChange={(e) => setNewProdId(e.target.value)}
                            >
                              {availableProducts.map((p) => (
                                <MenuItem key={p.Id} value={p.Id}>
                                  {p.Name} &mdash; ₹{Number(p.Cost).toFixed(2)} / {p.Unit}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Qty"
                            value={newProdQty}
                            onChange={(e) => setNewProdQty(parseFloat(e.target.value) || 1)}
                          />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={handleAddDirectItem}
                            disabled={!newProdId}
                            sx={{ height: 40, borderRadius: 1.5 }}
                          >
                            Add
                          </Button>
                        </Grid>
                      </Grid>

                      {inwardItems.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 1 }}>
                            Products to Inward ({inwardItems.length})
                          </Typography>
                          {inwardItems.map((item, idx) => (
                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.8, px: 1.5, bgcolor: '#FFF', borderRadius: 1, mb: 1, border: '1px solid #E2E8F0' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.ProductName}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.ReceivedQty} {item.Unit}</Typography>
                                <Typography variant="body2" sx={{ color: '#64748B' }}>@ ₹{item.Rate}</Typography>
                                <IconButton size="small" onClick={() => handleRemoveItem(idx)} sx={{ color: '#EF4444' }}>
                                  <DeleteIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNext}
                    sx={{ px: 3, py: 1, fontWeight: 700, borderRadius: 2 }}
                  >
                    Continue to Verify Items &rarr;
                  </Button>
                </Box>
              </Box>
            )}

            {/* STEP 2: Items Table & Expiry */}
            {activeStep === 1 && (
              <Box sx={{ maxWidth: 960, mx: 'auto' }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
                  Step 2: Verify Received Quantities & Batch Expiry Dates
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>
                  Count physical cartons, record actual delivered quantities, and assign shelf-life batch expiry dates.
                </Typography>

                <TableContainer component={Paper} sx={{ mb: 3, borderRadius: 2.5, border: '1px solid #E2E8F0' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Product Name</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Ordered Qty</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Received Qty *</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Cost Rate (₹)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Total (₹)</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Batch Expiry Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inwardItems.map((item, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 700, color: '#0F172A' }}>
                            {item.ProductName}
                            <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                              UoM: {item.Unit || 'PCS'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ color: '#64748B' }}>
                            {item.OrderedQty || item.ReceivedQty} {item.Unit || 'PCS'}
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              size="small"
                              type="number"
                              inputProps={{ step: 'any', min: '0.01' }}
                              value={item.ReceivedQty}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const updated = [...inwardItems];
                                updated[idx].ReceivedQty = val;
                                setInwardItems(updated);
                              }}
                              sx={{ width: 110 }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            ₹{Number(item.Rate || 0).toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: '#0F172A' }}>
                            ₹{(Number(item.Rate || 0) * Number(item.ReceivedQty || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="date"
                              value={item.ExpiryDate}
                              onChange={(e) => {
                                const updated = [...inwardItems];
                                updated[idx].ExpiryDate = e.target.value;
                                setInwardItems(updated);
                              }}
                              sx={{ width: 160 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button variant="outlined" onClick={() => setActiveStep(0)} sx={{ borderRadius: 2 }}>
                    &larr; Back
                  </Button>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Total Consignment: ₹{inwardItems.reduce((acc, itm) => acc + (Number(itm.Rate || 0) * Number(itm.ReceivedQty || 0)), 0).toFixed(2)}
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleNext}
                      sx={{
                        px: 3,
                        py: 1,
                        fontWeight: 700,
                        borderRadius: 2,
                        bgcolor: '#10B981',
                        '&:hover': { bgcolor: '#059669' }
                      }}
                    >
                      Confirm & Inward Stock &rarr;
                    </Button>
                  </Box>
                </Box>
              </Box>
            )}

            {/* STEP 3: Printable Barcode Labels */}
            {activeStep === 2 && generatedInward && (
              <Box sx={{ maxWidth: 960, mx: 'auto' }}>
                <Box sx={{ p: 3, bgcolor: '#ECFDF5', borderRadius: 2.5, border: '1px solid #A7F3D0', mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <SuccessIcon sx={{ color: '#059669', fontSize: 40 }} />
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#065F46' }}>
                          Inward Docket Created Successfully!
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#047857' }}>
                          Docket ID: <strong>{generatedInward.Id}</strong> &mdash; Inventory stock automatically incremented in PostgreSQL.
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PrintIcon />}
                      onClick={() => printBarcodeLabels(generatedInward.Items)}
                      sx={{
                        bgcolor: '#059669',
                        '&:hover': { bgcolor: '#047857' },
                        fontWeight: 700,
                        px: 3,
                        borderRadius: 2
                      }}
                    >
                      Print 80mm Labels
                    </Button>
                  </Box>
                </Box>

                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
                  Generated Batch Barcode Stickers ({generatedInward.Items?.length || 0} SKUs)
                </Typography>

                {/* Barcode Labels Preview Grid */}
                <Grid container spacing={2.5}>
                  {(generatedInward.Items || []).map((item, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={idx}>
                      <Card sx={{
                        p: 2,
                        border: '2px dashed #94A3B8',
                        borderRadius: 2.5,
                        textAlign: 'center',
                        bgcolor: '#FFFFFF',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                      }}>
                        <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: 1.5, color: '#0F172A', display: 'block' }}>
                          POS SUPERMARKET
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                          {item.ProductName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1 }}>
                          Received: {item.ReceivedQty} {item.Unit || 'PCS'}
                        </Typography>

                        {/* QR Code Scannable */}
                        <Box sx={{ my: 1, display: 'flex', justifyContent: 'center' }}>
                          <QRCodeSVG
                            value={item.Barcode || item.ProductId}
                            size={100}
                            level="M"
                            includeMargin
                          />
                        </Box>

                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: 2, color: '#0F172A' }}>
                          {item.Barcode}
                        </Typography>

                        <Divider sx={{ my: 1 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', fontWeight: 600 }}>
                          <span>Exp: {item.ExpiryDate}</span>
                          <span>MRP: ₹{(Number(item.Rate || 0) * 1.3).toFixed(2)}</span>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setCurrentTab(1);
                      handleReset();
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    View in Dockets Registry
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleReset}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    Process Another Inward
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* View Inward Docket Dialog */}
      <Dialog
        open={Boolean(viewDocket)}
        onClose={() => setViewDocket(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
              Material Inward Docket: {viewDocket?.Id}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Supplier: <strong>{viewDocket?.VendorName || 'Supplier'}</strong> &bull; Date: {viewDocket?.Date ? new Date(viewDocket.Date).toLocaleString('en-IN') : ''}
            </Typography>
          </Box>
          <IconButton onClick={() => setViewDocket(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {viewDocket && (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
                <Chip
                  label={viewDocket.PurchaseOrderId ? `Against PO: ${viewDocket.PurchaseOrderId}` : 'Direct Inward'}
                  size="small"
                  sx={{ bgcolor: viewDocket.PurchaseOrderId ? '#EFF6FF' : '#F1F5F9', color: viewDocket.PurchaseOrderId ? '#2563EB' : '#475569', fontWeight: 700 }}
                />
                <Chip
                  label={`Total Items: ${(viewDocket.Items || []).length} SKUs`}
                  size="small"
                  sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 700 }}
                />
              </Box>

              <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Barcode / SKU</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Product Name</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Received Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Rate (₹)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Amount (₹)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Batch Expiry</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(viewDocket.Items || []).map((itm, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {itm.Barcode || itm.ProductId}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{itm.ProductName}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>{itm.ReceivedQty} {itm.Unit || 'PCS'}</TableCell>
                        <TableCell align="right">₹{Number(itm.Rate || 0).toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>₹{(Number(itm.Rate || 0) * Number(itm.ReceivedQty || 0)).toFixed(2)}</TableCell>
                        <TableCell sx={{ color: '#D97706', fontWeight: 600 }}>{itm.ExpiryDate || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDocket(null)} sx={{ color: '#64748B' }}>
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={() => {
              if (viewDocket) printBarcodeLabels(viewDocket.Items);
            }}
            sx={{ fontWeight: 700, px: 3, borderRadius: 2 }}
          >
            Print All Labels
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Alert */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ borderRadius: 2 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
