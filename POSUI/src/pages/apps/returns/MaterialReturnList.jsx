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
  Menu
} from '@mui/material';
import {
  Add as AddIcon,
  AssignmentReturn as ReturnIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  WarningAmber as WarningIcon,
  MonetizationOn as MoneyIcon,
  LocalShipping as ShippingIcon,
  EventBusy as ExpiredIcon
} from '@mui/icons-material';
import returnService from '../../../_api/returnService';
import vendorService from '../../../_api/vendorService';
import productService from '../../../_api/productService';
import { printDebitNote, numberToWordsINR } from '../../../utils/printService';

export default function MaterialReturnList() {
  const [returnNotes, setReturnNotes] = useState([]);
  const [stats, setStats] = useState({
    TotalReturns: 0,
    TotalReturnValue: 0,
    PendingCreditNotes: 0,
    ExpiredReturns: 0
  });
  const [reasons, setReasons] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedReasonFilter, setSelectedReasonFilter] = useState('All');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Menus
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedRowNote, setSelectedRowNote] = useState(null);

  // Create Return Form State
  const [formVendorId, setFormVendorId] = useState('');
  const [formReasonId, setFormReasonId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState([
    { productId: '', productName: '', batchBarcode: '', quantity: 10, rate: 0, currentStock: 0 }
  ]);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [notes, retStats, rList, vList, pList] = await Promise.all([
        returnService.getReturns(),
        returnService.getReturnStats(),
        returnService.getReturnReasons(),
        vendorService.getVendors(),
        productService.getProducts()
      ]);
      setReturnNotes(notes);
      setStats(retStats);
      setReasons(rList);
      setVendors(vList);
      setProducts(pList);
    } catch (err) {
      console.error('Error loading material returns data:', err);
      setToast({ open: true, message: 'Failed to load material return notes.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Notes
  const filteredNotes = returnNotes.filter(note => {
    if (selectedReasonFilter !== 'All' && note.MaterialReturnId !== selectedReasonFilter) {
      return false;
    }
    if (selectedVendorFilter !== 'All' && note.VendorId !== selectedVendorFilter) {
      return false;
    }
    if (selectedStatusFilter !== 'All' && note.Status?.toLowerCase() !== selectedStatusFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const docMatch = note.DocumentNumber?.toLowerCase().includes(q);
      const vndMatch = note.VendorName?.toLowerCase().includes(q);
      const rsnMatch = note.ReturnReason?.toLowerCase().includes(q);
      if (!docMatch && !vndMatch && !rsnMatch) return false;
    }
    return true;
  });

  // Create Form Handlers
  const handleAddItem = () => {
    setFormItems(prev => [
      ...prev,
      { productId: '', productName: '', batchBarcode: '', quantity: 5, rate: 0, currentStock: 0 }
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
          batchBarcode: prod ? (prod.Barcode || prod.ProductNumber || 'BATCH-01') : '',
          rate: prod ? (parseFloat(prod.Cost) || 0) : 0,
          currentStock: prod ? (parseFloat(prod.StockQuantity || prod.Stock) || 0) : 0
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
    if (vendors.length > 0) setFormVendorId(vendors[0].Id);
    if (reasons.length > 0) setFormReasonId(reasons[0].Id);
    setFormNotes('Damaged / expired stock return to supplier. Requesting credit note adjustment.');

    if (products.length > 0) {
      setFormItems([
        {
          productId: products[0].Id,
          productName: products[0].Name,
          batchBarcode: products[0].Barcode || products[0].ProductNumber || 'BATCH-01',
          quantity: 10,
          rate: parseFloat(products[0].Cost) || 0,
          currentStock: parseFloat(products[0].StockQuantity || products[0].Stock) || 0
        }
      ]);
    } else {
      setFormItems([{ productId: '', productName: '', batchBarcode: '', quantity: 10, rate: 0, currentStock: 0 }]);
    }
    setCreateDialogOpen(true);
  };

  const handleCreateReturnNote = async () => {
    const vnd = vendors.find(v => v.Id === formVendorId);
    const rsn = reasons.find(r => r.Id === formReasonId);

    if (!vnd || !rsn) {
      setToast({ open: true, message: 'Please select a vendor and return reason.', severity: 'warning' });
      return;
    }

    const invalidItems = formItems.some(it => !it.productId || it.quantity <= 0);
    if (invalidItems) {
      setToast({ open: true, message: 'Please complete all items with valid product and return quantity.', severity: 'warning' });
      return;
    }

    const totalDebit = calculateFormTotal();
    const formattedItems = formItems.map(item => ({
      ProductId: item.productId,
      ProductName: item.productName,
      BatchBarcode: item.batchBarcode,
      Quantity: item.quantity,
      Rate: item.rate,
      Total: item.quantity * item.rate
    }));

    try {
      const newNote = await returnService.createReturn({
        VendorId: vnd.Id,
        VendorName: vnd.Name,
        StoreId: 'store_mum_01',
        MaterialReturnId: rsn.Id,
        ReturnReason: rsn.Name,
        TotalReturnAmount: totalDebit,
        Status: 'Credit Note Pending',
        Items: formattedItems,
        Notes: formNotes
      });

      setToast({
        open: true,
        message: `Material Return Note ${newNote.DocumentNumber || 'created'} generated! Product stock decremented.`,
        severity: 'success'
      });
      setCreateDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Error creating return note:', err);
      setToast({ open: true, message: 'Failed to create return note: ' + err.message, severity: 'error' });
    }
  };

  const handleStatusUpdate = async (noteId, newStatus) => {
    try {
      await returnService.updateReturnStatus(noteId, newStatus);
      setToast({ open: true, message: `Return Note marked as ${newStatus}!`, severity: 'success' });
      setMenuAnchor(null);
      loadData();
    } catch (err) {
      console.error('Error updating status:', err);
      setToast({ open: true, message: 'Failed to update status.', severity: 'error' });
    }
  };

  const handleViewNote = (note) => {
    setActiveNote(note);
    setViewDialogOpen(true);
    setMenuAnchor(null);
  };

  const handlePrintNote = (note) => {
    printDebitNote(note);
  };

  const getReasonChip = (reason) => {
    let color = '#D9480F';
    let bg = '#FFF9DB';
    let border = '#FFE066';

    if (reason?.toLowerCase().includes('expired')) {
      color = '#C92A2A';
      bg = '#FFE3E3';
      border = '#FFA8A8';
    } else if (reason?.toLowerCase().includes('damaged')) {
      color = '#E8590C';
      bg = '#FFF4E6';
      border = '#FFD8A8';
    } else if (reason?.toLowerCase().includes('quality')) {
      color = '#7950F2';
      bg = '#F3F0FF';
      border = '#D0BFFF';
    }

    return (
      <Chip
        label={reason || 'Return'}
        size="small"
        sx={{
          fontWeight: 700,
          bgcolor: bg,
          color: color,
          border: `1px solid ${border}`,
          borderRadius: 1.5
        }}
      />
    );
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'Credit Note Settled':
      case 'Settled':
        return (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
            label="Settled"
            size="small"
            sx={{ fontWeight: 700, bgcolor: '#EBFBEE', color: '#2F9E44', border: '1px solid #B2F2BB' }}
          />
        );
      case 'Dispatched to Supplier':
        return (
          <Chip
            icon={<ShippingIcon sx={{ fontSize: 16 }} />}
            label="Dispatched"
            size="small"
            sx={{ fontWeight: 700, bgcolor: '#EEF2FF', color: '#4361EE', border: '1px solid #C7D2FE' }}
          />
        );
      case 'Credit Note Pending':
      default:
        return (
          <Chip
            icon={<PendingIcon sx={{ fontSize: 16 }} />}
            label="Credit Pending"
            size="small"
            sx={{ fontWeight: 700, bgcolor: '#FFF9DB', color: '#F59F00', border: '1px solid #FFE066' }}
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
                bgcolor: '#E03131',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(224, 49, 49, 0.3)'
              }}
            >
              <ReturnIcon />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.5px' }}>
              Vendor Material Returns
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Process outward return dockets for damaged, expired, or non-compliant supplier stock and audit debit notes.
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
              bgcolor: '#E03131',
              boxShadow: '0 4px 14px rgba(224, 49, 49, 0.4)',
              '&:hover': { bgcolor: '#C92A2A' }
            }}
          >
            New Material Return Note
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
                bgcolor: '#FFF5F5',
                color: '#E03131',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ReturnIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Return Notes
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.2 }}>
                {stats.TotalReturns}
              </Typography>
              <Typography variant="caption" sx={{ color: '#E03131', fontWeight: 500 }}>
                Outward debit dockets
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
                bgcolor: '#FFF5F5',
                color: '#C92A2A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MoneyIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Debit Value
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.2 }}>
                ₹{Number(stats.TotalReturnValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#C92A2A', fontWeight: 500 }}>
                Claimed from vendors
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
                Pending Credit Notes
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.2 }}>
                {stats.PendingCreditNotes}
              </Typography>
              <Typography variant="caption" sx={{ color: '#F59F00', fontWeight: 500 }}>
                Awaiting supplier credit
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
                bgcolor: '#FFF4E6',
                color: '#E8590C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ExpiredIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Expired Stock Claims
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.2 }}>
                {stats.ExpiredReturns}
              </Typography>
              <Typography variant="caption" sx={{ color: '#E8590C', fontWeight: 500 }}>
                FEFO audit batches
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
          <Chip
            label="All Reasons"
            onClick={() => setSelectedReasonFilter('All')}
            variant={selectedReasonFilter === 'All' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: 600,
              borderRadius: 2,
              cursor: 'pointer',
              bgcolor: selectedReasonFilter === 'All' ? '#E03131' : 'transparent',
              color: selectedReasonFilter === 'All' ? '#FFFFFF' : '#475569',
              borderColor: selectedReasonFilter === 'All' ? '#E03131' : '#CBD5E1'
            }}
          />
          {reasons.map(r => (
            <Chip
              key={r.Id}
              label={r.Name}
              onClick={() => setSelectedReasonFilter(r.Id)}
              variant={selectedReasonFilter === r.Id ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                cursor: 'pointer',
                bgcolor: selectedReasonFilter === r.Id ? '#E03131' : 'transparent',
                color: selectedReasonFilter === r.Id ? '#FFFFFF' : '#475569',
                borderColor: selectedReasonFilter === r.Id ? '#E03131' : '#CBD5E1',
                '&:hover': { bgcolor: selectedReasonFilter === r.Id ? '#C92A2A' : '#F1F5F9' }
              }}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', flexGrow: { xs: 1, md: 0 } }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Supplier Filter</InputLabel>
            <Select
              value={selectedVendorFilter}
              label="Supplier Filter"
              onChange={(e) => setSelectedVendorFilter(e.target.value)}
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
            placeholder="Search Docket #, Vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94A3B8' }} />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Return Docket #</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Supplier / Vendor</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Return Reason</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Returned Stock</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Debit Value (₹)</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', py: 1.8 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredNotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                  <ReturnIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
                  <Typography variant="body1" sx={{ color: '#64748B', fontWeight: 600 }}>
                    No material return notes found.
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    Try clearing search criteria or create a new return docket.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredNotes.map((note) => {
                const itemsCount = Array.isArray(note.Items) ? note.Items.length : 0;
                const itemsPreview = Array.isArray(note.Items) && note.Items.length > 0
                  ? note.Items.map(it => `${it.ProductName} (${it.Quantity || 1})`).slice(0, 2).join(', ')
                  : 'Batch item';

                return (
                  <TableRow
                    key={note.Id}
                    hover
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <TableCell>
                      <Box
                        onClick={() => handleViewNote(note)}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                          fontWeight: 700,
                          color: '#E03131',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                          fontSize: '0.95rem',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        <ReturnIcon sx={{ fontSize: 18 }} />
                        {note.DocumentNumber}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#334155', fontWeight: 500 }}>
                      {new Date(note.Date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                        {note.VendorName || 'Supplier'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        ID: {note.VendorId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getReasonChip(note.ReturnReason)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${itemsCount} item${itemsCount !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{ bgcolor: '#F1F5F9', fontWeight: 600, color: '#334155', mr: 1 }}
                      />
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', maxWidth: 200, noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {itemsPreview}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>
                        ₹{Number(note.TotalReturnAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(note.Status)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="View / Print Debit Note">
                          <IconButton
                            size="small"
                            onClick={() => handleViewNote(note)}
                            sx={{ color: '#E03131', '&:hover': { bgcolor: '#FFF5F5' } }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Direct Print">
                          <IconButton
                            size="small"
                            onClick={() => handlePrintNote(note)}
                            sx={{ color: '#4361EE', '&:hover': { bgcolor: '#EEF2FF' } }}
                          >
                            <PrintIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Actions">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setSelectedRowNote(note);
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
        PaperProps={{ elevation: 3, sx: { borderRadius: 2, minWidth: 200, p: 0.5 } }}
      >
        <MenuItem
          onClick={() => {
            if (selectedRowNote) handleViewNote(selectedRowNote);
          }}
          sx={{ gap: 1.5, py: 1 }}
        >
          <ViewIcon fontSize="small" sx={{ color: '#E03131' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>View Debit Voucher</Typography>
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (selectedRowNote) {
              handlePrintNote(selectedRowNote);
              setMenuAnchor(null);
            }
          }}
          sx={{ gap: 1.5, py: 1 }}
        >
          <PrintIcon fontSize="small" sx={{ color: '#4361EE' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Print Debit Note</Typography>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {selectedRowNote && selectedRowNote.Status !== 'Dispatched to Supplier' && (
          <MenuItem
            onClick={() => handleStatusUpdate(selectedRowNote.Id, 'Dispatched to Supplier')}
            sx={{ gap: 1.5, py: 1 }}
          >
            <ShippingIcon fontSize="small" sx={{ color: '#4361EE' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Mark as Dispatched</Typography>
          </MenuItem>
        )}

        {selectedRowNote && selectedRowNote.Status !== 'Credit Note Settled' && (
          <MenuItem
            onClick={() => handleStatusUpdate(selectedRowNote.Id, 'Credit Note Settled')}
            sx={{ gap: 1.5, py: 1 }}
          >
            <CheckCircleIcon fontSize="small" sx={{ color: '#2F9E44' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Mark Credit Settled</Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Create Material Return Note Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#1E293B', pb: 1 }}>
          Create Vendor Material Return Note
        </DialogTitle>
        <DialogContent dividers sx={{ borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', py: 2.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#E03131', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1.5 }}>
            1. Return Header & Justification
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
              <FormControl fullWidth size="small">
                <InputLabel>Return Reason Master *</InputLabel>
                <Select
                  value={formReasonId}
                  label="Return Reason Master *"
                  onChange={(e) => setFormReasonId(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  {reasons.map(r => (
                    <MenuItem key={r.Id} value={r.Id}>
                      {r.Name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Return Instructions / Quality Notes"
                placeholder="e.g. Broken seal detected at receiving dock, return authorized by store manager"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#E03131', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              2. Defective / Expired Inventory Items (Stock Decremented Automatically)
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, color: '#E03131' }}
            >
              Add Item Line
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: '40%' }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '18%' }}>Return Qty</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '18%' }}>Debit Rate (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: '18%' }}>Debit Total (₹)</TableCell>
                  <TableCell align="center" sx={{ width: '6%' }}></TableCell>
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
                                {p.Name} (Stock: {p.StockQuantity || p.Stock || 0})
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
                          helperText={`Available: ${item.currentStock}`}
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
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#E03131' }}>
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
              bgcolor: '#FFF5F5',
              border: '1px solid #FFC9C9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#C92A2A', display: 'block', fontWeight: 600 }}>
                Total Items: {formItems.length} lines | Return Qty: {formItems.reduce((s, i) => s + (parseInt(i.quantity, 10) || 0), 0)} units
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Store: store_mum_01 (Mumbai Central Superstore)
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: '#C92A2A', fontWeight: 600 }}>
                Total Outward Debit Claim
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#E03131' }}>
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
            onClick={handleCreateReturnNote}
            sx={{
              bgcolor: '#E03131',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              px: 3,
              boxShadow: '0 4px 14px rgba(224, 49, 49, 0.4)',
              '&:hover': { bgcolor: '#C92A2A' }
            }}
          >
            Generate Return Note & Decrement Stock
          </Button>
        </DialogActions>
      </Dialog>

      {/* View / Printable Debit Note Voucher Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>
            Material Return Debit Voucher
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<PrintIcon />}
              onClick={() => activeNote && handlePrintNote(activeNote)}
              sx={{ bgcolor: '#E03131', textTransform: 'none', fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#C92A2A' } }}
            >
              Print Debit Note
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
          {activeNote && (
            <Box id="printable-debit-document" sx={{ bgcolor: '#FFFFFF' }}>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#1E293B', letterSpacing: '-0.5px' }}>
                    DAILYMART EXPRESS SUPERSTORE
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Central Distribution & Logistics Hub, Andheri East
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mumbai, Maharashtra 400069 | GSTIN: 27AABCU9603R1ZM
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#E03131', fontFamily: 'monospace' }}>
                    {activeNote.DocumentNumber}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748B', mt: 0.5 }}>
                    Date: {new Date(activeNote.Date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {getStatusChip(activeNote.Status)}
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Vendor & Reason Grid */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#E03131', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                      Debited To Vendor / Supplier
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B' }}>
                      {activeNote.VendorName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vendor ID: {activeNote.VendorId}
                    </Typography>
                    {(() => {
                      const v = vendors.find(x => x.Id === activeNote.VendorId);
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
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#E03131', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                      Outward Return Justification
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      {getReasonChip(activeNote.ReturnReason)}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Store Location: store_mum_01 (Mumbai Superstore)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Inspection Log: Passed receiving dock verification
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
                      <TableCell sx={{ fontWeight: 700 }}>Item Description</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Returned Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Rate (₹)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Debit Amount (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(activeNote.Items) && activeNote.Items.length > 0 ? (
                      activeNote.Items.map((itm, idx) => (
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
                            {itm.Quantity || itm.ReturnQty || 1}
                          </TableCell>
                          <TableCell align="right">
                            ₹{Number(itm.Rate || 0).toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: '#E03131' }}>
                            ₹{Number(itm.Total || (itm.Quantity * itm.Rate) || 0).toFixed(2)}
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

              {/* Totals & Words */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                <Box sx={{ maxWidth: 450 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Amount in Words:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, mt: 0.5 }}>
                    {numberToWordsINR(activeNote.TotalReturnAmount || 0)}
                  </Typography>
                </Box>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 260, bgcolor: '#FFF5F5', borderColor: '#FFC9C9' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Total Debit Claim:</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#E03131' }}>
                      ₹{Number(activeNote.TotalReturnAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Paper>
              </Box>

              {/* Signatures */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 4, borderTop: '1px dashed #CBD5E1' }}>
                <Box sx={{ textAlign: 'center', width: 200 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    Store Manager Signature
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    DailyMart Express Logistics
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', width: 200 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    Vendor Representative
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Receipt & Credit Note Stamp
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
