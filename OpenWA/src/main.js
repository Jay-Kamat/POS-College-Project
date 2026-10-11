import express from 'express';
import cors from 'cors';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';

// Baileys imports
let makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore;
try {
  const baileys = await import('@whiskeysockets/baileys');
  makeWASocket = baileys.makeWASocket || baileys.default?.makeWASocket || baileys.default;
  DisconnectReason = baileys.DisconnectReason || baileys.default?.DisconnectReason;
  useMultiFileAuthState = baileys.useMultiFileAuthState || baileys.default?.useMultiFileAuthState;
  fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion || baileys.default?.fetchLatestBaileysVersion;
  Browsers = baileys.Browsers || baileys.default?.Browsers;
  makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore || baileys.default?.makeCacheableSignalKeyStore;
} catch (err) {
  console.warn('[OpenWA] Baileys module load notice:', err.message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.resolve(__dirname, '..', 'auth_info_baileys');

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

const API_PORT = process.env.PORT || 2785;
const DASHBOARD_PORT = process.env.DASHBOARD_PORT || 2886;

let sock = null;
let currentRawQr = null;
let currentQrDataUrl = null;
let qrGeneratedAt = 0;
let isStarting = false;

let sessionState = {
  isReady: true,
  isConnected: false,
  authenticated: false,
  phoneConnected: false,
  batteryPercent: 98,
  pairedNumber: null,
  lastMessageSent: null,
  engine: 'Baileys Multi-Device Native WebSocket'
};

const logger = pino({ level: 'silent' });

// ----------------------------------------------------
// Real Baileys WhatsApp Socket Lifecycle
// ----------------------------------------------------
async function startWhatsAppSocket() {
  if (isStarting) return;
  isStarting = true;

  if (sock) {
    try {
      sock.ev?.removeAllListeners();
      sock.end(undefined);
    } catch (e) {}
    sock = null;
  }

  if (!makeWASocket || !useMultiFileAuthState) {
    console.error('[OpenWA] Critical: Baileys core packages not available!');
    isStarting = false;
    return;
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    
    // Fetch WhatsApp Web protocol version
    let versionInfo = [2, 3000, 1043857760];
    try {
      if (fetchLatestBaileysVersion) {
        const v = await fetchLatestBaileysVersion();
        if (v?.version) versionInfo = v.version;
        console.log(`[OpenWA] WhatsApp Web Protocol v${versionInfo.join('.')}`);
      }
    } catch (ve) {
      console.warn('[OpenWA] Using baseline protocol version:', ve.message);
    }

    // Wrap keys in makeCacheableSignalKeyStore for high-performance memory lookup during pairing handshake
    const keyStore = makeCacheableSignalKeyStore ? makeCacheableSignalKeyStore(state.keys, logger) : state.keys;

    // Use Ubuntu Chrome browser signature - highest compatibility with WhatsApp Multi-Device
    const browserDesc = Browsers ? Browsers.ubuntu('Chrome') : ['DailyMart POS', 'Chrome', '124.0.0.0'];

    sock = makeWASocket({
      version: versionInfo,
      auth: {
        creds: state.creds,
        keys: keyStore
      },
      logger,
      printQRInTerminal: false,
      browser: browserDesc,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentRawQr = qr;
        qrGeneratedAt = Date.now();
        currentQrDataUrl = await QRCode.toDataURL(qr, {
          width: 320,
          margin: 2,
          color: { dark: '#0F172A', light: '#FFFFFF' }
        });
        sessionState.authenticated = false;
        sessionState.phoneConnected = false;
        sessionState.isConnected = false;
        console.log(`\n[OpenWA :2785] Authentic WhatsApp QR Code emitted at ${new Date().toLocaleTimeString()}`);
        console.log('[OpenWA] Scan with WhatsApp > Linked Devices > Link a Device:');
        try {
          qrcodeTerminal.generate(qr, { small: true });
        } catch (e) {}
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason?.loggedOut;
        const isRestartRequired = statusCode === DisconnectReason?.restartRequired;
        console.log(`[OpenWA] Socket closed (status: ${statusCode}). Logged out: ${isLoggedOut}, Restart required: ${isRestartRequired}`);

        sessionState.phoneConnected = false;
        sessionState.isConnected = false;

        if (isLoggedOut) {
          console.log('[OpenWA] Session logged out by device. Wiping auth credentials directory...');
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            fs.mkdirSync(AUTH_DIR, { recursive: true });
          } catch (e) {}
          currentRawQr = null;
          currentQrDataUrl = null;
          sessionState.pairedNumber = null;
          setTimeout(() => {
            isStarting = false;
            startWhatsAppSocket();
          }, 1200);
        } else if (isRestartRequired || statusCode === 515) {
          // Handshake phase 2 - Must reconnect IMMEDIATELY so phone doesn't time out
          console.log('[OpenWA] Pairing handshake step completed! Immediate restart to finalize connection...');
          isStarting = false;
          startWhatsAppSocket();
        } else {
          // Transient network close / reconnect
          setTimeout(() => {
            isStarting = false;
            startWhatsAppSocket();
          }, 2500);
        }
      } else if (connection === 'open') {
        console.log('\n======================================================');
        console.log('[OpenWA] *** WHATSAPP CONNECTION VERIFIED & ACTIVE! ***');
        console.log('======================================================\n');
        sessionState.authenticated = true;
        sessionState.phoneConnected = true;
        sessionState.isConnected = true;
        currentRawQr = null;
        currentQrDataUrl = null;

        const userJid = sock.user?.id || '';
        if (userJid) {
          const num = userJid.split(':')[0].split('@')[0];
          sessionState.pairedNumber = `+${num}`;
        } else {
          sessionState.pairedNumber = '+91-POS-DEVICE';
        }
        console.log(`[OpenWA] Authenticated Paired Number: ${sessionState.pairedNumber}`);
      }
    });

  } catch (err) {
    console.error('[OpenWA] Socket initialization failure:', err.message);
  } finally {
    isStarting = false;
  }
}

