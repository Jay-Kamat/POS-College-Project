import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { initializeSchema } from './postgres.js';

// Route modules
import authRoutes from './routes/auth.js';
import storeRoutes from './routes/stores.js';
import categoryRoutes from './routes/categories.js';
import taxRateRoutes from './routes/taxRates.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import vendorRoutes from './routes/vendors.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import materialInwardRoutes from './routes/materialInward.js';
import materialReturnRoutes from './routes/materialReturns.js';
import bucketRoutes from './routes/buckets.js';
import invoiceRoutes from './routes/invoices.js';
import reportRoutes from './routes/reports.js';
import settingRoutes from './routes/settings.js';
import userRoutes from './routes/users.js';
import whatsappRoutes from './routes/whatsapp.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Mount REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tax-rates', taxRateRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/material-inward', materialInwardRoutes);
app.use('/api/material-returns', materialReturnRoutes);
app.use('/api/buckets', bucketRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'PostgreSQL (pos_billing_db)',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'POS & Billing System Backend API',
    version: '1.0.0'
  });
});

// Root API Discovery Endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'POS & Billing System REST API',
    database: 'PostgreSQL',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/stores',
      '/api/categories',
      '/api/tax-rates',
      '/api/products',
      '/api/customers',
      '/api/vendors',
      '/api/purchase-orders',
      '/api/material-inward',
      '/api/material-returns',
      '/api/buckets',
      '/api/invoices',
      '/api/reports',
      '/api/settings',
      '/api/users',
      '/api/whatsapp',
      '/api/health'
    ]
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Backend Server Error]:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// Boot Server after PostgreSQL initialization
async function startServer() {
  try {
    console.log('[PostgreSQL] Initializing database and tables...');
    await initializeSchema();
    console.log('[PostgreSQL] Database ready.');

    app.listen(PORT, () => {
      console.log(`==========================================================`);
      console.log(`  POS & Billing System REST API (PostgreSQL Backend)`);
      console.log(`  Listening on http://localhost:${PORT}`);
      console.log(`  Database: PostgreSQL (pos_billing_db)`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`==========================================================`);
    });
  } catch (err) {
    console.error('Fatal error starting backend with PostgreSQL:', err);
    process.exit(1);
  }
}

startServer();
