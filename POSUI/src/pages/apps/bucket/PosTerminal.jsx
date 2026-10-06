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
  Tooltip
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
  QrCode2 as QrIcon,
  Payments as CashIcon,
  ClearAll as ClearIcon,
  CameraAlt as CameraIcon,
  RestorePage as RestoreIcon,
  Layers as LayersIcon
} from '@mui/icons-material';

import {
  addItem,
  updateQuantity,
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
import InvoiceSuccessDialog from '../invoice/InvoiceSuccessDialog';
import BarcodeScannerDialog from './BarcodeScannerDialog';

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

  const barcodeInputRef = useRef(null);

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

  // Global Keyboard Shortcuts (F2: search, F8: hold, F9: pay)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldBucket();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleCheckout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  // Stock-aware product adder
  const handleAddProductWithStockCheck = (product) => {
    if (!product) return false;

    // Expiry check
    if (product.IsExpDate && product.Days <= 0) {
      setToast({ open: true, message: `Blocked: "${product.Name}" batch has expired!`, severity: 'error' });
      return false;
    }

    const stock = product.StockQuantity !== undefined ? parseInt(product.StockQuantity, 10) : 999999;
    if (stock <= 0) {
      setToast({ open: true, message: `Blocked: "${product.Name}" is Out of Stock! (0 units available)`, severity: 'error' });
      return false;
    }

    const productId = String(product.Id || product.id || product.ProductNumber || '');
    const productNum = String(product.ProductNumber || product.productNumber || '');
    const inCart = cart.items.find(i => String(i.id) === productId || (productNum && String(i.productNumber) === productNum));
    const currentCartQty = inCart ? inCart.quantity : 0;

    if (currentCartQty >= stock) {
      setToast({
        open: true,
        message: `Stock limit reached: Only ${stock} unit(s) of "${product.Name}" available in inventory!`,
        severity: 'warning'
      });
      return false;
    }

    dispatch(addItem(product));
    setToast({
      open: true,
      message: `Added: ${product.Name} (${currentCartQty + 1}/${stock} in bucket)`,
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
        if (handleAddProductWithStockCheck(matched)) {
          setSearchQuery('');
        }
      } else {
        // If not exact barcode, check first product match
        if (products.length > 0) {
          if (handleAddProductWithStockCheck(products[0])) {
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
      handleAddProductWithStockCheck(matched);
    } else {
      setToast({ open: true, message: `No product found for scanned code: "${cleanCode}"`, severity: 'warning' });
    }
  };

  // Add Product Card click
  const handleProductCardClick = (product) => {
    handleAddProductWithStockCheck(product);
  };

  // Customer Mobile Lookup
  const handleCustomerMobileChange = async (e) => {
    const mobile = e.target.value;
    dispatch(setCustomer({ mobileNumber: mobile }));
    if (mobile.length === 10) {
      const found = await customerService.getCustomerByMobile(mobile);
      if (found) {
        dispatch(setCustomer({ name: found.Name, state: found.State, gstin: found.GstNumber }));
        setToast({ open: true, message: `Customer Found: ${found.Name}`, severity: 'info' });
      }
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
  const handleHoldBucket = () => {
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
    dispatch(clearCart());
    setToast({ open: true, message: `Bucket held as ${newHold.bucketNumber} for ${custName}`, severity: 'info' });
  };

  // Select / Restore Held Bucket
  const handleSelectBucket = (hb) => {
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
      setToast({ open: true, message: `Current cart held as ${autoNum}. Switched to ${hb.bucketNumber} (${hb.customerName})`, severity: 'info' });
    } else {
      setToast({ open: true, message: `Loaded ${hb.bucketNumber} (${hb.customerName})`, severity: 'success' });
    }

    dispatch(loadBucket(hb.cartData));
    dispatch(removeHeldBucket(hb.id));
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
    <Box sx={{ height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* ========================================================= */}
        {/* LEFT PANE (60%): PRODUCT DISCOVERY & BARCODE SCANNER       */}
        {/* ========================================================= */}
        <Grid item xs={12} md={7} lg={7.5} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <TextField
                inputRef={barcodeInputRef}
                fullWidth
                size="medium"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleBarcodeSubmit}
                placeholder="Scan barcode, QR, or search product (Press F2 to focus)..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconButton
                        size="small"
                        onClick={() => setScannerOpen(true)}
                        title="Open Camera Scanner"
                        sx={{ color: '#3B5BDB', '&:hover': { bgcolor: '#EEF2FF' } }}
                      >
                        <ScannerIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Chip label="F2" size="small" sx={{ fontWeight: 600, bgcolor: '#EEF2FF', color: '#3B5BDB' }} />
                    </InputAdornment>
                  )
                }}
              />
              <Button
                variant="contained"
                startIcon={<CameraIcon />}
                onClick={() => setScannerOpen(true)}
                sx={{
                  height: 52,
                  px: 2.5,
                  whiteSpace: 'nowrap',
                  bgcolor: '#3B5BDB',
                  color: 'white',
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(59,91,219,0.25)',
                  '&:hover': { bgcolor: '#2B44B8' }
                }}
              >
                Scan Camera
              </Button>
            </Box>

            {/* Category Filter Chips */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto', pb: 0.5 }}>
              {categories.map((cat) => (
                <Chip
                  key={cat.Id}
                  label={cat.Name}
                  clickable
                  color={selectedCategory === cat.Id ? 'primary' : 'default'}
                  onClick={() => setSelectedCategory(cat.Id)}
                  sx={{
                    fontWeight: 500,
                    px: 0.5,
                    bgcolor: selectedCategory === cat.Id ? '#3B5BDB' : '#F1F5F9',
                    color: selectedCategory === cat.Id ? '#FFFFFF' : '#4B5563'
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
                  <Grid item xs={6} sm={4} md={3} key={prod.Id}>
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
                        transition: 'all 0.15s ease',
                        border: isOutOfStock ? '1px dashed #CBD5E1' : (isMaxInCart ? '1px solid #FFE066' : '1px solid #E3E8EF'),
                        '&:hover': {
                          transform: isOutOfStock ? 'none' : 'translateY(-2px)',
                          boxShadow: isOutOfStock ? 'none' : '0 4px 12px rgba(59, 91, 219, 0.15)',
                          borderColor: isOutOfStock ? '#CBD5E1' : '#3B5BDB'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 1.5, pb: '12px !important' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: isOutOfStock ? '#9CA3AF' : '#1F2937', fontSize: 13, minHeight: 36 }}>
                            {prod.Name}
                          </Typography>
                          {prod.IsExpDate && (
                            <Chip
                              label={`${prod.Days}d`}
                              size="small"
                              sx={{ height: 18, fontSize: 10, bgcolor: '#FFF9DB', color: '#D9480F', fontWeight: 600 }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 1 }}>
                          Barcode: {prod.ProductNumber}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: isOutOfStock ? '#9CA3AF' : '#3B5BDB' }}>
                            ₹{prod.Cost.toFixed(2)}
                          </Typography>
                          {isOutOfStock ? (
                            <Chip
                              label="Out of Stock"
                              size="small"
                              sx={{ height: 20, fontSize: 10, bgcolor: '#FFE3E3', color: '#E03131', fontWeight: 700 }}
                            />
                          ) : (
                            <Chip
                              label={isMaxInCart ? `All ${prod.StockQuantity} in Cart` : `Stock: ${prod.StockQuantity}`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: 11,
                                bgcolor: isMaxInCart ? '#FFF9DB' : '#EBFBEE',
                                color: isMaxInCart ? '#D9480F' : '#2F9E44',
                                fontWeight: 600
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
            {/* Held Buckets Row (Tabs) */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', alignItems: 'center', py: 0.5 }}>
                <Chip
                  label={`Active Cart (${cart.items.length})`}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 700, bgcolor: '#3B5BDB' }}
                />
                {heldBuckets.map((hb) => (
                  <Tooltip key={hb.id} title={`Click to select & resume ${hb.bucketNumber} (${hb.customerName})`}>
                    <Chip
                      clickable
                      icon={<RestoreIcon sx={{ fontSize: '16px !important', color: '#D9480F !important' }} />}
                      label={`${hb.bucketNumber}: ${hb.customerName} (₹${hb.total})`}
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
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {heldBuckets.length > 0 && (
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    onClick={() => setHeldBucketsDialogOpen(true)}
                    startIcon={<LayersIcon />}
                    sx={{
                      fontSize: 11,
                      py: 0.2,
                      px: 1,
                      fontWeight: 700,
                      bgcolor: '#F59F00',
                      '&:hover': { bgcolor: '#E67700' }
                    }}
                  >
                    Held ({heldBuckets.length})
                  </Button>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={handleHoldBucket}
                  startIcon={<HoldIcon />}
                  sx={{ fontSize: 11, py: 0.2 }}
                >
                  Hold (F8)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onClick={() => dispatch(clearCart())}
                  startIcon={<ClearIcon />}
                  sx={{ fontSize: 11, py: 0.2 }}
                >
                  Clear
                </Button>
              </Box>
            </Box>

            {/* Customer Lookup Bar */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5, p: 1, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E3E8EF', alignItems: 'center' }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Customer Mobile (10 digits)"
                value={cart.customer?.mobileNumber || ''}
                onChange={handleCustomerMobileChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><PersonIcon sx={{ fontSize: 18 }} /></InputAdornment>
                }}
              />
              <TextField
                size="small"
                fullWidth
                placeholder="Customer Name"
                value={cart.customer?.name || ''}
                onChange={(e) => dispatch(setCustomer({ name: e.target.value }))}
              />
              {(cart.customer?.mobileNumber || (cart.customer?.name && cart.customer?.name !== 'Walk-in Customer')) && (
                <IconButton
                  size="small"
                  title="Reset Customer to Walk-in"
                  onClick={() => dispatch(setCustomer({ name: 'Walk-in Customer', mobileNumber: '', gstin: '' }))}
                  sx={{ color: '#6B7280', p: 0.5 }}
                >
                  <ClearIcon sx={{ fontSize: 18 }} />
                </IconButton>
              )}
            </Box>

            {/* Cart Items List */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 1.5, pr: 0.5 }}>
              {cart.items.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 4, color: '#9CA3AF' }}>
                  <ScannerIcon sx={{ fontSize: 48, mb: 1, color: '#CBD5E1' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Cart is empty. Scan items or click products to bill.
                  </Typography>
                </Box>
              ) : (
                cart.items.map((item) => (
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
                    <Box sx={{ flexGrow: 1, pr: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1F2937' }}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6B7280' }}>
                        ₹{item.rate.toFixed(2)} + GST {item.taxPercent}%
                        {item.stockQuantity !== undefined && item.stockQuantity < 99999 && (
                          <span style={{ marginLeft: 6, color: item.quantity >= item.stockQuantity ? '#D9480F' : '#6B7280', fontWeight: 600 }}>
                            (Max: {item.stockQuantity})
                          </span>
                        )}
                      </Typography>
                    </Box>

                    {/* Stepper Buttons with stock limit enforcement */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}
                        sx={{ bgcolor: '#F1F5F9', p: 0.5 }}
                      >
                        <RemoveIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                        {item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        disabled={item.stockQuantity !== undefined && item.quantity >= item.stockQuantity}
                        onClick={() => {
                          const max = item.stockQuantity !== undefined ? item.stockQuantity : 999999;
                          if (item.quantity >= max) {
                            setToast({
                              open: true,
                              message: `Limit reached: Only ${max} unit(s) available for "${item.name}"!`,
                              severity: 'warning'
                            });
                            return;
                          }
                          dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }));
                        }}
                        sx={{
                          bgcolor: (item.stockQuantity !== undefined && item.quantity >= item.stockQuantity) ? '#F1F5F9' : '#EEF2FF',
                          color: (item.stockQuantity !== undefined && item.quantity >= item.stockQuantity) ? '#9CA3AF' : '#3B5BDB',
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
                ))
              )}
            </Box>

            {/* Tax & Financial Summary */}
            <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, mb: 1.5, border: '1px solid #E3E8EF' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Taxable Subtotal</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{cart.subtotal.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">CGST</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{cart.cgst.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">SGST</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{cart.sgst.toFixed(2)}</Typography>
              </Box>
              {cart.roundOff !== 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Round Off</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{cart.roundOff.toFixed(2)}</Typography>
                </Box>
              )}
              <Divider sx={{ my: 0.5 }} />
              {/* Grand Total in 32px bold as specified! */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1F2937' }}>
                  Grand Total
                </Typography>
                <Typography sx={{ fontSize: '32px', fontWeight: 700, color: '#3B5BDB', lineHeight: 1.1 }}>
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
                  sx={{ py: 1, fontWeight: 700 }}
                >
                  CASH
                </Button>
                <Button
                  variant={cart.paymentMode === 1 ? 'contained' : 'outlined'}
                  color="primary"
                  startIcon={<QrIcon />}
                  onClick={() => dispatch(setPaymentMode(1))}
                  sx={{ py: 1, fontWeight: 700 }}
                >
                  UPI / QR
                </Button>
              </ButtonGroup>

              {/* Cash Change Calculator */}
              {cart.paymentMode === 0 && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Cash Received (₹)"
                    type="number"
                    value={cart.amountReceived || ''}
                    onChange={(e) => dispatch(setCashReceived(parseFloat(e.target.value) || 0))}
                  />
                  <Box sx={{ minWidth: 130, textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Change Due</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#2F9E44' }}>
                      ₹{cart.changeDue.toFixed(2)}
                    </Typography>
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
                      size={140}
                      level="M"
                      includeMargin={false}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#6B7280', textAlign: 'center' }}>Scan via GPay / PhonePe / Paytm</Typography>
                  <Button
                    size="small"
                    variant={cart.isPaymentReceived ? 'contained' : 'outlined'}
                    color={cart.isPaymentReceived ? 'success' : 'primary'}
                    onClick={() => dispatch(setIsPaymentReceived(!cart.isPaymentReceived))}
                    sx={{ mt: 0.5, fontWeight: 700, fontSize: 12 }}
                  >
                    {cart.isPaymentReceived ? '✓ Payment Received' : 'Mark Payment Received'}
                  </Button>
                </Box>
              )}
            </Box>

            {/* Action Buttons: Hold (F8) and Generate Invoice (F9) */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<HoldIcon />}
                onClick={handleHoldBucket}
                sx={{ flex: 1, py: 1.2, fontWeight: 600 }}
              >
                Hold (F8)
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<PayIcon />}
                onClick={handleCheckout}
                sx={{ flex: 2, py: 1.2, fontSize: 16, fontWeight: 700, bgcolor: '#2F9E44', '&:hover': { bgcolor: '#237B34' } }}
              >
                GENERATE INVOICE (F9)
              </Button>
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
                      onClick={() => {
                        dispatch(removeHeldBucket(hb.id));
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
              onClick={() => {
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
