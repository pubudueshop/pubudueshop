import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import analyticsRouter from './routes/analytics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend website (e.g. ichouse.lk and local development)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['*'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive default for ease of integration
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Root Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Pubudu Inventory & E-Commerce Synchronization API',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      singleProduct: '/api/products/:id',
      checkout: '/api/orders/checkout',
      webhook: '/api/orders/webhook',
      analytics: '/api/analytics/summary'
    },
    docs: 'https://ichouse.lk'
  });
});

// Mount Routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/analytics', analyticsRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.url}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Pubudu Inventory Backend Server is running on port ${PORT}`);
  console.log(`🌐 Base API URL: http://localhost:${PORT}`);
  console.log(`📦 Products Endpoint: http://localhost:${PORT}/api/products`);
  console.log(`🛒 Checkout Endpoint: http://localhost:${PORT}/api/orders/checkout`);
});
