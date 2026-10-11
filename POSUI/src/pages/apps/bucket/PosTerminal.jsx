import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Button,
  ButtonGroup,
  IconButton,
  Divider,
  Paper,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Autocomplete,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  QrCodeScanner as ScannerIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  DeleteOutline as DeleteIcon,
  PauseCircleOutline as HoldIcon,
  CheckCircle as PayIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Phone as PhoneIcon,
  QrCode2 as QrIcon,
  Payments as CashIcon,
  ClearAll as ClearIcon,
  CameraAlt as CameraIcon,
  RestorePage as RestoreIcon,
  Layers as LayersIcon,
  Keyboard as KeyboardIcon,
  Scale as ScaleIcon
} from '@mui/icons-material';

import {
  addItem,
  updateQuantity,
  setQuantity,
  removeItem,
  setCustomer,
  setPaymentMode,
  setCashReceived,
  setIsPaymentReceived,
  clearCart,
  loadBucket
} from '../../../store/cartSlice';
import { QRCodeSVG } from 'qrcode.react';
import { addHeldBucket, removeHeldBucket, clearAllHeldBuckets } from '../../../store/heldBucketsSlice';
import productService from '../../../_api/productService';
import customerService from '../../../_api/customerService';
import invoiceService from '../../../_api/invoiceService';
import whatsappService from '../../../_api/whatsappService';
import bucketService from '../../../_api/bucketService';
import InvoiceSuccessDialog from '../invoice/InvoiceSuccessDialog';
import BarcodeScannerDialog from './BarcodeScannerDialog';
import WeightModal from './WeightModal';
import {
  getUnitMeta,
  isWeighedOrMeasured,
  formatQuantity,
  formatQtyWithUnit,
  formatRatePerUnit
} from '../../../utils/uomHelper';

