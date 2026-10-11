import React, { useState, useEffect } from 'react';
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Grid,
  IconButton,
  Tooltip,
  Divider,
  InputAdornment,
  TableFooter,
  Card,
  CardContent,
  Menu
} from '@mui/material';
import {
  Add as AddIcon,
  Description as PoIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LocalShipping as ShippingIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  PendingActions as PendingIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Store as StoreIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import purchaseOrderService from '../../../_api/purchaseOrderService';
import vendorService from '../../../_api/vendorService';
import productService from '../../../_api/productService';

export default function PurchaseOrderList() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stats, setStats] = useState({
    TotalOrders: 0,
    PendingOrders: 0,
    ReceivedOrders: 0,
    TotalSpend: 0
  });
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('All');

  // Modals
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activePO, setActivePO] = useState(null);

  // Action Menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedRowPO, setSelectedRowPO] = useState(null);

  // Create Form State
  const [formVendorId, setFormVendorId] = useState('');
  const [formDeliveryDate, setFormDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState([
    { productId: '', productName: '', quantity: 20, rate: 0, unit: 'pcs' }
  ]);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [poList, poStats, vList, pList] = await Promise.all([
        purchaseOrderService.getPurchaseOrders(),
        purchaseOrderService.getPurchaseOrderStats(),
        vendorService.getVendors(),
        productService.getProducts()
      ]);
      setPurchaseOrders(poList);
      setStats(poStats);
      setVendors(vList);
      setProducts(pList);
    } catch (err) {
      console.error('Error loading PO data:', err);
      setToast({ open: true, message: 'Failed to load purchase orders.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered List
  const filteredPOs = purchaseOrders.filter(po => {
    if (selectedStatus !== 'All' && po.Status.toLowerCase() !== selectedStatus.toLowerCase()) {
      return false;
    }
    if (vendorFilter !== 'All' && po.VendorId !== vendorFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const docMatch = po.DocumentNumber?.toLowerCase().includes(q);
      const vndMatch = po.VendorName?.toLowerCase().includes(q);
      if (!docMatch && !vndMatch) return false;
    }
    return true;
  });

  // Line Item Handlers
  const handleAddItem = () => {
    setFormItems(prev => [
      ...prev,
      { productId: '', productName: '', quantity: 10, rate: 0, unit: 'pcs' }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (formItems.length === 1) return;
    setFormItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    setFormItems(prev => {
      const updated = [...prev];
      if (field === 'productId') {
        const prod = products.find(p => p.Id === value);
        updated[index] = {
          ...updated[index],
          productId: value,
          productName: prod ? prod.Name : '',
          rate: prod ? (parseFloat(prod.Cost) || 0) : 0,
          unit: prod?.Unit || 'pcs'
        };
      } else if (field === 'quantity') {
        updated[index].quantity = Math.max(1, parseInt(value, 10) || 1);
      } else if (field === 'rate') {
        updated[index].rate = Math.max(0, parseFloat(value) || 0);
      }
      return updated;
    });
  };

  const calculateFormTotal = () => {
    return formItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const handleOpenCreateDialog = () => {
    if (vendors.length > 0) {
      setFormVendorId(vendors[0].Id);
    }
    const d = new Date();
    d.setDate(d.getDate() + 5);
    setFormDeliveryDate(d.toISOString().split('T')[0]);
    setFormNotes('Standard delivery instructions. Quality inspection upon receiving.');

    if (products.length > 0) {
      setFormItems([
        {
          productId: products[0].Id,
          productName: products[0].Name,
          quantity: 25,
          rate: parseFloat(products[0].Cost) || 0,
          unit: products[0].Unit || 'pcs'
        }
      ]);
    } else {
      setFormItems([{ productId: '', productName: '', quantity: 10, rate: 0, unit: 'pcs' }]);
    }
    setCreateDialogOpen(true);
  };

  const handleCreatePO = async () => {
    const selectedVendor = vendors.find(v => v.Id === formVendorId);
    if (!selectedVendor) {
      setToast({ open: true, message: 'Please select a valid supplier/vendor.', severity: 'warning' });
      return;
    }

    const invalidItems = formItems.some(it => !it.productId || it.quantity <= 0 || it.rate <= 0);
    if (invalidItems) {
      setToast({ open: true, message: 'Please complete all item lines with valid quantity and rate.', severity: 'warning' });
      return;
    }

    const totalAmount = calculateFormTotal();
    const formattedItems = formItems.map(item => ({
      ProductId: item.productId,
      ProductName: item.productName,
      Quantity: item.quantity,
      Rate: item.rate,
      Unit: item.unit,
      Total: item.quantity * item.rate,
      DeliveryDate: formDeliveryDate
    }));

    try {
      const created = await purchaseOrderService.createPurchaseOrder({
        VendorId: selectedVendor.Id,
        VendorName: selectedVendor.Name,
        StoreId: 'store_mum_01',
        Date: new Date().toISOString(),
        TotalAmount: totalAmount,
        Items: formattedItems,
        Notes: formNotes
      });

      setToast({
        open: true,
        message: `Purchase Order ${created.DocumentNumber || 'created'} issued successfully!`,
        severity: 'success'
      });
      setCreateDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Error creating PO:', err);
      setToast({ open: true, message: 'Failed to create purchase order: ' + err.message, severity: 'error' });
    }
  };

  const handleStatusUpdate = async (poId, newStatus) => {
    try {
      await purchaseOrderService.updatePurchaseOrderStatus(poId, newStatus);
      setToast({ open: true, message: `PO marked as ${newStatus}!`, severity: 'success' });
      setMenuAnchor(null);
      loadData();
    } catch (err) {
      console.error('Error updating PO status:', err);
      setToast({ open: true, message: 'Failed to update status.', severity: 'error' });
    }
  };

  const handleViewPO = (po) => {
    setActivePO(po);
    setViewDialogOpen(true);
    setMenuAnchor(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'Received':
        return (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
            label="Received"
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: '#EBFBEE',
              color: '#2F9E44',
              border: '1px solid #B2F2BB'
            }}
          />
        );
      case 'Partially Received':
        return (
          <Chip
            icon={<ShippingIcon sx={{ fontSize: 16 }} />}
            label="Partial"
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: '#F3F0FF',
              color: '#7950F2',
              border: '1px solid #D0BFFF'
            }}
          />
        );
      case 'Cancelled':
        return (
          <Chip
            icon={<CancelIcon sx={{ fontSize: 16 }} />}
            label="Cancelled"
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: '#FFF5F5',
              color: '#E03131',
              border: '1px solid #FFC9C9'
            }}
          />
        );
      case 'Sent':
      case 'Pending':
      default:
        return (
          <Chip
            icon={<PendingIcon sx={{ fontSize: 16 }} />}
            label="Sent (Open)"
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: '#FFF9DB',
              color: '#F59F00',
              border: '1px solid #FFE066'
            }}
          />
        );
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: '#4361EE',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(67, 97, 238, 0.3)'
              }}
            >
              <PoIcon />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.5px' }}>
              Purchase Orders
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Manage procurement lifecycles, issue orders to verified suppliers, and audit shipment fulfillment.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#4361EE',
              boxShadow: '0 4px 14px rgba(67, 97, 238, 0.4)',
              '&:hover': { bgcolor: '#374FC7' }
            }}
          >
            New Purchase Order
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                bgcolor: '#EEF2FF',
                color: '#4361EE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PoIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Orders
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.2 }}>
                {stats.TotalOrders}
              </Typography>
              <Typography variant="caption" sx={{ color: '#4361EE', fontWeight: 500 }}>
                Procurement logs
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                bgcolor: '#FFF9DB',
                color: '#F59F00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PendingIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Pending Delivery
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.2 }}>
                {stats.PendingOrders}
              </Typography>
              <Typography variant="caption" sx={{ color: '#F59F00', fontWeight: 500 }}>
                Awaiting supplier dispatch
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                bgcolor: '#EBFBEE',
                color: '#2F9E44',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Fulfilled / Received
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.2 }}>
                {stats.ReceivedOrders}
              </Typography>
              <Typography variant="caption" sx={{ color: '#2F9E44', fontWeight: 500 }}>
                Stock inwarded
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                bgcolor: '#F3F0FF',
                color: '#7950F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MoneyIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Procurement Volume
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.2 }}>
                ₹{Number(stats.TotalSpend).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#7950F2', fontWeight: 500 }}>
                Total PO commitment
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          border: '1px solid #E2E8F0',
          bgcolor: '#FFFFFF',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {['All', 'Sent', 'Partially Received', 'Received', 'Cancelled'].map(status => (
            <Chip
              key={status}
              label={status}
              onClick={() => setSelectedStatus(status)}
              variant={selectedStatus === status ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                cursor: 'pointer',
                bgcolor: selectedStatus === status ? '#4361EE' : 'transparent',
                color: selectedStatus === status ? '#FFFFFF' : '#475569',
                borderColor: selectedStatus === status ? '#4361EE' : '#CBD5E1',
                '&:hover': {
                  bgcolor: selectedStatus === status ? '#374FC7' : '#F1F5F9'
                }
              }}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', flexGrow: { xs: 1, md: 0 } }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Supplier Filter</InputLabel>
            <Select
              value={vendorFilter}
              label="Supplier Filter"
              onChange={(e) => setVendorFilter(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="All">All Suppliers</MenuItem>
              {vendors.map(v => (
                <MenuItem key={v.Id} value={v.Id}>{v.Name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Search PO # or Supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94A3B8' }} />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>
      </Paper>

      {/* Main Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
        }}
      >
        <Table sx={{ minWidth: 800 }}>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>PO Number</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Issue Date</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Supplier / Vendor</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Line Items</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Order Total (₹)</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPOs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                  <PoIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
                  <Typography variant="body1" sx={{ color: '#64748B', fontWeight: 600 }}>
                    No purchase orders found matching your filters.
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    Try clearing search criteria or create a new order.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredPOs.map((po) => {
                const itemsCount = Array.isArray(po.Items) ? po.Items.length : 0;
                const itemsPreview = Array.isArray(po.Items) && po.Items.length > 0
                  ? po.Items.map(it => it.ProductName || 'Item').slice(0, 2).join(', ') + (po.Items.length > 2 ? ` +${po.Items.length - 2} more` : '')
                  : 'No line items';

                return (
                  <TableRow
                    key={po.Id}
                    hover
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <TableCell>
                      <Box
                        onClick={() => handleViewPO(po)}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                          fontWeight: 700,
                          color: '#4361EE',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                          fontSize: '0.95rem',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        <PoIcon sx={{ fontSize: 18 }} />
                        {po.DocumentNumber}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#334155', fontWeight: 500 }}>
                      {new Date(po.Date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                        {po.VendorName || 'Unknown Vendor'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        ID: {po.VendorId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${itemsCount} item${itemsCount !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{ bgcolor: '#F1F5F9', fontWeight: 600, color: '#334155', mr: 1 }}
                      />
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', maxWidth: 220, noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {itemsPreview}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>
                        ₹{Number(po.TotalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(po.Status)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="View / Print Voucher">
                          <IconButton
                            size="small"
                            onClick={() => handleViewPO(po)}
                            sx={{ color: '#4361EE', '&:hover': { bgcolor: '#EEF2FF' } }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Actions">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setSelectedRowPO(po);
                              setMenuAnchor(e.currentTarget);
                            }}
                            sx={{ color: '#64748B' }}
                          >
                            <MoreVertIcon fontSize="small" />
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

      {/* Row Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2, minWidth: 180, p: 0.5 }
        }}
      >
        <MenuItem
          onClick={() => {
            if (selectedRowPO) handleViewPO(selectedRowPO);
          }}
          sx={{ gap: 1.5, py: 1 }}
        >
          <ViewIcon fontSize="small" sx={{ color: '#4361EE' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>View Document</Typography>
        </MenuItem>

        {selectedRowPO && selectedRowPO.Status !== 'Received' && (
          <MenuItem
            onClick={() => handleStatusUpdate(selectedRowPO.Id, 'Received')}
            sx={{ gap: 1.5, py: 1 }}
          >
            <CheckCircleIcon fontSize="small" sx={{ color: '#2F9E44' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Mark as Received</Typography>
          </MenuItem>
        )}

        {selectedRowPO && selectedRowPO.Status !== 'Cancelled' && (
          <MenuItem
            onClick={() => handleStatusUpdate(selectedRowPO.Id, 'Cancelled')}
            sx={{ gap: 1.5, py: 1, color: '#E03131' }}
          >
            <CancelIcon fontSize="small" sx={{ color: '#E03131' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Cancel Order</Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Create Purchase Order Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#1E293B', pb: 1 }}>
          Create New Purchase Order
        </DialogTitle>
        <DialogContent dividers sx={{ borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', py: 2.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#4361EE', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1.5 }}>
            1. Supplier & Destination Details
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Supplier / Vendor *</InputLabel>
                <Select
                  value={formVendorId}
                  label="Supplier / Vendor *"
                  onChange={(e) => setFormVendorId(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  {vendors.map(v => (
                    <MenuItem key={v.Id} value={v.Id}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{v.Name}</Typography>
                        <Typography variant="caption" color="text.secondary">{v.City} • {v.MobileNumber || 'No phone'}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Expected Delivery Date *"
                type="date"
                value={formDeliveryDate}
                onChange={(e) => setFormDeliveryDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Procurement Instructions / Terms"
                placeholder="e.g. Deliver before 10 AM, quality inspection required, Net 15 terms"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#4361EE', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              2. Ordered Items & Agreed Rates
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
            >
              Add Item Line
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: '40%' }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '20%' }}>Quantity</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '20%' }}>Agreed Rate (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: '15%' }}>Line Total (₹)</TableCell>
                  <TableCell align="center" sx={{ width: '5%' }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formItems.map((item, index) => {
                  const lineTotal = item.quantity * item.rate;
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={item.productId}
                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                            displayEmpty
                            sx={{ borderRadius: 1.5 }}
                          >
                            <MenuItem value="" disabled>Select Product</MenuItem>
                            {products.map(p => (
                              <MenuItem key={p.Id} value={p.Id}>
                                {p.Name} (₹{p.Cost})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          InputProps={{ inputProps: { min: 1 } }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          InputProps={{ inputProps: { min: 0, step: 0.5 } }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                          ₹{lineTotal.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveItem(index)}
                          disabled={formItems.length === 1}
                          sx={{ color: '#E03131' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Form Summary Total */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                Total Items: {formItems.length} lines | Total Qty: {formItems.reduce((s, i) => s + (parseInt(i.quantity, 10) || 0), 0)} units
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Store: store_mum_01 (Mumbai Superstore Central Hub)
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                Total Order Commitment
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#4361EE' }}>
                ₹{calculateFormTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button
            onClick={() => setCreateDialogOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreatePO}
            sx={{
              bgcolor: '#4361EE',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              px: 3,
              boxShadow: '0 4px 14px rgba(67, 97, 238, 0.4)',
              '&:hover': { bgcolor: '#374FC7' }
            }}
          >
            Save & Issue Purchase Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* View / Printable Purchase Order Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            '@media print': {
              boxShadow: 'none',
              m: 0,
              width: '100%',
              maxWidth: '100%'
            }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }} className="no-print">
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>
            Purchase Order Voucher
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{ bgcolor: '#4361EE', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Print PO
            </Button>
            <Button
              size="small"
              onClick={() => setViewDialogOpen(false)}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Close
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2, md: 4 } }}>
          {activePO && (
            <Box id="printable-po-document" sx={{ bgcolor: '#FFFFFF' }}>
              {/* Company Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#1E293B', letterSpacing: '-0.5px' }}>
                    RETAILPOS SUPERMARKET PVT LTD
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Central Distribution & Logistics Hub, Andheri East
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mumbai, Maharashtra 400069 | GSTIN: 27AABCR1234F1Z9
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Email: procurement@retailpos.com | Ph: +91 (022) 555-0199
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#4361EE', fontFamily: 'monospace' }}>
                    {activePO.DocumentNumber}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748B', mt: 0.5 }}>
                    Date: {new Date(activePO.Date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {getStatusChip(activePO.Status)}
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Supplier & Store Grid */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#4361EE', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                      Vendor / Supplier Details
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B' }}>
                      {activePO.VendorName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vendor ID: {activePO.VendorId}
                    </Typography>
                    {(() => {
                      const v = vendors.find(x => x.Id === activePO.VendorId);
                      return v ? (
                        <>
                          <Typography variant="body2" color="text.secondary">
                            {v.Address}, {v.City} - {v.Pin}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Contact: {v.MobileNumber} | {v.Email}
                          </Typography>
                        </>
                      ) : null;
                    })()}
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#4361EE', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                      Ship To / Delivery Destination
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B' }}>
                      Mumbai Superstore (Store 01)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Destination Store ID: store_mum_01
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receiving Dock #2, MIDC Logistics Hub
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Attn: Receiving & Inventory Audit Team
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Items Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Product Description</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Order Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Agreed Rate (₹)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Line Total (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(activePO.Items) && activePO.Items.length > 0 ? (
                      activePO.Items.map((itm, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ color: '#64748B' }}>{idx + 1}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {itm.ProductName || 'Item'}
                            </Typography>
                            {itm.ProductId && (
                              <Typography variant="caption" color="text.secondary">
                                SKU: {itm.ProductId}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>
                            {itm.Quantity} {itm.Unit || 'pcs'}
                          </TableCell>
                          <TableCell align="right">
                            ₹{Number(itm.Rate || 0).toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            ₹{(Number(itm.Quantity || 0) * Number(itm.Rate || 0)).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                          No line items recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Totals & Terms */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                <Box sx={{ maxWidth: 450 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Terms & Instructions:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                    1. Goods must match specification and pass quality inspection upon arrival.<br />
                    2. Inward invoice with GST compliance must accompany consignment.<br />
                    3. Payment terms subject to verification by Accounts Department.
                  </Typography>
                </Box>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 260, bgcolor: '#F8FAFC' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      ₹{Number(activePO.TotalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Applicable GST (0%):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>₹0.00</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Total Payable:</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#4361EE' }}>
                      ₹{Number(activePO.TotalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Paper>
              </Box>

              {/* Signatures */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 4, borderTop: '1px dashed #CBD5E1' }}>
                <Box sx={{ textAlign: 'center', width: 200 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    Authorized Signatory
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Purchase Department
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', width: 200 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    Vendor Acknowledgment
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Signature & Stamp
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast({ ...toast, open: false })}
          sx={{ borderRadius: 2, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
