import express from 'express';
import cors from 'cors';
import QRCode from 'qrcode';

// ----------------------------------------------------
// 1. API Server on Port 2785
// ----------------------------------------------------
const apiApp = express();
const API_PORT = process.env.PORT || 2785;
const DASHBOARD_PORT = process.env.DASHBOARD_PORT || 2886;

apiApp.use(cors());
apiApp.use(express.json());

// In-memory gateway status state
let sessionState = {
  isReady: true,
  authenticated: true,
  phoneConnected: true,
  batteryPercent: 92,
  pairedNumber: "+91 98765 43210",
  lastMessageSent: null
};

// Health and Pairing Status Check
apiApp.get('/api/v1/session/status', (req, res) => {
  res.json({
    status: 'success',
    ...sessionState,
    timestamp: new Date().toISOString()
  });
});

// Send WhatsApp Message Endpoint
apiApp.post('/api/v1/messages/send-text', (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({
      status: 'error',
      errorCode: 'INVALID_PAYLOAD',
      message: 'Fields "to" and "message" are required.'
    });
  }

  // Format phone number
  const normalizedPhone = to.replace(/[^0-9]/g, '');
  const messageId = `wamid.${Date.now()}_${Math.random().toString(36).substring(7)}`;

  console.log(`[OpenWA :2785] Sending WhatsApp Receipt to +${normalizedPhone}`);
  console.log(`----------------------------------------`);
  console.log(message);
  console.log(`----------------------------------------`);

  sessionState.lastMessageSent = {
    to: normalizedPhone,
    timestamp: new Date().toISOString(),
    messageId
  };

  return res.json({
    status: 'success',
    messageId,
    timestamp: Math.floor(Date.now() / 1000)
  });
});

apiApp.listen(API_PORT, () => {
  console.log(`[OpenWA] WhatsApp REST API Gateway running on http://localhost:${API_PORT}`);
});

// ----------------------------------------------------
// 2. Dashboard Server on Port 2886 (QR Code Pairing UI)
// ----------------------------------------------------
const dashApp = express();
dashApp.use(cors());

dashApp.get('/', async (req, res) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(`whatsapp-link-pairing-${Date.now()}`);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OpenWA Gateway Dashboard</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F5F7FB; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .card { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); text-align: center; max-width: 420px; border: 1px solid #E3E8EF; }
          h2 { color: #1F2937; margin-bottom: 8px; }
          p { color: #6B7280; font-size: 14px; margin-top: 0; }
          .status { display: inline-block; padding: 6px 14px; background: #EBFBEE; color: #2F9E44; font-weight: 600; border-radius: 20px; font-size: 13px; margin-bottom: 20px; }
          .qr { margin: 16px 0; border: 1px solid #E3E8EF; border-radius: 8px; padding: 12px; display: inline-block; }
          .meta { font-size: 13px; color: #4B5563; background: #F8FAFC; padding: 12px; border-radius: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>OpenWA WhatsApp Gateway</h2>
          <p>Local communication engine for POS & Billing receipts</p>
          <div class="status">● Active & Paired (+91 98765 43210)</div>
          <div class="qr">
            <img src="${qrDataUrl}" alt="WhatsApp QR Code" width="200" height="200" />
          </div>
          <div class="meta">
            <div><strong>REST API Port:</strong> ${API_PORT}</div>
            <div><strong>Dashboard Port:</strong> ${DASHBOARD_PORT}</div>
            <div><strong>Battery Level:</strong> ${sessionState.batteryPercent}%</div>
            <div><strong>Last Message:</strong> ${sessionState.lastMessageSent ? sessionState.lastMessageSent.to : 'None yet'}</div>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Error generating QR dashboard");
  }
});

dashApp.listen(DASHBOARD_PORT, () => {
  console.log(`[OpenWA] WhatsApp Pairing Dashboard running on http://localhost:${DASHBOARD_PORT}`);
});
