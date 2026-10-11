import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  IconButton,
  Drawer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  Inventory2 as ProductIcon,
  QrCode2 as QrCodeIcon,
  Print as PrintIcon,
  FileDownload as ExportIcon,
  WarningAmber as WarningIcon,
  CheckCircleOutline as SuccessIcon,
  Close as CloseIcon,
  Clear as ClearIcon,
  TrendingUp as TrendingUpIcon,
  CurrencyRupee as RupeeIcon
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { QRCodeSVG } from 'qrcode.react';
import productService from '../../../_api/productService';
import { UNITS, getUnitMeta, formatRatePerUnit, formatQtyWithUnit } from '../../../utils/uomHelper';

const validationSchema = Yup.object({
  Name: Yup.string().required('Product name is required'),
  Cost: Yup.number().positive('Cost price must be greater than 0').required('Cost price is required'),
  Unit: Yup.string().required('Unit of measure is required'),
  CategoryId: Yup.string().required('Category is required'),
  TaxPercent: Yup.number().min(0, 'Tax cannot be negative').required('Tax rate is required'),
  StockQuantity: Yup.number().min(0, 'Stock cannot be negative').required('Stock quantity is required'),
  IsExpDate: Yup.boolean(),
  Days: Yup.number().when('IsExpDate', {
    is: true,
    then: (schema) => schema.min(1, 'Shelf life must be at least 1 day').required('Shelf life required'),
    otherwise: (schema) => schema.nullable()
  })
});

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    TotalProducts: 0,
    LowStockCount: 0,
    PerishableCount: 0,
    TotalStockUnits: 0,
    TotalValuation: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('cat_all');
  
  // Drawer state (Add / Edit)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Barcode / Thermal label dialog state
  const [labelProduct, setLabelProduct] = useState(null);

  // Soft delete confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, product: null });

  // Toast notification
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  // Load live data from PostgreSQL API
  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, prodList, statData] = await Promise.all([
        productService.getCategories(),
        productService.getProducts({ categoryId: selectedCat, searchTerm: search }),
        productService.getProductStats()
      ]);
      setCategories(cats || []);
      setProducts(prodList || []);
      if (statData) setStats(statData);
    } catch (err) {
      console.error('Error fetching product catalog data:', err);
      setToast({ open: true, message: 'Failed to load products: ' + err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCat, search]);

  // Formik for Add/Edit
  const formik = useFormik({
    initialValues: {
      ProductNumber: '',
      Name: '',
      Cost: '',
      Unit: 'PCS',
      CategoryId: 'cat_dairy',
      TaxPercent: 5,
      Ingredients: '',
      Notes: '',
      IsExpDate: false,
      Days: 3,
      StockQuantity: 50
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { resetForm }) => {
      try {
        if (editingProduct) {
          await productService.updateProduct(editingProduct.Id, {
            ...values,
            Cost: parseFloat(values.Cost),
            TaxPercent: parseFloat(values.TaxPercent),
            StockQuantity: parseFloat(values.StockQuantity),
            Days: values.IsExpDate ? parseInt(values.Days, 10) : null
          });
          setToast({ open: true, message: `Product "${values.Name}" updated successfully!`, severity: 'success' });
        } else {
          await productService.createProduct({
            ...values,
            Cost: parseFloat(values.Cost),
            TaxPercent: parseFloat(values.TaxPercent),
            StockQuantity: parseFloat(values.StockQuantity),
            Days: values.IsExpDate ? parseInt(values.Days, 10) : null
          });
          setToast({ open: true, message: `Product "${values.Name}" added to catalog!`, severity: 'success' });
        }
        resetForm();
        setEditingProduct(null);
        setDrawerOpen(false);
        loadData();
      } catch (err) {
        setToast({ open: true, message: err.message || 'Operation failed', severity: 'error' });
      }
    }
  });

  // Open Drawer in Add Mode
  const handleOpenAdd = () => {
    setEditingProduct(null);
    formik.resetForm({
      values: {
        ProductNumber: '',
        Name: '',
        Cost: '',
        Unit: 'PCS',
        CategoryId: categories.find(c => c.Id !== 'cat_all')?.Id || 'cat_dairy',
        TaxPercent: 5,
        Ingredients: '',
        Notes: '',
        IsExpDate: false,
        Days: 3,
        StockQuantity: 50
      }
    });
    setDrawerOpen(true);
  };

  // Open Drawer in Edit Mode
  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    formik.resetForm({
      values: {
        ProductNumber: product.ProductNumber || '',
        Name: product.Name || '',
        Cost: product.Cost !== undefined ? product.Cost : '',
        Unit: product.Unit || 'PCS',
        CategoryId: product.CategoryId || 'cat_dairy',
        TaxPercent: product.TaxPercent !== undefined ? product.TaxPercent : 5,
        Ingredients: product.Ingredients || '',
        Notes: product.Notes || '',
        IsExpDate: Boolean(product.IsExpDate),
        Days: product.Days || 3,
        StockQuantity: product.StockQuantity !== undefined ? product.StockQuantity : 0
      }
    });
    setDrawerOpen(true);
  };

  // Trigger soft delete modal
  const handleDeleteClick = (product) => {
    setDeleteConfirm({ open: true, product });
  };

  // Confirm soft delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirm.product) return;
    const { Id, Name } = deleteConfirm.product;
    try {
      await productService.softDeleteProduct(Id);
      setToast({ open: true, message: `Product "${Name}" successfully archived.`, severity: 'info' });
      setDeleteConfirm({ open: false, product: null });
      loadData();
    } catch (err) {
      setToast({ open: true, message: 'Delete failed: ' + err.message, severity: 'error' });
    }
  };

  // Export filtered products to CSV
  const handleExportCSV = () => {
    if (!products.length) {
      setToast({ open: true, message: 'No products available to export.', severity: 'warning' });
      return;
    }

    const headers = [
      'Product ID',
      'Barcode / SKU',
      'Product Name',
      'Category',
      'Unit of Measure',
      'Cost Price (INR)',
      'GST Rate (%)',
      'Stock Quantity',
      'Perishable',
      'Shelf Life Days',
      'Ingredients'
    ];

    const rows = products.map((p) => [
      `"${p.Id || ''}"`,
      `"${p.ProductNumber || ''}"`,
      `"${(p.Name || '').replace(/"/g, '""')}"`,
      `"${(p.CategoryName || p.CategoryId || '').replace(/"/g, '""')}"`,
      `"${p.Unit || 'PCS'}"`,
      p.Cost !== undefined ? p.Cost.toFixed(2) : '0.00',
      p.TaxPercent !== undefined ? p.TaxPercent : 0,
      p.StockQuantity !== undefined ? p.StockQuantity : 0,
      p.IsExpDate ? 'YES' : 'NO',
      p.IsExpDate ? (p.Days || '') : 'N/A',
      `"${(p.Ingredients || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Product_Catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({ open: true, message: 'Product catalog exported to CSV successfully!', severity: 'success' });
  };

  // Thermal label print handler
  const handlePrintLabel = () => {
    window.print();
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header & Main Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ProductIcon sx={{ fontSize: 32, color: '#3B82F6' }} />
            Product Catalog & Inventory
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Manage inventory SKUs, shelf-life expiry rules, units of measure, and GST tax classifications.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportCSV}
            sx={{
              borderColor: '#CBD5E1',
              color: '#334155',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { borderColor: '#94A3B8', bgcolor: '#F8FAFC' }
            }}
          >
            Export Catalog
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
              px: 2.5
            }}
          >
            Add Product
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
                    Active SKUs
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
                    {stats.TotalProducts || products.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#10B981', display: 'flex', alignItems: 'center', mt: 0.5, fontWeight: 600 }}>
                    <SuccessIcon sx={{ fontSize: 14, mr: 0.5 }} /> Live PostgreSQL Database
                  </Typography>
                </Box>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: '#EFF6FF', color: '#3B82F6' }}>
                  <ProductIcon sx={{ fontSize: 24 }} />
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
                    Low Stock Alerts
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: (stats.LowStockCount || 0) > 0 ? '#EF4444' : '#10B981', mt: 0.5 }}>
                    {stats.LowStockCount || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                    Threshold &le; 15 units
                  </Typography>
                </Box>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: (stats.LowStockCount || 0) > 0 ? '#FEF2F2' : '#F0FDF4', color: (stats.LowStockCount || 0) > 0 ? '#EF4444' : '#10B981' }}>
                  <WarningIcon sx={{ fontSize: 24 }} />
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
                    Perishable SKUs
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#D97706', mt: 0.5 }}>
                    {stats.PerishableCount || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                    FEFO Batch Expiry Tracked
                  </Typography>
                </Box>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: '#FFFBEB', color: '#D97706' }}>
                  <TrendingUpIcon sx={{ fontSize: 24 }} />
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
                    Stock Asset Value
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
                    ₹{Number(stats.TotalValuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                    {Number(stats.TotalStockUnits || 0).toLocaleString()} Total Units in Store
                  </Typography>
                </Box>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: '#F0FDF4', color: '#16A34A' }}>
                  <RupeeIcon sx={{ fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Row */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', borderRadius: 2.5, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <TextField
          size="small"
          placeholder="Search by product name, barcode, ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 320, md: 360 } }}
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

        <Box sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          flex: 1,
          minWidth: 0,
          pb: 0.5,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' }
        }}>
          {categories.map((cat) => (
            <Chip
              key={cat.Id}
              label={cat.Name}
              clickable
              color={selectedCat === cat.Id ? 'primary' : 'default'}
              onClick={() => setSelectedCat(cat.Id)}
              sx={{
                flexShrink: 0,
                fontWeight: selectedCat === cat.Id ? 700 : 500,
                borderRadius: 2,
                px: 1,
                bgcolor: selectedCat === cat.Id ? '#3B82F6' : '#F1F5F9',
                color: selectedCat === cat.Id ? '#FFF' : '#475569',
                '&:hover': {
                  bgcolor: selectedCat === cat.Id ? '#2563EB' : '#E2E8F0'
                }
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* Product Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2.5, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Barcode / SKU</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Product Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Category</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Unit (UoM)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Cost Price</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>GST Slab</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Shelf Life</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Stock Level</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={36} sx={{ color: '#3B82F6' }} />
                  <Typography variant="body2" sx={{ mt: 1.5, color: '#64748B' }}>
                    Loading catalog from database...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8, color: '#94A3B8' }}>
                  <ProductIcon sx={{ fontSize: 54, mb: 1.5, color: '#CBD5E1' }} />
                  <Typography variant="h6" sx={{ color: '#64748B', fontWeight: 600 }}>
                    No products found
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5 }}>
                    Try searching with another keyword or select a different category.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              products.map((prod) => {
                const uom = getUnitMeta(prod.Unit);
                const isLowStock = (prod.StockQuantity || 0) <= 15;
                const isOutOfStock = (prod.StockQuantity || 0) <= 0;

                return (
                  <TableRow key={prod.Id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#334155', letterSpacing: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, bgcolor: '#F1F5F9', px: 1, py: 0.3, borderRadius: 1 }}>
                          {prod.ProductNumber}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>
                        {prod.Name}
                      </Typography>
                      {prod.Ingredients && (
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', maxWidth: 280, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {prod.Ingredients}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={prod.CategoryName || (prod.CategoryId ? prod.CategoryId.replace('cat_', '') : 'General')}
                        size="small"
                        sx={{
                          textTransform: 'capitalize',
                          fontWeight: 600,
                          bgcolor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          color: '#475569'
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={prod.Unit || 'PCS'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: 11,
                          bgcolor: ['KG', 'GM'].includes(prod.Unit) ? '#EBFBEE' : (['LTR', 'ML'].includes(prod.Unit) ? '#E0F2FE' : '#F1F5F9'),
                          color: ['KG', 'GM'].includes(prod.Unit) ? '#2B8A3E' : (['LTR', 'ML'].includes(prod.Unit) ? '#0284C7' : '#475569')
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>
                        ₹{Number(prod.Cost || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        / {uom.short}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={`CGST: ${(prod.TaxPercent / 2).toFixed(1)}% | SGST: ${(prod.TaxPercent / 2).toFixed(1)}%`}>
                        <Chip
                          label={`GST ${prod.TaxPercent}%`}
                          size="small"
                          sx={{
                            bgcolor: prod.TaxPercent === 0 ? '#F1F5F9' : '#EEF2FF',
                            color: prod.TaxPercent === 0 ? '#64748B' : '#3B5BDB',
                            fontWeight: 700,
                            fontSize: 11
                          }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {prod.IsExpDate ? (
                        <Chip
                          label={`${prod.Days} Days`}
                          size="small"
                          sx={{
                            bgcolor: prod.Days <= 3 ? '#FEF2F2' : '#FFFBEB',
                            color: prod.Days <= 3 ? '#DC2626' : '#D97706',
                            fontWeight: 700,
                            fontSize: 11
                          }}
                        />
                      ) : (
                        <Chip label="Non-perishable" size="small" sx={{ bgcolor: '#F8FAFC', color: '#64748B', fontSize: 11 }} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{
                        fontWeight: 800,
                        color: isOutOfStock ? '#DC2626' : (isLowStock ? '#D97706' : '#16A34A')
                      }}>
                        {formatQtyWithUnit(prod.StockQuantity, prod.Unit)}
                      </Typography>
                      {isLowStock && (
                        <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 600, display: 'block' }}>
                          Low Stock
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Print Barcode / QR Label">
                          <IconButton
                            size="small"
                            onClick={() => setLabelProduct(prod)}
                            sx={{ color: '#3B82F6', '&:hover': { bgcolor: '#EFF6FF' } }}
                          >
                            <QrCodeIcon sx={{ fontSize: 19 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Product">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(prod)}
                            sx={{ color: '#64748B', '&:hover': { bgcolor: '#F1F5F9', color: '#0F172A' } }}
                          >
                            <EditIcon sx={{ fontSize: 19 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Soft Delete / Archive">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(prod)}
                            sx={{ color: '#EF4444', '&:hover': { bgcolor: '#FEF2F2' } }}
                          >
                            <DeleteIcon sx={{ fontSize: 19 }} />
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

      {/* Add / Edit Product Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingProduct(null); }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, p: 3.5 } }}
      >
        <Box component="form" onSubmit={formik.handleSubmit} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                {editingProduct
                  ? `Update SKU details for ${editingProduct.ProductNumber}`
                  : 'Configure SKU details, pricing, tax rate, and shelf life.'}
              </Typography>
            </Box>
            <IconButton onClick={() => { setDrawerOpen(false); setEditingProduct(null); }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2.5 }} />

          <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
            <TextField
              fullWidth
              name="Name"
              label="Product Title *"
              placeholder="e.g., Cold Coffee 200ml Bottle"
              margin="dense"
              value={formik.values.Name}
              onChange={formik.handleChange}
              error={formik.touched.Name && Boolean(formik.errors.Name)}
              helperText={formik.touched.Name && formik.errors.Name}
              sx={{ mb: 1.5 }}
            />

            <TextField
              fullWidth
              name="ProductNumber"
              label="Barcode / SKU Number"
              placeholder={editingProduct ? '' : 'Auto-generated if left blank'}
              margin="dense"
              value={formik.values.ProductNumber}
              onChange={formik.handleChange}
              helperText="Scannable EAN/UPC barcode number"
              sx={{ mb: 1.5 }}
            />

            <FormControl fullWidth margin="dense" sx={{ mb: 1.5 }}>
              <InputLabel>Category *</InputLabel>
              <Select
                name="CategoryId"
                value={formik.values.CategoryId}
                label="Category *"
                onChange={formik.handleChange}
              >
                {categories
                  .filter((c) => c.Id !== 'cat_all')
                  .map((cat) => (
                    <MenuItem key={cat.Id} value={cat.Id}>
                      {cat.Name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* Unit of Measure (UoM) Select */}
            <FormControl fullWidth margin="dense" sx={{ mb: 1.5 }}>
              <InputLabel>Unit of Measure (UoM) *</InputLabel>
              <Select
                name="Unit"
                value={formik.values.Unit}
                label="Unit of Measure (UoM) *"
                onChange={formik.handleChange}
              >
                {UNITS.map((u) => (
                  <MenuItem key={u.code} value={u.code}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span>{u.label}</span>
                      <Chip
                        label={u.type.toUpperCase()}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: 9,
                          ml: 1,
                          bgcolor: u.type === 'weight' ? '#EBFBEE' : (u.type === 'volume' ? '#E0F2FE' : '#F1F5F9'),
                          color: u.type === 'weight' ? '#2B8A3E' : (u.type === 'volume' ? '#0284C7' : '#475569')
                        }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  name="Cost"
                  label={`Cost (₹ per ${getUnitMeta(formik.values.Unit).short}) *`}
                  type="number"
                  margin="dense"
                  value={formik.values.Cost}
                  onChange={formik.handleChange}
                  error={formik.touched.Cost && Boolean(formik.errors.Cost)}
                  helperText={formik.touched.Cost && formik.errors.Cost}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  name="StockQuantity"
                  label={`Stock (${getUnitMeta(formik.values.Unit).short}) *`}
                  type="number"
                  inputProps={{ step: getUnitMeta(formik.values.Unit).allowDecimal ? "0.01" : "1" }}
                  margin="dense"
                  value={formik.values.StockQuantity}
                  onChange={formik.handleChange}
                  error={formik.touched.StockQuantity && Boolean(formik.errors.StockQuantity)}
                  helperText={formik.touched.StockQuantity && formik.errors.StockQuantity}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth margin="dense" sx={{ mb: 1.5 }}>
              <InputLabel>GST Tax Slab *</InputLabel>
              <Select
                name="TaxPercent"
                value={formik.values.TaxPercent}
                label="GST Tax Slab *"
                onChange={formik.handleChange}
              >
                <MenuItem value={0}>GST 0% (Tax Exempt / Nil)</MenuItem>
                <MenuItem value={5}>GST 5% (CGST 2.5% + SGST 2.5%)</MenuItem>
                <MenuItem value={12}>GST 12% (CGST 6.0% + SGST 6.0%)</MenuItem>
                <MenuItem value={18}>GST 18% (CGST 9.0% + SGST 9.0%)</MenuItem>
                <MenuItem value={28}>GST 28% (CGST 14.0% + SGST 14.0%)</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    name="IsExpDate"
                    checked={formik.values.IsExpDate}
                    onChange={formik.handleChange}
                    color="primary"
                  />
                }
                label={<Typography sx={{ fontWeight: 600, fontSize: 13 }}>Tracks Shelf-Life Expiry Date</Typography>}
              />

              {formik.values.IsExpDate && (
                <TextField
                  fullWidth
                  name="Days"
                  label="Shelf Life (in Days) *"
                  type="number"
                  size="small"
                  sx={{ mt: 1.5 }}
                  value={formik.values.Days}
                  onChange={formik.handleChange}
                  error={formik.touched.Days && Boolean(formik.errors.Days)}
                  helperText={formik.touched.Days && formik.errors.Days}
                />
              )}
            </Box>

            <TextField
              fullWidth
              name="Ingredients"
              label="Ingredients / Composition"
              placeholder="e.g., Roasted coffee beans, pasteurized milk, organic cane sugar"
              multiline
              rows={2}
              margin="dense"
              value={formik.values.Ingredients}
              onChange={formik.handleChange}
              sx={{ mb: 1.5 }}
            />

            <TextField
              fullWidth
              name="Notes"
              label="Storage Instructions & Notes"
              placeholder="e.g., Keep refrigerated below 4°C. Shake well before use."
              multiline
              rows={2}
              margin="dense"
              value={formik.values.Notes}
              onChange={formik.handleChange}
            />
          </Box>

          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => { setDrawerOpen(false); setEditingProduct(null); }}
              sx={{ borderRadius: 2, py: 1 }}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              color="primary"
              sx={{ borderRadius: 2, py: 1, fontWeight: 700 }}
            >
              {editingProduct ? 'Update Product' : 'Save Product'}
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Thermal Barcode / QR Label Preview Dialog */}
      <Dialog
        open={Boolean(labelProduct)}
        onClose={() => setLabelProduct(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Thermal Barcode Label</span>
          <IconButton onClick={() => setLabelProduct(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {labelProduct && (
            <Box sx={{
              p: 2.5,
              border: '2px dashed #94A3B8',
              borderRadius: 2,
              bgcolor: '#FFFFFF',
              textAlign: 'center',
              width: '100%',
              maxWidth: 320,
              mx: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
            }}>
              <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: 1.5, color: '#0F172A', display: 'block' }}>
                POS SUPERMARKET
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5, lineHeight: 1.2 }}>
                {labelProduct.Name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1.5 }}>
                Net Qty: 1 {getUnitMeta(labelProduct.Unit).short} | Category: {labelProduct.CategoryName || 'General'}
              </Typography>

              {/* QR Code Scannable by Camera or Barcode Scanner */}
              <Box sx={{ my: 1.5, display: 'flex', justifyContent: 'center' }}>
                <QRCodeSVG
                  value={labelProduct.ProductNumber || labelProduct.Id}
                  size={120}
                  level="M"
                  includeMargin
                />
              </Box>

              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: 2, color: '#0F172A' }}>
                {labelProduct.ProductNumber}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                    MRP (Incl. GST {labelProduct.TaxPercent}%)
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                    ₹{Number(labelProduct.Cost || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                    Packed: {new Date().toLocaleDateString('en-IN')}
                  </Typography>
                  {labelProduct.IsExpDate ? (
                    <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 700, display: 'block' }}>
                      Best Before: {new Date(Date.now() + (labelProduct.Days || 3) * 86400000).toLocaleDateString('en-IN')}
                    </Typography>
                  ) : (
                    <Typography variant="caption" sx={{ color: '#16A34A', fontWeight: 600, display: 'block' }}>
                      Non-perishable
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLabelProduct(null)} sx={{ color: '#64748B' }}>
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrintLabel}
            sx={{ fontWeight: 700, px: 3, borderRadius: 2 }}
          >
            Print 80mm Label
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, product: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: '#DC2626' }} />
          Deactivate Product
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: '#0F172A', fontWeight: 600, mb: 1 }}>
            Are you sure you want to deactivate "{deleteConfirm.product?.Name}"?
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            This will soft-delete SKU <strong>{deleteConfirm.product?.ProductNumber}</strong>. It will be removed from POS terminal lookups and active catalog tables.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteConfirm({ open: false, product: null })}
            sx={{ color: '#64748B' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Deactivate Product
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