export default function PosTerminal() {
  const dispatch = useDispatch();
  const cart = useSelector(state => state.cart);
  const heldBuckets = useSelector(state => state.heldBuckets.heldBuckets);
  const { user, activeStore } = useSelector(state => state.auth);

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('cat_all');
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [heldBucketsDialogOpen, setHeldBucketsDialogOpen] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const [weightModalState, setWeightModalState] = useState({
    open: false,
    product: null,
    currentQty: 0,
    mode: 'add'
  });

  const handleOpenWeightModal = (product, currentQty = 0, mode = 'add') => {
    setWeightModalState({
      open: true,
      product,
      currentQty,
      mode
    });
  };

  const handleCloseWeightModal = () => {
    setWeightModalState(prev => ({ ...prev, open: false }));
  };

  const handleConfirmWeight = (canonicalQty) => {
    if (!weightModalState.product) return;
    const prod = weightModalState.product;
    const prodUnit = prod.unit || prod.Unit || 'PCS';
    if (weightModalState.mode === 'edit') {
      const maxStock = prod.stockQuantity !== undefined ? parseFloat(prod.stockQuantity) : 999999;
      if (canonicalQty > maxStock) {
        setToast({
          open: true,
          message: `Stock limit: Only ${formatQtyWithUnit(maxStock, prodUnit)} available for "${prod.name || prod.Name}"!`,
          severity: 'warning'
        });
        return;
      }
      dispatch(setQuantity({ id: prod.id, quantity: canonicalQty }));
      setToast({
        open: true,
        message: `Updated: ${prod.name || prod.Name} (${formatQtyWithUnit(canonicalQty, prodUnit)})`,
        severity: 'info'
      });
    } else {
      handleAddProductWithStockCheck(prod, canonicalQty);
    }
  };

  // Customer Search & Creation State
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    mobileNumber: '',
    state: 'Maharashtra',
    gstin: ''
  });

  const barcodeInputRef = useRef(null);
  const customerInputRef = useRef(null);

  // Fetch customer suggestions
  const fetchCustomers = async (search = '') => {
    try {
      setCustomerLoading(true);
      const list = await customerService.getCustomers(search);
      if (Array.isArray(list)) {
        setCustomerOptions(list);
      }
    } catch (err) {
      console.warn('Failed to load customers for suggestions:', err);
    } finally {
      setCustomerLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers('');
  }, []);

  // Load staged held buckets from PostgreSQL
  useEffect(() => {
    async function loadHeldBuckets() {
      try {
        const list = await bucketService.getBuckets();
        if (Array.isArray(list) && list.length > 0) {
          list.forEach(b => dispatch(addHeldBucket(b)));
        }
      } catch (err) {
        console.warn('Could not load held buckets from PostgreSQL:', err);
      }
    }
    loadHeldBuckets();
  }, []);

  // Load initial catalog and categories
  useEffect(() => {
    async function loadData() {
      const cats = await productService.getCategories();
      setCategories(cats);
      const prods = await productService.getProducts({ categoryId: 'cat_all' });
      setProducts(prods);
    }
    loadData();
  }, []);

  // Filter products when category or search changes
  useEffect(() => {
    async function filterProds() {
      const prods = await productService.getProducts({
        categoryId: selectedCategory,
        searchTerm: searchQuery
      });
      setProducts(prods);
    }
    filterProds();
  }, [selectedCategory, searchQuery]);

  // Global Keyboard Shortcuts (F1: guide, F2: search, F4: customer, F7: held, F8: hold, F9: checkout, F10/Alt+P: pay, Alt+C: clear, Esc: cancel)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShortcutsDialogOpen(prev => !prev);
      } else if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (e.shiftKey) {
          openAddNewCustomerModal('');
        } else {
          customerInputRef.current?.focus();
        }
      } else if (e.key === 'F7') {
        e.preventDefault();
        setHeldBucketsDialogOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldBucket();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleCheckout();
      } else if (e.key === 'F10' || (e.altKey && (e.key === 'p' || e.key === 'P'))) {
        e.preventDefault();
        dispatch(setPaymentMode(cart.paymentMode === 0 ? 1 : 0));
      } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        if (cart.items.length > 0) {
          dispatch(clearCart());
          setToast({ open: true, message: 'Cart cleared', severity: 'info' });
        }
      } else if (e.key === 'Escape') {
        if (shortcutsDialogOpen) {
          setShortcutsDialogOpen(false);
        } else if (heldBucketsDialogOpen) {
          setHeldBucketsDialogOpen(false);
        } else if (addCustomerDialogOpen) {
          setAddCustomerDialogOpen(false);
        } else if (scannerOpen) {
          setScannerOpen(false);
        } else if (searchQuery) {
          setSearchQuery('');
          barcodeInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, shortcutsDialogOpen, heldBucketsDialogOpen, addCustomerDialogOpen, scannerOpen, searchQuery]);

  // Stock-aware product adder
  const handleAddProductWithStockCheck = (product, explicitQty = null) => {
    if (!product) return false;

    // Expiry check
    if (product.IsExpDate && product.Days <= 0) {
      setToast({ open: true, message: `Blocked: "${product.Name}" batch has expired!`, severity: 'error' });
      return false;
    }

    const unit = product.Unit || product.unit || 'PCS';
    const stock = product.StockQuantity !== undefined ? parseFloat(product.StockQuantity) : 999999;
    if (stock <= 0) {
      setToast({ open: true, message: `Blocked: "${product.Name}" is Out of Stock! (0 ${getUnitMeta(unit).short} available)`, severity: 'error' });
      return false;
    }

    const productId = String(product.Id || product.id || product.ProductNumber || '');
    const productNum = String(product.ProductNumber || product.productNumber || '');
    const inCart = cart.items.find(i => String(i.id) === productId || (productNum && String(i.productNumber) === productNum));
    const currentCartQty = inCart ? inCart.quantity : 0;
    const addQty = explicitQty !== null ? explicitQty : (isWeighedOrMeasured(unit) ? 1.0 : 1);

    if (currentCartQty + addQty > stock + 0.0001) {
      setToast({
        open: true,
        message: `Stock limit reached: Only ${formatQtyWithUnit(stock, unit)} of "${product.Name}" available in inventory!`,
        severity: 'warning'
      });
      return false;
    }

    dispatch(addItem({ ...product, quantity: addQty }));
    setToast({
      open: true,
      message: `Added: ${product.Name} (+${formatQtyWithUnit(addQty, unit)})`,
      severity: 'success'
    });
    return true;
  };

  // Barcode Scan / Enter Key handler
  const handleBarcodeSubmit = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const code = searchQuery.trim();
      const matched = await productService.getProductByBarcode(code);
      if (matched) {
        if (isWeighedOrMeasured(matched.Unit)) {
          const inCart = cart.items.find(i => String(i.id) === String(matched.Id || matched.ProductNumber));
          handleOpenWeightModal(matched, inCart ? inCart.quantity : 0, inCart ? 'edit' : 'add');
          setSearchQuery('');
        } else if (handleAddProductWithStockCheck(matched)) {
          setSearchQuery('');
        }
      } else {
        // If not exact barcode, check first product match
        if (products.length > 0) {
          const p0 = products[0];
          if (isWeighedOrMeasured(p0.Unit)) {
            const inCart = cart.items.find(i => String(i.id) === String(p0.Id || p0.ProductNumber));
            handleOpenWeightModal(p0, inCart ? inCart.quantity : 0, inCart ? 'edit' : 'add');
            setSearchQuery('');
          } else if (handleAddProductWithStockCheck(p0)) {
            setSearchQuery('');
          }
        } else {
          setToast({ open: true, message: `No product found for barcode "${code}"`, severity: 'warning' });
        }
      }
    }
  };

  // Camera Barcode / QR Scan Handler
  const handleCameraScan = async (scannedCode) => {
    if (!scannedCode) return;
    const cleanCode = String(scannedCode).trim();
    const matched = await productService.getProductByBarcode(cleanCode);
    if (matched) {
      if (isWeighedOrMeasured(matched.Unit)) {
        const inCart = cart.items.find(i => String(i.id) === String(matched.Id || matched.ProductNumber));
        handleOpenWeightModal(matched, inCart ? inCart.quantity : 0, inCart ? 'edit' : 'add');
      } else {
        handleAddProductWithStockCheck(matched);
      }
    } else {
      setToast({ open: true, message: `No product found for scanned code: "${cleanCode}"`, severity: 'warning' });
    }
  };

  // Add Product Card click
  const handleProductCardClick = (product) => {
    if (isWeighedOrMeasured(product.Unit)) {
      const inCart = cart.items.find(i => String(i.id) === String(product.Id || product.ProductNumber));
      handleOpenWeightModal(product, inCart ? inCart.quantity : 0, inCart ? 'edit' : 'add');
    } else {
      handleAddProductWithStockCheck(product);
    }
  };

  // Edit Cart Item Weight
  const handleEditCartItemWeight = (item) => {
    handleOpenWeightModal(item, item.quantity, 'edit');
  };

  // Customer Search & Suggestion handlers
  const handleCustomerSearchInputChange = (newVal) => {
    setCustomerSearchInput(newVal);
    if (newVal && newVal.length >= 2) {
      fetchCustomers(newVal);
    } else if (!newVal) {
      fetchCustomers('');
    }
  };

  const handleSelectCustomer = (selectedCust) => {
    if (!selectedCust) {
      dispatch(setCustomer({ name: 'Walk-in Customer', mobileNumber: '', state: 'Maharashtra', gstin: '' }));
      return;
    }

    if (selectedCust.isAddNew) {
      openAddNewCustomerModal(selectedCust.typedValue);
      return;
    }

    dispatch(setCustomer({
      id: selectedCust.Id,
      name: selectedCust.Name,
      mobileNumber: selectedCust.MobileNumber,
      state: selectedCust.State || 'Maharashtra',
      gstin: selectedCust.GstNumber || ''
    }));
    setToast({
      open: true,
      message: `Customer selected: ${selectedCust.Name} (${selectedCust.MobileNumber})`,
      severity: 'success'
    });
  };

  const openAddNewCustomerModal = (presetQuery = '') => {
    const isDigits = /^\d+$/.test(presetQuery.trim());
    setNewCustomerForm({
      name: isDigits ? '' : presetQuery.trim(),
      mobileNumber: isDigits ? presetQuery.trim().slice(0, 10) : '',
      state: activeStore?.state || 'Maharashtra',
      gstin: ''
    });
    setAddCustomerDialogOpen(true);
  };

  const handleSaveNewCustomer = async () => {
    const { name, mobileNumber, state, gstin } = newCustomerForm;
    const cleanMobile = (mobileNumber || '').replace(/[^0-9]/g, '');

    if (!name || !name.trim()) {
      setToast({ open: true, message: 'Customer Name is required', severity: 'warning' });
      return;
    }

    if (cleanMobile.length !== 10) {
      setToast({ open: true, message: 'Please enter a valid 10-digit mobile number', severity: 'warning' });
      return;
    }

    try {
      const created = await customerService.createCustomer({
        Name: name.trim(),
        MobileNumber: cleanMobile,
        State: state || 'Maharashtra',
        GstNumber: gstin ? gstin.trim().toUpperCase() : ''
      });

      dispatch(setCustomer({
        id: created.Id,
        name: created.Name,
        mobileNumber: created.MobileNumber,
        state: created.State || 'Maharashtra',
        gstin: created.GstNumber || ''
      }));

      setCustomerOptions(prev => [created, ...prev.filter(c => c.Id !== created.Id)]);
      setAddCustomerDialogOpen(false);
      setCustomerSearchInput('');
      setToast({
        open: true,
        message: `Customer "${created.Name}" created & selected for billing!`,
        severity: 'success'
      });
    } catch (err) {
      setToast({ open: true, message: `Failed to create customer: ${err.message}`, severity: 'error' });
    }
  };

  // Generate next unique bucket number
  const getNextBucketNumber = () => {
    if (!heldBuckets || heldBuckets.length === 0) return 'BKT-01';
    const nums = heldBuckets.map(b => {
      const match = String(b.bucketNumber || '').match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const max = Math.max(...nums, 0);
    return `BKT-${String(max + 1).padStart(2, '0')}`;
  };

  // Hold Bucket (F8)
  const handleHoldBucket = async () => {
    if (!cart.items || cart.items.length === 0) {
      setToast({ open: true, message: 'Cart is empty. Nothing to hold.', severity: 'warning' });
      return;
    }
    const bucketNum = getNextBucketNumber();
    const custName = (cart.customer?.name && cart.customer?.name !== 'Walk-in Customer') ? cart.customer.name : 'Walk-in';
    const newHold = {
      id: `bkt_held_${Date.now()}`,
      bucketNumber: bucketNum,
      customerName: custName,
      itemsCount: cart.items.length,
      total: cart.grandTotal,
      cartData: {
        bucketId: `bkt_${Date.now()}`,
        bucketNumber: bucketNum,
        items: cart.items.map(i => ({ ...i })),
        customer: { ...cart.customer },
        paymentMode: cart.paymentMode
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    dispatch(addHeldBucket(newHold));
    await bucketService.saveBucket(newHold);
    dispatch(clearCart());
    setToast({ open: true, message: `Bucket held as ${newHold.bucketNumber} for ${custName}`, severity: 'info' });
  };

  // Select / Restore Held Bucket
  const handleSelectBucket = async (hb) => {
    if (!hb || !hb.cartData) return;

    // If current cart has items, hold it first so nothing is lost!
    if (cart.items && cart.items.length > 0) {
      const autoNum = getNextBucketNumber();
      const currentCustName = (cart.customer?.name && cart.customer?.name !== 'Walk-in Customer') ? cart.customer.name : 'Walk-in';
      const autoHold = {
        id: `bkt_held_${Date.now()}`,
        bucketNumber: autoNum,
        customerName: currentCustName,
        itemsCount: cart.items.length,
        total: cart.grandTotal,
        cartData: {
          bucketId: `bkt_${Date.now()}`,
          bucketNumber: autoNum,
          items: cart.items.map(i => ({ ...i })),
          customer: { ...cart.customer },
          paymentMode: cart.paymentMode
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      dispatch(addHeldBucket(autoHold));
      await bucketService.saveBucket(autoHold);
      setToast({ open: true, message: `Current cart held as ${autoNum}. Switched to ${hb.bucketNumber} (${hb.customerName})`, severity: 'info' });
    } else {
      setToast({ open: true, message: `Loaded ${hb.bucketNumber} (${hb.customerName})`, severity: 'success' });
    }

    dispatch(loadBucket(hb.cartData));
    dispatch(removeHeldBucket(hb.id));
    await bucketService.deleteBucket(hb.id);
  };

  // Finalize Checkout (F9)
  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      setToast({ open: true, message: 'Cannot generate invoice for an empty cart.', severity: 'error' });
      return;
    }

    if (cart.paymentMode === 0 && cart.amountReceived < cart.grandTotal) {
      setToast({
        open: true,
        message: `Tendered cash ₹${cart.amountReceived} is less than ₹${cart.grandTotal}`,
        severity: 'error'
      });
      return;
    }

    try {
      // Create Invoice atomically (which decrements stock in DB)
      const invoice = await invoiceService.createInvoiceFromCart(cart, activeStore);
      setCreatedInvoice(invoice);
      setShowSuccessDialog(true);
      dispatch(clearCart());

      // Immediately re-fetch updated catalog from backend so stock deductions reflect live on screen!
      const refreshed = await productService.getProducts({
        categoryId: selectedCategory,
        searchTerm: searchQuery
      });
      setProducts(refreshed);
    } catch (err) {
      setToast({ open: true, message: `Checkout error: ${err.message}`, severity: 'error' });
    }
  };

  return (
    <Box sx={{ height: { xs: 'auto', md: 'calc(100vh - 96px)' }, display: 'flex', flexDirection: 'column' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* ========================================================= */}
        {/* LEFT PANE (60%): PRODUCT DISCOVERY & BARCODE SCANNER       */}
        {/* ========================================================= */}
        <Grid item xs={12} md={7} lg={7.5} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
            <Box sx={{
              display: 'flex',
              gap: 1.2,
              alignItems: 'center',
              flexWrap: { xs: 'wrap', md: 'wrap', lg: 'nowrap' }
            }}>
              <TextField
                inputRef={barcodeInputRef}
                fullWidth
                size="small"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleBarcodeSubmit}
                placeholder="Scan barcode / QR or search product... (F2)"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#64748B', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Chip label="F2" size="small" sx={{ fontWeight: 800, bgcolor: '#EEF2FF', color: '#3B5BDB', height: 22, fontSize: 11 }} />
                    </InputAdornment>
                  )
                }}
                sx={{
                  flex: 1,
                  minWidth: { xs: '100%', sm: 180 },
                  '& .MuiOutlinedInput-root': {
                    height: 44,
                    borderRadius: 2
                  }
                }}
              />
              <Box sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                flexShrink: 0,
                width: { xs: '100%', md: '100%', lg: 'auto' },
                justifyContent: { xs: 'flex-start', lg: 'flex-start' }
              }}>
                <Tooltip title="Scan product barcodes via camera">
                  <Button
                    variant="contained"
                    startIcon={<CameraIcon sx={{ fontSize: 18 }} />}
                    onClick={() => setScannerOpen(true)}
                    sx={{
                      height: 44,
                      px: 2,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      bgcolor: '#3B5BDB',
                      color: 'white',
                      borderRadius: 2,
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      boxShadow: '0 2px 8px rgba(59,91,219,0.18)',
                      '&:hover': { bgcolor: '#2B44B8' }
                    }}
                  >
                    Camera
                  </Button>
                </Tooltip>
                <Tooltip title="View POS Keyboard Shortcuts Cheat Sheet (F1)">
                  <Button
                    variant="outlined"
                    startIcon={<KeyboardIcon sx={{ fontSize: 18 }} />}
                    onClick={() => setShortcutsDialogOpen(true)}
                    sx={{
                      height: 44,
                      px: 1.8,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      borderColor: '#CBD5E1',
                      color: '#334155',
                      bgcolor: '#FFFFFF',
                      borderRadius: 2,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#F8FAFC', borderColor: '#3B5BDB', color: '#3B5BDB' }
                    }}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', lg: 'inline' } }}>Shortcuts (F1)</Box>
                    <Box component="span" sx={{ display: { xs: 'inline', lg: 'none' } }}>Shortcuts</Box>
                  </Button>
                </Tooltip>
              </Box>
            </Box>

            {/* Category Filter Chips */}
            <Box sx={{
              display: 'flex',
              gap: 1,
              mt: 1.5,
              overflowX: 'auto',
              pb: 0.5,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' }
            }}>
              {categories.map((cat) => (
                <Chip
                  key={cat.Id}
                  label={cat.Name}
                  clickable
                  color={selectedCategory === cat.Id ? 'primary' : 'default'}
                  onClick={() => setSelectedCategory(cat.Id)}
                  sx={{
                    fontWeight: 600,
                    px: 0.8,
                    borderRadius: 3,
                    flexShrink: 0,
                    bgcolor: selectedCategory === cat.Id ? '#3B5BDB' : '#F1F5F9',
                    color: selectedCategory === cat.Id ? '#FFFFFF' : '#475569',
                    border: '1px solid',
                    borderColor: selectedCategory === cat.Id ? '#2B44B8' : '#E2E8F0',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: selectedCategory === cat.Id ? '#2B44B8' : '#E2E8F0'
                    }
                  }}
                />
              ))}
            </Box>
          </Paper>

          {/* Product Cards Grid */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
            <Grid container spacing={1.5}>
              {products.map((prod) => {
                const prodNum = String(prod.ProductNumber || '');
                const inCart = cart.items.find(i => String(i.id) === String(prod.Id) || (prodNum && String(i.productNumber) === prodNum));
                const inCartQty = inCart ? inCart.quantity : 0;
                const isOutOfStock = prod.StockQuantity <= 0;
                const isMaxInCart = inCartQty >= prod.StockQuantity && !isOutOfStock;

                return (
                  <Grid item xs={12} sm={6} md={6} lg={4} key={prod.Id}>
                    <Card
                      onClick={() => handleProductCardClick(prod)}
                      sx={{
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                        opacity: isOutOfStock ? 0.6 : 1,
                        bgcolor: isOutOfStock ? '#F8FAFC' : '#FFFFFF',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderRadius: 2,
                        transition: 'all 0.15s ease',
                        border: isOutOfStock
                          ? '1px dashed #CBD5E1'
                          : (isMaxInCart ? '1.5px solid #F59F00' : (inCartQty > 0 ? '1.5px solid #3B5BDB' : '1px solid #E2E8F0')),
                        boxShadow: inCartQty > 0 ? '0 4px 12px rgba(59, 91, 219, 0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                        '&:hover': {
                          transform: isOutOfStock ? 'none' : 'translateY(-2px)',
                          boxShadow: isOutOfStock ? 'none' : '0 6px 16px rgba(59, 91, 219, 0.16)',
                          borderColor: isOutOfStock ? '#CBD5E1' : '#3B5BDB'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 1.5, pb: '12px !important', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: isOutOfStock ? '#9CA3AF' : '#1E293B',
                                fontSize: 13,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                minHeight: 38,
                                lineHeight: 1.35
                              }}
                            >
                              {prod.Name}
                            </Typography>
                            {prod.IsExpDate && (
                              <Chip
                                label={`${prod.Days}d`}
                                size="small"
                                sx={{ height: 18, fontSize: 10, bgcolor: '#FFF9DB', color: '#D9480F', fontWeight: 700, flexShrink: 0 }}
                              />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
                              #{prod.ProductNumber}
                            </Typography>
                            <Chip
                              label={prod.Unit || 'PCS'}
                              size="small"
                              icon={isWeighedOrMeasured(prod.Unit) ? <ScaleIcon sx={{ fontSize: '11px !important' }} /> : undefined}
                              sx={{
                                height: 18,
                                fontSize: 10,
                                fontWeight: 700,
                                bgcolor: ['KG', 'GM'].includes(prod.Unit) ? '#EBFBEE' : (['LTR', 'ML'].includes(prod.Unit) ? '#E0F2FE' : '#F1F5F9'),
                                color: ['KG', 'GM'].includes(prod.Unit) ? '#2B8A3E' : (['LTR', 'ML'].includes(prod.Unit) ? '#0284C7' : '#475569')
                              }}
                            />
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: isOutOfStock ? '#94A3B8' : '#0F172A', fontSize: '1.05rem' }}>
                              ₹{prod.Cost.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                              /{getUnitMeta(prod.Unit).short}
                            </Typography>
                          </Box>
                          {isOutOfStock ? (
                            <Chip
                              label="Out of Stock"
                              size="small"
                              sx={{ height: 20, fontSize: 10, bgcolor: '#FFE3E3', color: '#E03131', fontWeight: 700 }}
                            />
                          ) : (
                            <Chip
                              label={isMaxInCart ? `Max (${formatQtyWithUnit(prod.StockQuantity, prod.Unit)})` : (inCartQty > 0 ? `In Cart: ${formatQtyWithUnit(inCartQty, prod.Unit)}` : `Stock: ${formatQtyWithUnit(prod.StockQuantity, prod.Unit)}`)}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: 10.5,
                                bgcolor: isMaxInCart ? '#FFF9DB' : (inCartQty > 0 ? '#EEF2FF' : '#EBFBEE'),
                                color: isMaxInCart ? '#D9480F' : (inCartQty > 0 ? '#3B5BDB' : '#2F9E44'),
                                fontWeight: 700
                              }}
                            />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Grid>

        {/* ========================================================= */}
        {/* RIGHT PANE (40%): CART, GST BREAKDOWN, PAYMENTS & CHECKOUT */}
        {/* ========================================================= */}
        <Grid item xs={12} md={5} lg={4.5} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Paper sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
            {/* Cart Header: Active Cart, Held Buckets & Clear Action */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{
                display: 'flex',
                gap: 0.8,
                overflowX: 'auto',
                alignItems: 'center',
                py: 0.5,
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' }
              }}>
                <Chip
                  label={`Active Cart (${cart.items.length})`}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 700, bgcolor: '#3B5BDB' }}
                />
                {heldBuckets.map((hb) => (
                  <Tooltip key={hb.id} title={`Click to resume ${hb.bucketNumber} - ${hb.customerName} (₹${Number(hb.total || 0).toFixed(2)})`}>
                    <Chip
                      clickable
                      icon={<RestoreIcon sx={{ fontSize: '15px !important', color: '#D9480F !important' }} />}
                      label={`${hb.bucketNumber} (₹${Number(hb.total || 0).toFixed(0)})`}
                      variant="filled"
                      size="small"
                      onClick={() => handleSelectBucket(hb)}
                      onDelete={(e) => {
                        e.stopPropagation();
                        dispatch(removeHeldBucket(hb.id));
                        setToast({ open: true, message: `Discarded ${hb.bucketNumber}`, severity: 'info' });
                      }}
                      sx={{
                        fontWeight: 600,
                        fontSize: 11,
                        color: '#D9480F',
                        bgcolor: '#FFF9DB',
                        border: '1px solid #FFE066',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          bgcolor: '#FFE066',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 8px rgba(245,159,0,0.2)'
                        }
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center', flexShrink: 0 }}>
                {heldBuckets.length > 0 && (
                  <Tooltip title="View & resume held carts (F7)">
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => setHeldBucketsDialogOpen(true)}
                      startIcon={<LayersIcon sx={{ fontSize: 15 }} />}
                      endIcon={<Chip label="F7" size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#FFE066', fontWeight: 800, color: '#D9480F' }} />}
                      sx={{
                        fontSize: 11,
                        py: 0.25,
                        px: 0.8,
                        fontWeight: 700,
                        color: '#D9480F',
                        borderColor: '#F59F00',
                        bgcolor: '#FFF9DB',
                        textTransform: 'none',
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: '#FFE066', borderColor: '#E67700' }
                      }}
                    >
                      Held ({heldBuckets.length})
                    </Button>
                  </Tooltip>
                )}
                <Tooltip title="Clear cart items (Alt + C)">
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      disabled={cart.items.length === 0}
                      onClick={() => dispatch(clearCart())}
                      startIcon={<ClearIcon sx={{ fontSize: 14 }} />}
                      sx={{ fontSize: 11, py: 0.25, px: 0.8, textTransform: 'none' }}
                    >
                      Clear
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            </Box>

            {/* Customer Search & Suggestion Bar */}
            <Box sx={{ mb: 1.5, p: 1, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E3E8EF' }}>
              {(cart.customer?.mobileNumber || (cart.customer?.name && cart.customer?.name !== 'Walk-in Customer')) ? (
                // Selected Customer Profile Box
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                      bgcolor: '#EEF2FF',
                      color: '#3B5BDB',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #C7D2FE'
                    }}>
                      <PersonIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1F2937' }}>
                          {cart.customer.name}
                        </Typography>
                        {cart.customer.state && (
                          <Chip
                            label={cart.customer.state}
                            size="small"
                            sx={{ height: 18, fontSize: 10, bgcolor: '#F1F5F9', color: '#475569', fontWeight: 600 }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#6B7280', display: 'flex', gap: 0.8, alignItems: 'center' }}>
                        <span>📱 {cart.customer.mobileNumber || 'No phone'}</span>
                        {cart.customer.gstin && (
                          <span>• GST: <strong>{cart.customer.gstin}</strong></span>
                        )}
                      </Typography>
                    </Box>
                  </Box>
                  <Tooltip title="Reset to Walk-in Customer">
                    <Button
                      size="small"
                      color="secondary"
                      onClick={() => {
                        dispatch(setCustomer({ name: 'Walk-in Customer', mobileNumber: '', gstin: '', state: 'Maharashtra' }));
                        setCustomerSearchInput('');
                      }}
                      startIcon={<ClearIcon sx={{ fontSize: 14 }} />}
                      sx={{ fontSize: 11, py: 0.2, px: 0.8, textTransform: 'none' }}
                    >
                      Clear
                    </Button>
                  </Tooltip>
                </Box>
              ) : (
                // Search with Autocomplete suggestions + "+ Customer" button
                <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center' }}>
                  <Autocomplete
                    freeSolo
                    fullWidth
                    size="small"
                    options={customerOptions}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      return `${option.Name || ''} (${option.MobileNumber || ''})`;
                    }}
                    filterOptions={(options, params) => {
                      const q = params.inputValue.toLowerCase().trim();
                      const filtered = options.filter(opt => {
                        return (opt.Name && opt.Name.toLowerCase().includes(q)) ||
                               (opt.MobileNumber && opt.MobileNumber.includes(q)) ||
                               (opt.GstNumber && opt.GstNumber.toLowerCase().includes(q));
                      });
                      if (q !== '') {
                        filtered.push({
                          isAddNew: true,
                          typedValue: params.inputValue.trim(),
                          Name: `+ Add "${params.inputValue.trim()}" as new customer`,
                          MobileNumber: ''
                        });
                      }
                      return filtered;
                    }}
                    renderOption={(props, option) => {
                      if (option.isAddNew) {
                        return (
                          <li {...props} key="add-new-cust" style={{ backgroundColor: '#EEF2FF', color: '#3B5BDB', fontWeight: 700 }}>
                            <PersonAddIcon sx={{ fontSize: 18, mr: 1, color: '#3B5BDB' }} />
                            <span>{option.Name}</span>
                          </li>
                        );
                      }
                      return (
                        <li {...props} key={option.Id || option.MobileNumber}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', py: 0.3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1F2937' }}>
                                {option.Name}
                              </Typography>
                              <Chip
                                label={option.MobileNumber}
                                size="small"
                                sx={{ height: 18, fontSize: 11, bgcolor: '#EBFBEE', color: '#2F9E44', fontWeight: 600 }}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.2 }}>
                              <Typography variant="caption" sx={{ color: '#6B7280' }}>
                                {option.State || 'Maharashtra'} {option.TotalVisits ? `• ${option.TotalVisits} visit(s)` : ''}
                              </Typography>
                              {option.GstNumber && (
                                <Typography variant="caption" sx={{ color: '#4F46E5', fontWeight: 600, fontSize: 10 }}>
                                  GST: {option.GstNumber}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </li>
                      );
                    }}
                    onChange={(event, newValue) => {
                      if (typeof newValue === 'string') {
                        if (/^\d{10}$/.test(newValue.trim())) {
                          dispatch(setCustomer({ mobileNumber: newValue.trim() }));
                        } else {
                          dispatch(setCustomer({ name: newValue.trim() }));
                        }
                      } else if (newValue) {
                        handleSelectCustomer(newValue);
                      }
                    }}
                    inputValue={customerSearchInput}
                    onInputChange={(event, newInputValue) => {
                      handleCustomerSearchInputChange(newInputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        inputRef={customerInputRef}
                        placeholder="Customer name or mobile (F4)"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <>
                              <InputAdornment position="end">
                                <Chip label="F4" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#EEF2FF', color: '#3B5BDB' }} />
                              </InputAdornment>
                              {params.InputProps.endAdornment}
                            </>
                          )
                        }}
                      />
                    )}
                  />
                  <Tooltip title="Register new customer (Shift + F4)">
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => openAddNewCustomerModal(customerSearchInput)}
                      startIcon={<PersonAddIcon sx={{ fontSize: 16 }} />}
                      sx={{
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        height: 40,
                        px: 1.5,
                        fontWeight: 700,
                        bgcolor: '#3B5BDB',
                        textTransform: 'none',
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: '#2B44B8' }
                      }}
                    >
                      <Box component="span" sx={{ display: { xs: 'none', xl: 'inline' } }}>+ Customer</Box>
                      <Box component="span" sx={{ display: { xs: 'inline', xl: 'none' } }}>+ New</Box>
                    </Button>
                  </Tooltip>
                </Box>
              )}
            </Box>

            {/* Cart Items List */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 1.5, pr: 0.5 }}>
              {cart.items.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: { xs: 2, lg: 3 }, color: '#9CA3AF' }}>
                  <ScannerIcon sx={{ fontSize: { xs: 36, lg: 44 }, mb: 0.5, color: '#CBD5E1' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center', px: 1 }}>
                    Cart is empty. Scan items or click products to bill.
                  </Typography>
                </Box>
              ) : (
                cart.items.map((item) => {
                  const itemUnit = item.unit || 'PCS';
                  const unitMeta = getUnitMeta(itemUnit);
                  const isWeighed = isWeighedOrMeasured(itemUnit);
                  const step = unitMeta.step || (isWeighed ? 0.25 : 1);
                  const maxStock = item.stockQuantity !== undefined ? parseFloat(item.stockQuantity) : 999999;
                  const isAtMax = item.quantity >= maxStock;

                  return (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 1,
                        borderBottom: '1px solid #F1F5F9'
                      }}
                    >
                      <Box sx={{ flexGrow: 1, pr: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1F2937', noWrap: true }}>
                            {item.name}
                          </Typography>
                          <Chip
                            label={itemUnit}
                            size="small"
                            sx={{
                              height: 16,
                              fontSize: 9,
                              fontWeight: 800,
                              bgcolor: ['KG', 'GM'].includes(itemUnit) ? '#EBFBEE' : (['LTR', 'ML'].includes(itemUnit) ? '#E0F2FE' : '#F1F5F9'),
                              color: ['KG', 'GM'].includes(itemUnit) ? '#2B8A3E' : (['LTR', 'ML'].includes(itemUnit) ? '#0284C7' : '#475569')
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#6B7280', display: 'block' }}>
                          ₹{item.rate.toFixed(2)}/{unitMeta.short} + GST {item.taxPercent}%
                          {item.stockQuantity !== undefined && item.stockQuantity < 99999 && (
                            <span style={{ marginLeft: 6, color: isAtMax ? '#D9480F' : '#6B7280', fontWeight: 600 }}>
                              (Max: {formatQtyWithUnit(item.stockQuantity, itemUnit)})
                            </span>
                          )}
                        </Typography>
                      </Box>

                      {/* Stepper Buttons with UoM support */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1.5, flexShrink: 0 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const nextQty = parseFloat((item.quantity - step).toFixed(3));
                            dispatch(updateQuantity({ id: item.id, quantity: nextQty }));
                          }}
                          sx={{ bgcolor: '#F1F5F9', p: 0.5 }}
                        >
                          <RemoveIcon sx={{ fontSize: 14 }} />
                        </IconButton>

                        <Tooltip title={isWeighed ? "Click to set precise scale weight or volume" : "Click to edit quantity"}>
                          <Chip
                            label={`${formatQuantity(item.quantity, itemUnit)} ${unitMeta.short}`}
                            onClick={() => handleEditCartItemWeight(item)}
                            size="small"
                            icon={isWeighed ? <ScaleIcon sx={{ fontSize: '13px !important' }} /> : undefined}
                            sx={{
                              fontWeight: 700,
                              fontSize: 11,
                              cursor: 'pointer',
                              bgcolor: isWeighed ? '#EEF2FF' : '#F8FAFC',
                              color: isWeighed ? '#3B5BDB' : '#1E293B',
                              border: '1px solid',
                              borderColor: isWeighed ? '#C7D2FE' : '#E2E8F0',
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                bgcolor: '#E0E7FF',
                                borderColor: '#3B5BDB'
                              }
                            }}
                          />
                        </Tooltip>

                        <IconButton
                          size="small"
                          disabled={isAtMax}
                          onClick={() => {
                            if (isAtMax) {
                              setToast({
                                open: true,
                                message: `Limit reached: Only ${formatQtyWithUnit(maxStock, itemUnit)} available for "${item.name}"!`,
                                severity: 'warning'
                              });
                              return;
                            }
                            const nextQty = parseFloat((item.quantity + step).toFixed(3));
                            dispatch(updateQuantity({ id: item.id, quantity: Math.min(nextQty, maxStock) }));
                          }}
                          sx={{
                            bgcolor: isAtMax ? '#F1F5F9' : '#EEF2FF',
                            color: isAtMax ? '#9CA3AF' : '#3B5BDB',
                            p: 0.5
                          }}
                        >
                          <AddIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>

                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1F2937', minWidth: 64, textAlign: 'right' }}>
                        ₹{item.amount.toFixed(2)}
                      </Typography>

                      <IconButton size="small" onClick={() => dispatch(removeItem(item.id))} sx={{ color: '#EF4444', ml: 0.5 }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  );
                })
              )}
            </Box>

            {/* Tax & Financial Summary */}
            <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, mb: 1.5, border: '1px solid #E3E8EF' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Taxable Subtotal</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>₹{cart.subtotal.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">CGST</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>₹{cart.cgst.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">SGST</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>₹{cart.sgst.toFixed(2)}</Typography>
              </Box>
              {cart.roundOff !== 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Round Off</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>₹{cart.roundOff.toFixed(2)}</Typography>
                </Box>
              )}
              <Divider sx={{ my: 0.8 }} />
              {/* Grand Total */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  Grand Total
                </Typography>
                <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#2563EB', lineHeight: 1.1, letterSpacing: -0.5 }}>
                  ₹{cart.grandTotal.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            {/* Payment Mode Selector */}
            <Box sx={{ mb: 1.5 }}>
              <ButtonGroup fullWidth size="medium">
                <Button
                  variant={cart.paymentMode === 0 ? 'contained' : 'outlined'}
                  color="primary"
                  startIcon={<CashIcon />}
                  onClick={() => dispatch(setPaymentMode(0))}
                  sx={{ py: 0.9, fontWeight: 700, borderRadius: '8px 0 0 8px' }}
                >
                  CASH (F10)
                </Button>
                <Button
                  variant={cart.paymentMode === 1 ? 'contained' : 'outlined'}
                  color="primary"
                  startIcon={<QrIcon />}
                  onClick={() => dispatch(setPaymentMode(1))}
                  sx={{ py: 0.9, fontWeight: 700, borderRadius: '0 8px 8px 0' }}
                >
                  UPI / QR (F10)
                </Button>
              </ButtonGroup>

              {/* Cash Change Calculator & Quick Tender Pills */}
              {cart.paymentMode === 0 && (
                <Box sx={{ mt: 1 }}>
                  {cart.grandTotal > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.8, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        Quick Tender:
                      </Typography>
                      {[
                        { label: `Exact (₹${Math.ceil(cart.grandTotal)})`, val: Math.ceil(cart.grandTotal) },
                        ...[50, 100, 200, 500, 1000, 2000]
                          .filter(amt => amt >= Math.ceil(cart.grandTotal))
                          .slice(0, 3)
                          .map(amt => ({ label: `₹${amt}`, val: amt }))
                      ].map((chip, idx) => (
                        <Chip
                          key={idx}
                          clickable
                          size="small"
                          label={chip.label}
                          onClick={() => dispatch(setCashReceived(chip.val))}
                          sx={{
                            fontWeight: 700,
                            fontSize: 11,
                            bgcolor: cart.amountReceived === chip.val ? '#3B5BDB' : '#F1F5F9',
                            color: cart.amountReceived === chip.val ? '#FFFFFF' : '#334155',
                            border: '1px solid',
                            borderColor: cart.amountReceived === chip.val ? '#2563EB' : '#E2E8F0',
                            '&:hover': { bgcolor: cart.amountReceived === chip.val ? '#2563EB' : '#E2E8F0' }
                          }}
                        />
                      ))}
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Cash Received (₹)"
                      type="number"
                      value={cart.amountReceived || ''}
                      onChange={(e) => dispatch(setCashReceived(parseFloat(e.target.value) || 0))}
                      sx={{ flex: 1, minWidth: 0 }}
                    />
                    <Box sx={{ flexShrink: 0, minWidth: 100, textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Change Due</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#2F9E44' }}>
                        ₹{cart.changeDue.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* UPI Real QR Code */}
              {cart.paymentMode === 1 && (
                <Box sx={{ mt: 1, p: 2, bgcolor: '#EEF2FF', borderRadius: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#3B5BDB', mb: 0.5 }}>Scan to Pay ₹{cart.grandTotal.toFixed(2)}</Typography>
                  <Box sx={{ p: 1.5, bgcolor: '#FFFFFF', borderRadius: 1, border: '2px solid #3B5BDB', display: 'inline-flex' }}>
                    <QRCodeSVG
                      value={`upi://pay?pa=store@upi&pn=DailyMart&am=${cart.grandTotal.toFixed(2)}&cu=INR&tn=POS+Invoice`}
                      size={130}
                      level="M"
                      includeMargin={false}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#6B7280', textAlign: 'center' }}>Scan via GPay / PhonePe / Paytm / Any UPI App</Typography>
                  <Button
                    size="small"
                    variant={cart.isPaymentReceived ? 'contained' : 'outlined'}
                    color={cart.isPaymentReceived ? 'success' : 'primary'}
                    onClick={() => dispatch(setIsPaymentReceived(!cart.isPaymentReceived))}
                    sx={{ mt: 0.5, fontWeight: 700, fontSize: 12, borderRadius: 1.5 }}
                  >
                    {cart.isPaymentReceived ? '✓ Payment Received' : 'Mark Payment Received'}
                  </Button>
                </Box>
              )}
            </Box>

            {/* Action Buttons: Hold (F8) and Generate Invoice (F9) */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Tooltip title="Hold current cart as temporary bucket (F8)">
                <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                  <Button
                    variant="outlined"
                    color="warning"
                    disabled={cart.items.length === 0}
                    startIcon={<HoldIcon />}
                    onClick={handleHoldBucket}
                    sx={{
                      height: 48,
                      px: 2,
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 2,
                      borderColor: '#F59F00',
                      color: '#D9480F',
                      whiteSpace: 'nowrap',
                      '&:hover': { bgcolor: '#FFF9DB', borderColor: '#E67700' }
                    }}
                  >
                    Hold (F8)
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Generate invoice and complete billing (F9)">
                <span style={{ display: 'inline-flex', flex: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    disabled={cart.items.length === 0}
                    startIcon={<PayIcon />}
                    onClick={handleCheckout}
                    sx={{
                      height: 48,
                      fontSize: '1rem',
                      fontWeight: 800,
                      borderRadius: 2,
                      bgcolor: '#2F9E44',
                      boxShadow: '0 4px 14px rgba(47, 158, 68, 0.3)',
                      '&:hover': { bgcolor: '#237B34' },
                      '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' }
                    }}
                  >
                    GENERATE INVOICE (F9)
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Camera Barcode / QR Scanner Dialog */}
      <BarcodeScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleCameraScan}
      />

      {/* Invoice Success & WhatsApp Share Dialog */}
      {showSuccessDialog && createdInvoice && (
        <InvoiceSuccessDialog
          open={showSuccessDialog}
          invoice={createdInvoice}
          onClose={async () => {
            setShowSuccessDialog(false);
            const refreshed = await productService.getProducts({
              categoryId: selectedCategory,
              searchTerm: searchQuery
            });
            setProducts(refreshed);
          }}
        />
      )}

      {/* Held Buckets Management Dialog */}
      <Dialog
        open={heldBucketsDialogOpen}
        onClose={() => setHeldBucketsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Held Buckets ({heldBuckets.length})</span>
          <Typography variant="caption" sx={{ color: '#6B7280' }}>
            Select any bucket to resume billing
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          {heldBuckets.length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 4, color: '#6B7280' }}>
              No buckets currently on hold.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {heldBuckets.map((hb) => (
                <Paper
                  key={hb.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderColor: '#FFE066',
                    bgcolor: '#FFFDF5',
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: '#F59F00', boxShadow: '0 4px 12px rgba(245, 159, 0, 0.15)' }
                  }}
                >
                  <Box sx={{ pr: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                      <Chip label={hb.bucketNumber} size="small" sx={{ fontWeight: 700, bgcolor: '#F59F00', color: 'white' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1F2937' }}>
                        {hb.customerName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                        {hb.timestamp}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#4B5563' }}>
                      {hb.itemsCount} item(s) • Total: <strong>₹{Number(hb.total || 0).toFixed(2)}</strong>
                    </Typography>
                    {hb.cartData?.items && hb.cartData.items.length > 0 && (
                      <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mt: 0.5 }}>
                        {hb.cartData.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<RestoreIcon />}
                      onClick={() => {
                        handleSelectBucket(hb);
                        setHeldBucketsDialogOpen(false);
                      }}
                      sx={{ bgcolor: '#3B5BDB', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#2B44B8' } }}
                    >
                      Resume Cart
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      title="Discard Bucket"
                      onClick={async () => {
                        dispatch(removeHeldBucket(hb.id));
                        await bucketService.deleteBucket(hb.id);
                        setToast({ open: true, message: `Discarded ${hb.bucketNumber}`, severity: 'info' });
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          {heldBuckets.length > 0 ? (
            <Button
              color="error"
              size="small"
              onClick={async () => {
                heldBuckets.forEach(b => bucketService.deleteBucket(b.id));
                dispatch(clearAllHeldBuckets());
                setHeldBucketsDialogOpen(false);
                setToast({ open: true, message: 'All held buckets cleared', severity: 'info' });
              }}
            >
              Clear All Held
            </Button>
          ) : <Box />}
          <Button onClick={() => setHeldBucketsDialogOpen(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add New Customer Dialog */}
      <Dialog
        open={addCustomerDialogOpen}
        onClose={() => setAddCustomerDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddIcon sx={{ color: '#3B5BDB' }} />
          <span>Register New Customer</span>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="caption" sx={{ color: '#6B7280', mt: -0.5 }}>
            Add customer details to associate with this bill and track loyalty rewards.
          </Typography>

          <TextField
            autoFocus
            required
            size="small"
            label="Customer Full Name"
            placeholder="e.g. Ramesh Kumar"
            value={newCustomerForm.name}
            onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
            fullWidth
          />

          <TextField
            required
            size="small"
            label="Mobile Number (10 digits)"
            placeholder="e.g. 9876543210"
            value={newCustomerForm.mobileNumber}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
              setNewCustomerForm({ ...newCustomerForm, mobileNumber: val });
            }}
            fullWidth
            InputProps={{
              startAdornment: <InputAdornment position="start">+91</InputAdornment>
            }}
          />

          <FormControl size="small" fullWidth>
            <InputLabel>State (Place of Supply)</InputLabel>
            <Select
              label="State (Place of Supply)"
              value={newCustomerForm.state}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, state: e.target.value })}
            >
              {[
                'Maharashtra',
                'Andhra Pradesh',
                'Delhi',
                'Goa',
                'Gujarat',
                'Karnataka',
                'Kerala',
                'Madhya Pradesh',
                'Punjab',
                'Rajasthan',
                'Tamil Nadu',
                'Telangana',
                'Uttar Pradesh',
                'West Bengal',
                'Other'
              ].map((st) => (
                <MenuItem key={st} value={st}>{st}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="GSTIN (Optional, for B2B billing)"
            placeholder="e.g. 27AABCZ1234P1ZR"
            value={newCustomerForm.gstin}
            onChange={(e) => setNewCustomerForm({ ...newCustomerForm, gstin: e.target.value.toUpperCase() })}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddCustomerDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveNewCustomer}
            sx={{ bgcolor: '#3B5BDB', fontWeight: 700, '&:hover': { bgcolor: '#2B44B8' } }}
          >
            Save & Select
          </Button>
        </DialogActions>
      </Dialog>

      {/* POS Keyboard Shortcuts Cheat Sheet Dialog (F1) */}
      <Dialog
        open={shortcutsDialogOpen}
        onClose={() => setShortcutsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <KeyboardIcon sx={{ color: '#3B5BDB' }} />
            <span>POS Keyboard Shortcuts</span>
          </Box>
          <Chip label="Cheat Sheet" size="small" sx={{ fontWeight: 700, bgcolor: '#EEF2FF', color: '#3B5BDB' }} />
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
            Use these global keyboard shortcuts for fast, hands-on-keyboard supermarket checkout:
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            {[
              { key: 'F1', desc: 'Open / Close Shortcuts Help' },
              { key: 'F2', desc: 'Focus Barcode & Product Search' },
              { key: 'F4', desc: 'Focus Customer Search' },
              { key: 'Shift + F4', desc: 'Register New Customer' },
              { key: 'F7', desc: 'View Held Buckets' },
              { key: 'F8', desc: 'Hold Current Bucket / Cart' },
              { key: 'F9', desc: 'Generate Invoice & Checkout' },
              { key: 'F10', desc: 'Toggle Payment (Cash / UPI)' },
              { key: 'Alt + C', desc: 'Clear Current Cart' },
              { key: 'Esc', desc: 'Close Dialogs / Clear Search' },
            ].map((sc) => (
              <Box
                key={sc.key}
                sx={{
                  p: 1.2,
                  bgcolor: '#F8FAFC',
                  borderRadius: 1.5,
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600, fontSize: 13 }}>
                  {sc.desc}
                </Typography>
                <Chip
                  label={sc.key}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    bgcolor: '#FFFFFF',
                    color: '#3B5BDB',
                    border: '1px solid #CBD5E1',
                    fontSize: 11
                  }}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShortcutsDialogOpen(false)} variant="contained" sx={{ bgcolor: '#3B5BDB' }}>
            Got It
          </Button>
        </DialogActions>
      </Dialog>

      {/* Weigh & Measure Dialog */}
      <WeightModal
        open={weightModalState.open}
        onClose={handleCloseWeightModal}
        product={weightModalState.product}
        currentQty={weightModalState.currentQty}
        onConfirm={handleConfirmWeight}
      />

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
