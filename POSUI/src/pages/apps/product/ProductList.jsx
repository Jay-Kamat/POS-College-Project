import React, { useState, useEffect } from 'react';
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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  Inventory2 as ProductIcon
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import productService from '../../../_api/productService';

const validationSchema = Yup.object({
  Name: Yup.string().required('Product name is required'),
  Cost: Yup.number().positive('Cost must be positive').required('Cost is required'),
  CategoryId: Yup.string().required('Category is required'),
  TaxPercent: Yup.number().required('Tax rate is required'),
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
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('cat_all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const loadData = async () => {
    const cats = await productService.getCategories();
    setCategories(cats);
    const list = await productService.getProducts({ categoryId: selectedCat, searchTerm: search });
    setProducts(list);
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCat]);

  const formik = useFormik({
    initialValues: {
      Name: '',
      Cost: '',
      CategoryId: 'cat_dairy',
      TaxPercent: 5,
      Ingredients: '',
      Notes: '',
      IsExpDate: false,
      Days: 3,
      StockQuantity: 50
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        await productService.createProduct(values);
        setToast({ open: true, message: `Product "${values.Name}" created successfully!`, severity: 'success' });
        resetForm();
        setDrawerOpen(false);
        loadData();
      } catch (err) {
        setToast({ open: true, message: err.message, severity: 'error' });
      }
    }
  });

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to soft-delete "${name}"?`)) {
      await productService.softDeleteProduct(id);
      setToast({ open: true, message: `Product "${name}" soft-deleted.`, severity: 'info' });
      loadData();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 700 }}>
            Product Catalog
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage SKUs, shelf-life expiry rules, and GST tax classifications.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setDrawerOpen(true)}
          sx={{ fontWeight: 600 }}
        >
          Add Product
        </Button>
      </Box>

      {/* Filter Row */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', borderRadius: 2 }}>
        <TextField
          size="small"
          placeholder="Search by product name or barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 340 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#9CA3AF' }} />
              </InputAdornment>
            )
          }}
        />

        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
          {categories.map((cat) => (
            <Chip
              key={cat.Id}
              label={cat.Name}
              clickable
              color={selectedCat === cat.Id ? 'primary' : 'default'}
              onClick={() => setSelectedCat(cat.Id)}
            />
          ))}
        </Box>
      </Paper>

      {/* Product Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Barcode / SKU</TableCell>
              <TableCell>Product Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Cost (₹)</TableCell>
              <TableCell>Tax Rate</TableCell>
              <TableCell>Shelf Life</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#9CA3AF' }}>
                  <ProductIcon sx={{ fontSize: 48, mb: 1, color: '#CBD5E1' }} />
                  <Typography variant="body2">No products found in this category.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              products.map((prod) => (
                <TableRow key={prod.Id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#4B5563' }}>
                    {prod.ProductNumber}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1F2937' }}>
                    {prod.Name}
                  </TableCell>
                  <TableCell>
                    <Chip label={prod.CategoryId.replace('cat_', '')} size="small" sx={{ textTransform: 'capitalize' }} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    ₹{prod.Cost.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Chip label={`GST ${prod.TaxPercent}%`} size="small" sx={{ bgcolor: '#EEF2FF', color: '#3B5BDB', fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    {prod.IsExpDate ? (
                      <Chip label={`${prod.Days} Days`} size="small" sx={{ bgcolor: '#FFF9DB', color: '#D9480F', fontWeight: 600 }} />
                    ) : (
                      <Chip label="Non-perishable" size="small" sx={{ bgcolor: '#F1F5F9', color: '#64748B' }} />
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: prod.StockQuantity < 10 ? '#E03131' : '#2F9E44' }}>
                    {prod.StockQuantity}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Soft Delete">
                      <IconButton size="small" onClick={() => handleDelete(prod.Id, prod.Name)} sx={{ color: '#EF4444' }}>
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Product Side Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 380, p: 3 }} component="form" onSubmit={formik.handleSubmit}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
            Add New Product
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure product pricing, tax slabs, and shelf-life tracking.
          </Typography>

          <TextField
            fullWidth
            name="Name"
            label="Product Title"
            margin="normal"
            value={formik.values.Name}
            onChange={formik.handleChange}
            error={formik.touched.Name && Boolean(formik.errors.Name)}
            helperText={formik.touched.Name && formik.errors.Name}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select
              name="CategoryId"
              value={formik.values.CategoryId}
              label="Category"
              onChange={formik.handleChange}
            >
              <MenuItem value="cat_dairy">Dairy</MenuItem>
              <MenuItem value="cat_bakery">Bakery</MenuItem>
              <MenuItem value="cat_bev">Beverages</MenuItem>
              <MenuItem value="cat_staples">Staples</MenuItem>
              <MenuItem value="cat_snacks">Snacks</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            name="Cost"
            label="Cost Price (₹)"
            type="number"
            margin="normal"
            value={formik.values.Cost}
            onChange={formik.handleChange}
            error={formik.touched.Cost && Boolean(formik.errors.Cost)}
            helperText={formik.touched.Cost && formik.errors.Cost}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>GST Tax Slab</InputLabel>
            <Select
              name="TaxPercent"
              value={formik.values.TaxPercent}
              label="GST Tax Slab"
              onChange={formik.handleChange}
            >
              <MenuItem value={0}>GST 0% (Tax Exempt)</MenuItem>
              <MenuItem value={5}>GST 5% (CGST 2.5% + SGST 2.5%)</MenuItem>
              <MenuItem value={12}>GST 12% (CGST 6% + SGST 6%)</MenuItem>
              <MenuItem value={18}>GST 18% (CGST 9% + SGST 9%)</MenuItem>
              <MenuItem value={28}>GST 28% (CGST 14% + SGST 14%)</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                name="IsExpDate"
                checked={formik.values.IsExpDate}
                onChange={formik.handleChange}
                color="primary"
              />
            }
            label="Tracks Shelf-Life Expiry Date"
            sx={{ mt: 2, display: 'block' }}
          />

          {formik.values.IsExpDate && (
            <TextField
              fullWidth
              name="Days"
              label="Shelf Life (Days)"
              type="number"
              margin="normal"
              value={formik.values.Days}
              onChange={formik.handleChange}
              error={formik.touched.Days && Boolean(formik.errors.Days)}
              helperText={formik.touched.Days && formik.errors.Days}
            />
          )}

          <TextField
            fullWidth
            name="StockQuantity"
            label="Initial Stock Quantity"
            type="number"
            margin="normal"
            value={formik.values.StockQuantity}
            onChange={formik.handleChange}
          />

          <TextField
            fullWidth
            name="Ingredients"
            label="Ingredients / Composition"
            multiline
            rows={2}
            margin="normal"
            value={formik.values.Ingredients}
            onChange={formik.handleChange}
          />

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button fullWidth variant="outlined" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth type="submit" variant="contained" color="primary">
              Save Product
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Toast Alert */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
