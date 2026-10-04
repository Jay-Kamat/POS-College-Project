import React, { useState, useEffect } from 'react';
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
  Alert
} from '@mui/material';
import {
  QrCodeScanner as InwardIcon,
  Print as PrintIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import purchaseOrderService from '../../../_api/purchaseOrderService';
import vendorService from '../../../_api/vendorService';
import materialInwardService from '../../../_api/materialInwardService';

const steps = ['Receipt Mode & PO', 'Verify Quantities & Expiry', 'Generate & Print Barcodes'];

export default function MaterialInward() {
  const [activeStep, setActiveStep] = useState(0);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  
  const [mode, setMode] = useState('with_po'); // 'with_po' | 'without_po'
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  
  const [inwardItems, setInwardItems] = useState([
    {
      ProductId: 'prd_01',
      ProductName: 'Cow Milk 500ml',
      OrderedQty: 100,
      ReceivedQty: 100,
      Rate: 26.00,
      ExpiryDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
    }
  ]);

  const [generatedInward, setGeneratedInward] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    async function loadData() {
      const pos = await purchaseOrderService.getPurchaseOrders();
      setPurchaseOrders(pos);
      const vnds = await vendorService.getVendors();
      setVendors(vnds);
    }
    loadData();
  }, []);

  const handlePoSelect = (poId) => {
    setSelectedPoId(poId);
    const po = purchaseOrders.find(p => p.Id === poId);
    if (po && po.Items) {
      setSelectedVendorId(po.VendorId);
      setInwardItems(po.Items.map(item => ({
        ProductId: item.ProductId,
        ProductName: item.ProductName,
        OrderedQty: item.Quantity,
        ReceivedQty: item.Quantity,
        Rate: item.Rate,
        ExpiryDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0]
      })));
    }
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      if (mode === 'with_po' && !selectedPoId) {
        setToast({ open: true, message: 'Please select a Purchase Order', severity: 'warning' });
        return;
      }
      setActiveStep(1);
    } else if (activeStep === 1) {
      // Create Inward Record and generate barcodes
      try {
        const result = await materialInwardService.createInward({
          PurchaseOrderId: mode === 'with_po' ? selectedPoId : null,
          VendorId: selectedVendorId || 'vnd_01',
          IsPoAvailable: mode === 'with_po',
          Items: inwardItems
        });
        setGeneratedInward(result);
        setActiveStep(2);
        setToast({ open: true, message: 'Barcodes generated successfully!', severity: 'success' });
      } catch (err) {
        setToast({ open: true, message: err.message, severity: 'error' });
      }
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setGeneratedInward(null);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" sx={{ fontWeight: 700 }}>
          Material Inward & Batch Barcoding
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Receive stock against Purchase Orders, derive batch expiry dates, and print barcode stickers.
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* STEP 1: PO & Mode Selection */}
        {activeStep === 0 && (
          <Box sx={{ maxWidth: 600, mx: 'auto', py: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Inward Mode</InputLabel>
              <Select value={mode} label="Inward Mode" onChange={(e) => setMode(e.target.value)}>
                <MenuItem value="with_po">Against a Purchase Order</MenuItem>
                <MenuItem value="without_po">Direct Inward Without PO</MenuItem>
              </Select>
            </FormControl>

            {mode === 'with_po' ? (
              <FormControl fullWidth margin="normal">
                <InputLabel>Select Purchase Order</InputLabel>
                <Select
                  value={selectedPoId}
                  label="Select Purchase Order"
                  onChange={(e) => handlePoSelect(e.target.value)}
                >
                  {purchaseOrders.map((po) => (
                    <MenuItem key={po.Id} value={po.Id}>
                      {po.DocumentNumber} - {po.VendorName} (₹{po.TotalAmount})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth margin="normal">
                <InputLabel>Select Supplier / Vendor</InputLabel>
                <Select
                  value={selectedVendorId}
                  label="Select Supplier / Vendor"
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                >
                  {vendors.map((vnd) => (
                    <MenuItem key={vnd.Id} value={vnd.Id}>
                      {vnd.Name} ({vnd.City})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="contained" color="primary" onClick={handleNext}>
                Continue to Verify Items
              </Button>
            </Box>
          </Box>
        )}

        {/* STEP 2: Items Table & Expiry */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              Verify Received Quantities & Batch Expiry
            </Typography>

            <TableContainer sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product Name</TableCell>
                    <TableCell align="center">Ordered Qty</TableCell>
                    <TableCell align="center">Received Qty</TableCell>
                    <TableCell align="right">Rate (₹)</TableCell>
                    <TableCell>Batch Expiry Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inwardItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontWeight: 600 }}>{item.ProductName}</TableCell>
                      <TableCell align="center">{item.OrderedQty}</TableCell>
                      <TableCell align="center">
                        <TextField
                          size="small"
                          type="number"
                          value={item.ReceivedQty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            const updated = [...inwardItems];
                            updated[idx].ReceivedQty = val;
                            setInwardItems(updated);
                          }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell align="right">₹{item.Rate.toFixed(2)}</TableCell>
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
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="outlined" onClick={() => setActiveStep(0)}>
                Back
              </Button>
              <Button variant="contained" color="primary" onClick={handleNext}>
                Generate Batch Barcodes
              </Button>
            </Box>
          </Box>
        )}

        {/* STEP 3: Printable Barcode Labels */}
        {activeStep === 2 && generatedInward && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SuccessIcon sx={{ color: '#2F9E44', fontSize: 32 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    Inward Recorded Successfully!
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review and print thermal barcode labels for shelf application.
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="contained"
                color="primary"
                startIcon={<PrintIcon />}
                onClick={() => window.print()}
              >
                Print Barcode Labels
              </Button>
            </Box>

            {/* Barcode Labels Preview Grid */}
            <Grid container spacing={2}>
              {generatedInward.Items.map((item, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <Card sx={{ p: 1.5, border: '2px solid #E3E8EF', textAlign: 'center', bgcolor: '#FFFFFF' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>
                      {item.ProductName}
                    </Typography>
                    <Box
                      sx={{
                        my: 1,
                        py: 1,
                        bgcolor: '#F8FAFC',
                        border: '1px dashed #CBD5E1',
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        letterSpacing: 3,
                        fontWeight: 700,
                        fontSize: 18
                      }}
                    >
                      ||| | | |||| || |||
                      <Typography variant="caption" sx={{ display: 'block', letterSpacing: 1, color: '#334155' }}>
                        {item.Barcode}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B7280' }}>
                      <span>Exp: {item.ExpiryDate}</span>
                      <span>MRP: ₹{(item.Rate * 1.3).toFixed(2)}</span>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
              <Button variant="outlined" onClick={handleReset}>
                Process Another Inward
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Toast Alert */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