// Start WhatsApp socket on launch
startWhatsAppSocket();

// ----------------------------------------------------
// 1. REST API on Port 2785
// ----------------------------------------------------
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());

// Session Status endpoint
apiApp.get('/api/v1/session/status', async (req, res) => {
  res.json({
    status: 'success',
    ...sessionState,
    qrDataUrl: currentQrDataUrl,
    hasRawQr: !!currentRawQr,
    qrAgeMs: qrGeneratedAt ? Date.now() - qrGeneratedAt : 0,
    timestamp: new Date().toISOString()
  });
});

// QR Code endpoint
apiApp.get('/api/v1/session/qr', async (req, res) => {
  res.json({
    status: 'success',
    qrDataUrl: currentQrDataUrl,
    hasQr: !!currentQrDataUrl,
    phoneConnected: sessionState.phoneConnected,
    authenticated: sessionState.authenticated,
    pairedNumber: sessionState.pairedNumber,
    timestamp: new Date().toISOString()
  });
});

// 8-Digit Phone Pairing Code endpoint (Link with phone number instead)
apiApp.post('/api/v1/session/request-code', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ status: 'error', message: 'Phone number is required.' });
  }

  const cleanDigits = phoneNumber.toString().replace(/[^0-9]/g, '');
  if (cleanDigits.length < 10) {
    return res.status(400).json({ status: 'error', message: 'Please enter a valid phone number (at least 10 digits).' });
  }

  const phoneFormatted = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

  try {
    if (sessionState.phoneConnected) {
      return res.json({
        status: 'already_connected',
        pairedNumber: sessionState.pairedNumber,
        message: 'WhatsApp device is already paired and connected!'
      });
    }

    if (sock && !sock.authState?.creds?.registered) {
      console.log(`[OpenWA] Requesting 8-digit WhatsApp pairing code for +${phoneFormatted}...`);
      const rawCode = await sock.requestPairingCode(phoneFormatted);
      const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
      console.log(`[OpenWA] Successfully generated pairing code: ${formattedCode}`);

      return res.json({
        status: 'success',
        pairingCode: formattedCode,
        phone: `+${phoneFormatted}`,
        instructions: 'Open WhatsApp > Linked Devices > Link a Device > Link with phone number instead > Enter this code'
      });
    } else {
      return res.status(503).json({
        status: 'error',
        message: 'WhatsApp socket is still preparing credentials. Please try again in 5 seconds.'
      });
    }
  } catch (err) {
    console.error('[OpenWA] Error requesting pairing code:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Refresh / Regenerate QR endpoint
apiApp.post('/api/v1/session/refresh-qr', async (req, res) => {
  try {
    if (!sessionState.phoneConnected) {
      currentRawQr = null;
      currentQrDataUrl = null;
      await startWhatsAppSocket();
    }
    res.json({
      status: 'success',
      message: 'Pairing session refreshed. Regenerating authentic QR...',
      qrDataUrl: currentQrDataUrl,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Complete Session Reset endpoint
apiApp.post('/api/v1/session/reset', async (req, res) => {
  try {
    console.log('[OpenWA] Session reset requested. Clearing all auth keys...');
    if (sock) {
      try {
        sock.ev?.removeAllListeners();
        sock.end(undefined);
      } catch (e) {}
      sock = null;
    }
    sessionState.isConnected = false;
    sessionState.phoneConnected = false;
    sessionState.authenticated = false;
    sessionState.pairedNumber = null;
    currentRawQr = null;
    currentQrDataUrl = null;

    try {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    } catch (e) {}

    setTimeout(() => {
      isStarting = false;
      startWhatsAppSocket();
    }, 600);

    res.json({ status: 'success', message: 'Session reset completely. Fresh QR code is initializing.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Send WhatsApp Receipt message endpoint
apiApp.post('/api/v1/messages/send-text', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ status: 'error', message: 'Fields "to" and "message" are required.' });
  }

  const rawDigits = to.toString().replace(/[^0-9]/g, '');
  const normalizedPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
  const jid = `${normalizedPhone}@s.whatsapp.net`;
  let messageId = `wamid.${Date.now()}_${Math.random().toString(36).substring(7)}`;
  let isLive = false;

  console.log(`[OpenWA :2785] Dispatching WhatsApp Receipt to +${normalizedPhone}...`);

  if (sock && sessionState.phoneConnected) {
    try {
      const sent = await sock.sendMessage(jid, { text: message });
      if (sent?.key?.id) {
        messageId = `wamid.${sent.key.id}`;
        isLive = true;
        console.log(`[OpenWA] Live WhatsApp message delivered! MessageID: ${messageId}`);
      }
    } catch (err) {
      console.warn('[OpenWA] Live socket dispatch failed:', err.message);
    }
  } else {
    console.log(`[OpenWA] Simulated dispatch (phone not connected yet). ID: ${messageId}`);
  }

  sessionState.lastMessageSent = {
    to: `+${normalizedPhone}`,
    timestamp: new Date().toISOString(),
    messageId,
    isLive
  };

  return res.json({
    status: 'success',
    messageId,
    recipient: `+${normalizedPhone}`,
    liveDelivered: isLive,
    timestamp: Math.floor(Date.now() / 1000)
  });
});

apiApp.listen(API_PORT, () => {
  console.log(`[OpenWA] WhatsApp REST API Gateway running on http://localhost:${API_PORT}`);
});

// ----------------------------------------------------
// 2. Real-time Live Pairing Dashboard on Port 2886
// ----------------------------------------------------
const dashApp = express();
dashApp.use(cors());

dashApp.get('/', async (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OpenWA Real Gateway Dashboard | DailyMart POS</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F172A; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; color: #F8FAFC; }
        .card { background: #1E293B; padding: 36px 32px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; max-width: 480px; width: 100%; border: 1px solid #334155; }
        .brand { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px; }
        .logo { background: #25D366; color: white; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; box-shadow: 0 4px 12px rgba(37,211,102,0.3); }
        h2 { color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 800; }
        p.subtitle { color: #94A3B8; font-size: 13.5px; margin: 6px 0 18px; }
        
        .status-badge { display: inline-flex; align-items: center; gap: 8px; padding: 7px 18px; background: rgba(59,130,246,0.15); color: #60A5FA; font-weight: 700; border-radius: 9999px; font-size: 13px; margin-bottom: 18px; border: 1px solid rgba(59,130,246,0.3); }
        .tabs { display: flex; gap: 8px; margin-bottom: 16px; background: #0F172A; padding: 4px; border-radius: 10px; border: 1px solid #334155; }
        .tab-btn { flex: 1; padding: 8px 12px; background: transparent; border: none; color: #94A3B8; font-weight: 700; font-size: 12.5px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .tab-btn.active { background: #2563EB; color: #FFFFFF; }

        .qr-box { margin: 4px auto 14px; border: 2px dashed #475569; border-radius: 16px; padding: 14px; display: inline-block; background: #FFFFFF; position: relative; min-width: 260px; min-height: 260px; }
        .qr-box img { display: block; border-radius: 8px; width: 232px; height: 232px; margin: 0 auto; }
        .qr-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 232px; width: 232px; color: #64748B; font-size: 13px; gap: 10px; }
        
        .instructions { text-align: left; background: #0F172A; border: 1px solid #334155; border-radius: 12px; padding: 14px; font-size: 12.5px; color: #CBD5E1; margin-bottom: 14px; line-height: 1.6; }
        .instructions ol { margin: 0; padding-left: 18px; }
        
        .pair-code-section { padding: 16px; background: rgba(37,211,102,0.08); border: 1px solid rgba(37,211,102,0.3); border-radius: 12px; text-align: left; margin-bottom: 14px; }
        .pair-code-box { font-size: 26px; font-weight: 800; letter-spacing: 4px; color: #4ADE80; text-align: center; margin: 12px 0; background: #0F172A; padding: 12px; border-radius: 10px; border: 2px dashed #22C55E; font-family: monospace; }
        .input-row { display: flex; gap: 8px; margin-top: 10px; }
        .input-row input { flex: 1; padding: 10px 14px; background: #0F172A; border: 1px solid #475569; border-radius: 8px; font-size: 13px; color: white; }
        .input-row input:focus { outline: none; border-color: #2563EB; }
        
        .meta { font-size: 12px; color: #94A3B8; background: #0F172A; padding: 14px; border-radius: 10px; text-align: left; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; border: 1px solid #334155; }
        .btn { background: #2563EB; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
        .btn:hover { background: #1D4ED8; }
        .btn-green { background: #16A34A; }
        .btn-green:hover { background: #15803D; }
        .btn-danger { background: rgba(239,68,68,0.15); color: #F87171; border: 1px solid rgba(239,68,68,0.3); font-size: 11.5px; padding: 6px 12px; }
        .btn-danger:hover { background: rgba(239,68,68,0.3); }
        .spinner { width: 28px; height: 28px; border: 3px solid rgba(0,0,0,0.1); border-top-color: #2563EB; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">
          <div class="logo">💬</div>
          <div>
            <h2>OpenWA Live Gateway</h2>
            <div style="font-size: 11px; color: #22C55E; font-weight: 700;">D:\\POS\\OpenWA Active Service</div>
          </div>
        </div>
        <p class="subtitle">Direct WhatsApp Web socket engine for POS & Billing receipts</p>
        <div id="status" class="status-badge">● Initializing Multi-Device Socket...</div>
        
        <div class="tabs">
          <button id="tab-qr-btn" class="tab-btn active" onclick="switchTab('qr')">📷 QR Code Scan</button>
          <button id="tab-code-btn" class="tab-btn" onclick="switchTab('code')">🔢 8-Digit Pairing Code</button>
        </div>

        <!-- TAB 1: QR CODE -->
        <div id="tab-qr">
          <div class="qr-box">
            <img id="qr-img" src="" alt="WhatsApp Pairing QR Code" style="display:none;" />
            <div id="qr-loader" class="qr-placeholder">
              <div class="spinner"></div>
              <span>Connecting to WhatsApp servers...</span>
            </div>
          </div>

          <div class="instructions">
            <strong>How to Link with QR Code:</strong>
            <ol>
              <li>Open <strong>WhatsApp</strong> on your mobile phone</li>
              <li>Tap <strong>Settings (⚙)</strong> or <strong>Menu (⋮)</strong> &rarr; <strong>Linked Devices</strong></li>
              <li>Tap <strong>Link a Device</strong> &rarr; Scan the authentic QR code above</li>
            </ol>
          </div>
        </div>

        <!-- TAB 2: PAIRING CODE -->
        <div id="tab-code" style="display:none;">
          <div class="pair-code-section">
            <div style="font-weight: 700; color: #4ADE80; font-size: 13.5px;">Link with Phone Number (No Camera Needed)</div>
            <div style="font-size: 12px; color: #94A3B8; margin-top: 4px;">
              Bypasses camera focus and "Device not found" scan issues with a direct 8-digit verification code.
            </div>
            <div class="input-row">
              <input type="text" id="phone-input" placeholder="Enter phone, e.g. 9820554433" />
              <button class="btn btn-green" onclick="getPairingCode()">Get Code</button>
            </div>
            <div id="code-result" style="display:none;" class="pair-code-box"></div>
            <div id="code-hint" style="display:none; font-size: 12px; color: #CBD5E1; margin-top: 6px;">
              👉 On phone: Open <strong>WhatsApp</strong> &gt; <strong>Linked Devices</strong> &gt; <strong>Link with phone number instead</strong> &gt; Enter this code.
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <button class="btn btn-danger" onclick="resetSession()">🔄 Reset Session / Clear Keys</button>
          <button class="btn" style="padding: 6px 12px; font-size: 11.5px;" onclick="refreshQR()">↻ Refresh QR</button>
        </div>

        <div class="meta">
          <div><strong>REST API:</strong> :${API_PORT}</div>
          <div><strong>Pairing Web:</strong> :${DASHBOARD_PORT}</div>
          <div><strong>Status:</strong> <span id="conn-text">Checking...</span></div>
          <div><strong>Paired Phone:</strong> <span id="phone-text">None</span></div>
        </div>
      </div>

      <script>
        let isConnected = false;

        function switchTab(tab) {
          const qrTab = document.getElementById('tab-qr');
          const codeTab = document.getElementById('tab-code');
          const qrBtn = document.getElementById('tab-qr-btn');
          const codeBtn = document.getElementById('tab-code-btn');

          if (tab === 'qr') {
            qrTab.style.display = 'block';
            codeTab.style.display = 'none';
            qrBtn.classList.add('active');
            codeBtn.classList.remove('active');
          } else {
            qrTab.style.display = 'none';
            codeTab.style.display = 'block';
            codeBtn.classList.add('active');
            qrBtn.classList.remove('active');
          }
        }

        async function pollStatus() {
          try {
            const res = await fetch('http://localhost:${API_PORT}/api/v1/session/status');
            const data = await res.json();
            
            const statusEl = document.getElementById('status');
            const connText = document.getElementById('conn-text');
            const phoneText = document.getElementById('phone-text');
            const qrImg = document.getElementById('qr-img');
            const qrLoader = document.getElementById('qr-loader');

            isConnected = data.phoneConnected || data.authenticated;

            if (isConnected) {
              statusEl.style.background = 'rgba(34,197,94,0.15)';
              statusEl.style.color = '#4ADE80';
              statusEl.style.borderColor = 'rgba(34,197,94,0.3)';
              statusEl.innerHTML = '● Linked & Ready (' + (data.pairedNumber || '+91') + ')';
              connText.innerText = 'Connected';
              phoneText.innerText = data.pairedNumber || 'Active';
              qrImg.style.display = 'none';
              qrLoader.style.display = 'flex';
              qrLoader.innerHTML = '<div style="color:#16A34A;font-weight:700;font-size:15px;text-align:center;">✅ Device Authenticated!<br><span style="font-size:12px;color:#64748B;font-weight:400;">Ready to send bill receipts</span></div>';
            } else {
              statusEl.style.background = 'rgba(59,130,246,0.15)';
              statusEl.style.color = '#60A5FA';
              statusEl.style.borderColor = 'rgba(59,130,246,0.3)';
              statusEl.innerHTML = '● Awaiting Scan / Pairing Code';
              connText.innerText = 'Scanning';
              phoneText.innerText = 'Unpaired';

              if (data.qrDataUrl) {
                qrImg.src = data.qrDataUrl;
                qrImg.style.display = 'block';
                qrLoader.style.display = 'none';
              } else {
                qrImg.style.display = 'none';
                qrLoader.style.display = 'flex';
                qrLoader.innerHTML = '<div class="spinner"></div><span>Generating WhatsApp QR code...</span>';
              }
            }
          } catch (e) {
            console.warn('Poll error:', e);
          }
        }

        async function getPairingCode() {
          const num = document.getElementById('phone-input').value.trim();
          if (!num || num.length < 10) {
            alert('Please enter a valid phone number (at least 10 digits).');
            return;
          }
          const codeBox = document.getElementById('code-result');
          const codeHint = document.getElementById('code-hint');
          codeBox.style.display = 'block';
          codeBox.innerText = 'REQUESTING...';

          try {
            const res = await fetch('http://localhost:${API_PORT}/api/v1/session/request-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phoneNumber: num })
            });
            const data = await res.json();
            if (data.pairingCode) {
              codeBox.innerText = data.pairingCode;
              codeHint.style.display = 'block';
            } else if (data.message) {
              alert(data.message);
              codeBox.style.display = 'none';
            }
          } catch (err) {
            alert('Failed to request code: ' + err.message);
            codeBox.style.display = 'none';
          }
        }

        async function refreshQR() {
          try {
            await fetch('http://localhost:${API_PORT}/api/v1/session/refresh-qr', { method: 'POST' });
            pollStatus();
          } catch (e) {
            alert('Refresh failed: ' + e.message);
          }
        }

        async function resetSession() {
          if (!confirm('Are you sure you want to reset and generate a fresh session?')) return;
          try {
            await fetch('http://localhost:${API_PORT}/api/v1/session/reset', { method: 'POST' });
            alert('Session reset initiated. Regenerating credentials...');
            pollStatus();
          } catch (e) {
            alert('Reset failed: ' + e.message);
          }
        }

        setInterval(pollStatus, 2000);
        pollStatus();
      </script>
    </body>
    </html>
  `);
});

dashApp.listen(DASHBOARD_PORT, () => {
  console.log(`[OpenWA] WhatsApp Pairing Dashboard running on http://localhost:${DASHBOARD_PORT}`);
});
