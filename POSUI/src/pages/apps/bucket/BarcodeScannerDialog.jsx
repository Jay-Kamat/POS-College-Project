import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Paper,
  Fade
} from '@mui/material';
import {
  Close as CloseIcon,
  Cameraswitch as CameraSwitchIcon,
  QrCodeScanner as QrIcon,
  CheckCircle as CheckIcon,
  VolumeUp as VolumeIcon,
  Replay as RetryIcon,
  FlashOn as FlashIcon
} from '@mui/icons-material';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// Audio feedback helper using Web Audio API
const playBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz high beep
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    // Ignore audio errors if context is blocked
  }
};

export default function BarcodeScannerDialog({ open, onClose, onScanSuccess, lastScannedInfo }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isContinuous, setIsContinuous] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentScan, setRecentScan] = useState(null);

  const scannerRef = useRef(null);
  const lastScannedCodeRef = useRef({ code: '', time: 0 });
  const containerId = 'pos-barcode-scanner-viewport';

  // Fetch available camera devices
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setCameraError(null);
    setRecentScan(null);

    async function initCameras() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (isMounted) {
          if (devices && devices.length > 0) {
            setCameras(devices);
            // Prefer back/rear camera if available
            const backCam = devices.find(d =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          } else {
            // No device list returned directly, will try default facingMode
            setSelectedCameraId('default');
          }
        }
      } catch (err) {
        console.warn('Could not list cameras, using default facingMode', err);
        if (isMounted) {
          setSelectedCameraId('default');
        }
      }
    }

    initCameras();

    return () => {
      isMounted = false;
    };
  }, [open]);

  // Start scanning when camera is selected and modal is open
  useEffect(() => {
    if (!open || !selectedCameraId) return;

    let isMounted = true;
    let activeScanner = null;

    async function startScanner() {
      // Short delay to ensure DOM element is mounted
      await new Promise(res => setTimeout(res, 300));
      if (!isMounted) return;

      const element = document.getElementById(containerId);
      if (!element) return;

      // Clean up any existing scanner instance
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
        scannerRef.current = null;
      }

      try {
        const scanner = new Html5Qrcode(containerId, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
          ]
        });

        activeScanner = scanner;
        scannerRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 200 },
          aspectRatio: 1.333
        };

        const cameraConfig = selectedCameraId === 'default'
          ? { facingMode: 'environment' }
          : { deviceId: { exact: selectedCameraId } };

        await scanner.start(
          cameraConfig,
          config,
          (decodedText, decodedResult) => {
            handleScanMatch(decodedText);
          },
          (errorMessage) => {
            // Frame error - continuous scanning noise, ignore
          }
        );

        if (isMounted) {
          setIsScanning(true);
          setCameraError(null);
        }
      } catch (err) {
        console.error('Failed to start camera scanner:', err);
        if (isMounted) {
          setIsScanning(false);
          setCameraError(
            err.message?.includes('Permission') || err.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera access in your browser address bar.'
              : 'Could not access camera. Please check camera connection or select a different device.'
          );
        }
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      if (activeScanner) {
        try {
          if (activeScanner.isScanning) {
            activeScanner.stop().catch(() => {});
          }
          activeScanner.clear().catch(() => {});
        } catch (e) {
          // Ignore
        }
      }
      setIsScanning(false);
    };
  }, [open, selectedCameraId]);

  // Handle scanned barcode
  const handleScanMatch = (decodedText) => {
    const raw = String(decodedText || '').trim();
    if (!raw) return;

    // Check debounce: ignore same code within 1.8 seconds
    const now = Date.now();
    if (lastScannedCodeRef.current.code === raw && now - lastScannedCodeRef.current.time < 1800) {
      return;
    }

    lastScannedCodeRef.current = { code: raw, time: now };

    if (soundEnabled) {
      playBeep();
    }

    setRecentScan({
      code: raw,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });

    if (onScanSuccess) {
      onScanSuccess(raw);
    }

    // If single-scan mode, close modal
    if (!isContinuous) {
      handleClose();
    }
  };

  const handleClose = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner on close:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    onClose();
  };

  // Sample quick barcodes for convenient testing
  const sampleBarcodes = [
    { label: 'Cow Milk (Dairy)', code: '200100101001' },
    { label: 'Wheat Bread (Bakery)', code: '200100102002' },
    { label: 'Cold Coffee (Beverage)', code: '200100103003' },
    { label: 'Basmati Rice (Staples)', code: '200100104004' }
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
        }
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: '#1E293B',
          color: 'white',
          py: 1.5,
          px: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <QrIcon sx={{ color: '#60A5FA', fontSize: 26 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Camera Barcode & QR Scanner
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
              Point camera at product barcode or UPI QR
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ color: '#94A3B8', '&:hover': { color: 'white' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, bgcolor: '#0F172A', color: 'white' }}>
        {/* Camera Selector & Sound Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {cameras.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel sx={{ color: '#94A3B8' }}>Camera</InputLabel>
              <Select
                value={selectedCameraId}
                label="Camera"
                onChange={(e) => setSelectedCameraId(e.target.value)}
                sx={{
                  color: 'white',
                  bgcolor: '#1E293B',
                  borderRadius: 1.5,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#60A5FA' },
                  '.MuiSvgIcon-root': { color: '#94A3B8' }
                }}
              >
                {cameras.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.label || `Camera ${c.id.slice(0, 5)}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isContinuous}
                  onChange={(e) => setIsContinuous(e.target.checked)}
                  size="small"
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#3B82F6' } }}
                />
              }
              label={<Typography variant="caption" sx={{ color: '#CBD5E1' }}>Continuous Scan</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  size="small"
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#10B981' } }}
                />
              }
              label={<Typography variant="caption" sx={{ color: '#CBD5E1' }}>Beep</Typography>}
            />
          </Box>
        </Box>

        {/* Camera Error Alert */}
        {cameraError && (
          <Alert
            severity="warning"
            sx={{ mb: 2, bgcolor: '#451A03', color: '#FDBA74', '& .MuiAlert-icon': { color: '#FB923C' } }}
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<RetryIcon />}
                onClick={() => setSelectedCameraId(prev => prev === 'default' ? '' : 'default')}
              >
                Retry
              </Button>
            }
          >
            {cameraError}
          </Alert>
        )}

        {/* Viewfinder Area */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            minHeight: 280,
            bgcolor: '#000000',
            borderRadius: 2.5,
            overflow: 'hidden',
            border: '2px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
          }}
        >
          {/* HTML5 QR Code Mount Node */}
          <Box
            id={containerId}
            sx={{
              width: '100%',
              '& video': {
                width: '100% !important',
                height: 'auto !important',
                maxHeight: '340px !important',
                borderRadius: '8px',
                objectFit: 'cover'
              },
              '& #qr-shaded-region': {
                borderWidth: '30px !important'
              }
            }}
          />

          {/* Loading Overlay */}
          {!isScanning && !cameraError && (
            <Box
              sx={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.5,
                color: '#94A3B8'
              }}
            >
              <CircularProgress size={36} sx={{ color: '#3B82F6' }} />
              <Typography variant="body2">Starting camera feed...</Typography>
            </Box>
          )}

          {/* Viewfinder Target Reticle Animation */}
          {isScanning && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Box
                sx={{
                  width: 250,
                  height: 160,
                  border: '2px dashed rgba(59, 130, 246, 0.7)',
                  borderRadius: 2,
                  boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    bgcolor: '#38BDF8',
                    boxShadow: '0 0 8px #38BDF8',
                    animation: 'scanLine 2s infinite ease-in-out'
                  },
                  '@keyframes scanLine': {
                    '0%': { top: '0%' },
                    '50%': { top: '98%' },
                    '100%': { top: '0%' }
                  }
                }}
              />
            </Box>
          )}
        </Box>

        {/* Last Scanned Feedback Banner */}
        {recentScan && (
          <Fade in={Boolean(recentScan)}>
            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 1.5,
                bgcolor: '#064E3B',
                color: '#6EE7B7',
                borderRadius: 2,
                border: '1px solid #059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon sx={{ color: '#10B981' }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'white' }}>
                    Scanned: {recentScan.code}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#A7F3D0' }}>
                    Added to cart at {recentScan.time}
                  </Typography>
                </Box>
              </Box>
              <Chip label="Success" size="small" sx={{ bgcolor: '#10B981', color: 'white', fontWeight: 600 }} />
            </Paper>
          </Fade>
        )}

        {/* Quick Test Barcode Simulations */}
        <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #1E293B' }}>
          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1, fontWeight: 600 }}>
            QUICK SIMULATE BARCODE SCAN (Click to test):
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {sampleBarcodes.map((item) => (
              <Chip
                key={item.code}
                label={`${item.label} (${item.code})`}
                size="small"
                onClick={() => handleScanMatch(item.code)}
                sx={{
                  bgcolor: '#1E293B',
                  color: '#CBD5E1',
                  border: '1px solid #334155',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#2563EB', color: 'white', borderColor: '#2563EB' }
                }}
              />
            ))}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ bgcolor: '#1E293B', px: 2.5, py: 1.5, justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
          Supports QR, EAN-13, EAN-8, Code-128, UPC-A
        </Typography>
        <Button onClick={handleClose} variant="contained" sx={{ bgcolor: '#334155', color: 'white', '&:hover': { bgcolor: '#475569' } }}>
          Done / Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
