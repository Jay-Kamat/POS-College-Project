import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  ButtonGroup,
  IconButton,
  Divider,
  Alert,
  Paper,
  InputAdornment
} from '@mui/material';
import {
  Scale as ScaleIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Check as CheckIcon,
  Calculate as CalcIcon
} from '@mui/icons-material';
import {
  getUnitMeta,
  isWeighedOrMeasured,
  formatQuantity,
  formatQtyWithUnit,
  formatRatePerUnit
} from '../../../utils/uomHelper';

export default function WeightModal({
  open,
  onClose,
  product,
  currentQty = 0,
  onConfirm
}) {
  if (!product) return null;

  const unitCode = String(product.Unit || product.unit || 'PCS').toUpperCase();
  const unitMeta = getUnitMeta(unitCode);
  const isWeight = unitMeta.type === 'weight';
  const isVolume = unitMeta.type === 'volume';

  // Sub-unit mode: for KG default to KG, can switch to grams. For LTR default to LTR, can switch to ML.
  const [inputUnit, setInputUnit] = useState(unitCode); // 'KG' vs 'GM', or 'LTR' vs 'ML'
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const rate = parseFloat(product.Cost !== undefined ? product.Cost : (product.rate || product.cost || 0));
  const taxPercent = parseFloat(product.TaxPercent !== undefined ? product.TaxPercent : (product.taxPercent || 5));
  const stockAvailable = parseFloat(product.StockQuantity !== undefined ? product.StockQuantity : (product.stockQuantity || 999999));

  // Initialize or reset input value when modal opens
  useEffect(() => {
    if (open) {
      setInputUnit(unitCode);
      const initVal = currentQty > 0 ? currentQty : (unitMeta.allowDecimal ? 1.0 : 1);
      setInputValue(String(initVal));
      setErrorMsg('');
    }
  }, [open, product, currentQty, unitCode]);

  // Compute canonical quantity in product's base unit
  const computeBaseQuantity = () => {
    const raw = parseFloat(inputValue);
    if (isNaN(raw) || raw <= 0) return 0;

    if (unitCode === 'KG' && inputUnit === 'GM') {
      return parseFloat((raw / 1000).toFixed(3));
    }
    if (unitCode === 'LTR' && inputUnit === 'ML') {
      return parseFloat((raw / 1000).toFixed(3));
    }
    return parseFloat(raw.toFixed(3));
  };

  const canonicalQty = computeBaseQuantity();
  const lineBase = parseFloat((rate * canonicalQty).toFixed(2));
  const taxAmount = parseFloat(((lineBase * taxPercent) / 100).toFixed(2));
  const netTotal = parseFloat((lineBase + taxAmount).toFixed(2));

  const isOverStock = canonicalQty > stockAvailable;

  const handleApplyPreset = (presetVal, presetUnit = unitCode) => {
    setInputUnit(presetUnit);
    setInputValue(String(presetVal));
    setErrorMsg('');
  };

  const handleStep = (delta) => {
    const current = parseFloat(inputValue) || 0;
    const step = delta > 0 ? (unitMeta.step || 1) : -(unitMeta.step || 1);
    const nextVal = Math.max(unitMeta.minQty || 0.1, parseFloat((current + step).toFixed(3)));
    setInputValue(String(nextVal));
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (canonicalQty <= 0) {
      setErrorMsg('Please enter a valid quantity or weight greater than 0');
      return;
    }
    if (isOverStock) {
      setErrorMsg(`Cannot exceed available stock of ${formatQtyWithUnit(stockAvailable, unitCode)}`);
      return;
    }
    onConfirm(canonicalQty);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#F8FAFC' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScaleIcon sx={{ color: '#3B5BDB' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B', fontSize: 16 }}>
            {unitMeta.allowDecimal ? 'Weigh & Measure Product' : 'Set Product Quantity'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#94A3B8' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5 }}>
        {/* Product Card Info */}
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
              {product.Name || product.name}
            </Typography>
            <Chip
              label={unitCode}
              size="small"
              sx={{
                fontWeight: 800,
                fontSize: 10,
                bgcolor: ['KG', 'GM'].includes(unitCode) ? '#EBFBEE' : (['LTR', 'ML'].includes(unitCode) ? '#E0F2FE' : '#F1F5F9'),
                color: ['KG', 'GM'].includes(unitCode) ? '#2B8A3E' : (['LTR', 'ML'].includes(unitCode) ? '#0284C7' : '#475569')
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.8 }}>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Base Rate: <strong style={{ color: '#0F172A' }}>₹{rate.toFixed(2)}</strong> / {unitMeta.short}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: stockAvailable <= 5 ? '#E03131' : '#2F9E44' }}>
              Stock: {formatQtyWithUnit(stockAvailable, unitCode)}
            </Typography>
          </Box>
        </Paper>

        {/* Input Mode Selector (e.g. KG vs GM, LTR vs ML) */}
        {(unitCode === 'KG' || unitCode === 'LTR') && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <ButtonGroup size="small" sx={{ borderRadius: 2 }}>
              <Button
                variant={inputUnit === unitCode ? 'contained' : 'outlined'}
                onClick={() => {
                  if (inputUnit !== unitCode) {
                    const currentGrams = parseFloat(inputValue);
                    setInputUnit(unitCode);
                    if (!isNaN(currentGrams) && currentGrams > 0) {
                      setInputValue(String(parseFloat((currentGrams / 1000).toFixed(3))));
                    }
                  }
                }}
                sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}
              >
                {unitCode === 'KG' ? 'Kilograms (kg)' : 'Liters (L)'}
              </Button>
              <Button
                variant={inputUnit === (unitCode === 'KG' ? 'GM' : 'ML') ? 'contained' : 'outlined'}
                onClick={() => {
                  const sub = unitCode === 'KG' ? 'GM' : 'ML';
                  if (inputUnit !== sub) {
                    const currentKg = parseFloat(inputValue);
                    setInputUnit(sub);
                    if (!isNaN(currentKg) && currentKg > 0) {
                      setInputValue(String(Math.round(currentKg * 1000)));
                    }
                  }
                }}
                sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}
              >
                {unitCode === 'KG' ? 'Grams (g)' : 'Milliliters (ml)'}
              </Button>
            </ButtonGroup>
          </Box>
        )}

        {/* Quantity / Weight Input Field with stepper */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <IconButton
            onClick={() => handleStep(-1)}
            sx={{ bgcolor: '#F1F5F9', border: '1px solid #E2E8F0', p: 1 }}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>

          <TextField
            autoFocus
            fullWidth
            type="number"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setErrorMsg('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit(e);
            }}
            placeholder="0.00"
            inputProps={{
              step: inputUnit === 'GM' || inputUnit === 'ML' ? "10" : (unitMeta.allowDecimal ? "0.05" : "1"),
              min: "0.01",
              style: { textAlign: 'center', fontSize: '1.25rem', fontWeight: 800 }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#64748B' }}>
                    {inputUnit.toLowerCase()}
                  </Typography>
                </InputAdornment>
              )
            }}
          />

          <IconButton
            onClick={() => handleStep(1)}
            sx={{ bgcolor: '#EEF2FF', color: '#3B5BDB', border: '1px solid #C7D2FE', p: 1 }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Quick Weight Tender Buttons */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block', mb: 0.8 }}>
            Quick Tender Presets:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
            {unitCode === 'KG' && (
              <>
                <Chip label="100g" clickable onClick={() => handleApplyPreset(0.1, 'KG')} sx={{ fontWeight: 600 }} />
                <Chip label="250g" clickable onClick={() => handleApplyPreset(0.25, 'KG')} sx={{ fontWeight: 600 }} />
                <Chip label="500g" clickable onClick={() => handleApplyPreset(0.5, 'KG')} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                <Chip label="750g" clickable onClick={() => handleApplyPreset(0.75, 'KG')} sx={{ fontWeight: 600 }} />
                <Chip label="1 kg" clickable onClick={() => handleApplyPreset(1.0, 'KG')} color="primary" sx={{ fontWeight: 700 }} />
                <Chip label="1.5 kg" clickable onClick={() => handleApplyPreset(1.5, 'KG')} sx={{ fontWeight: 600 }} />
                <Chip label="2 kg" clickable onClick={() => handleApplyPreset(2.0, 'KG')} sx={{ fontWeight: 600 }} />
                <Chip label="5 kg" clickable onClick={() => handleApplyPreset(5.0, 'KG')} sx={{ fontWeight: 600 }} />
              </>
            )}
            {unitCode === 'LTR' && (
              <>
                <Chip label="200ml" clickable onClick={() => handleApplyPreset(0.2, 'LTR')} sx={{ fontWeight: 600 }} />
                <Chip label="500ml" clickable onClick={() => handleApplyPreset(0.5, 'LTR')} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                <Chip label="1 L" clickable onClick={() => handleApplyPreset(1.0, 'LTR')} color="primary" sx={{ fontWeight: 700 }} />
                <Chip label="1.5 L" clickable onClick={() => handleApplyPreset(1.5, 'LTR')} sx={{ fontWeight: 600 }} />
                <Chip label="2 L" clickable onClick={() => handleApplyPreset(2.0, 'LTR')} sx={{ fontWeight: 600 }} />
                <Chip label="5 L" clickable onClick={() => handleApplyPreset(5.0, 'LTR')} sx={{ fontWeight: 600 }} />
              </>
            )}
            {!['KG', 'LTR'].includes(unitCode) && (
              <>
                <Chip label="+1" clickable onClick={() => handleApplyPreset(1, unitCode)} color="primary" sx={{ fontWeight: 700 }} />
                <Chip label="+2" clickable onClick={() => handleApplyPreset(2, unitCode)} sx={{ fontWeight: 600 }} />
                <Chip label="+5" clickable onClick={() => handleApplyPreset(5, unitCode)} sx={{ fontWeight: 600 }} />
                <Chip label="+10" clickable onClick={() => handleApplyPreset(10, unitCode)} sx={{ fontWeight: 600 }} />
              </>
            )}
          </Box>
        </Box>

        {/* Live Calculation Box */}
        <Paper sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Measured Quantity:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
              {formatQtyWithUnit(canonicalQty, unitCode)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Taxable Value:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
              ₹{lineBase.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              GST ({taxPercent}%):
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
              ₹{taxAmount.toFixed(2)}
            </Typography>
          </Box>
          <Divider sx={{ my: 0.8 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>
              Total Payable:
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#3B5BDB', fontSize: '1.15rem' }}>
              ₹{netTotal.toFixed(2)}
            </Typography>
          </Box>
        </Paper>

        {isOverStock && (
          <Alert severity="error" sx={{ mt: 1.5, py: 0.5 }}>
            Stock limit exceeded! Only {formatQtyWithUnit(stockAvailable, unitCode)} available in inventory.
          </Alert>
        )}

        {errorMsg && (
          <Alert severity="warning" sx={{ mt: 1.5, py: 0.5 }}>
            {errorMsg}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1, bgcolor: '#F8FAFC' }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={canonicalQty <= 0 || isOverStock}
          startIcon={<CheckIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            bgcolor: '#3B5BDB',
            '&:hover': { bgcolor: '#2B44B8' }
          }}
        >
          {currentQty > 0 ? 'Update Cart' : `Add ${formatQtyWithUnit(canonicalQty, unitCode)} (₹${netTotal.toFixed(2)})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
