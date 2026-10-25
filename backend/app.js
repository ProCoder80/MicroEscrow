/**
 * MicroEscrow — Backend Server Entry Point
 * Central application server orchestrating MySQL, API routing, and frontend asset delivery.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase, isMySQLConnected } = require('./database/database');
const apiRoutes = require('./api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Serve Frontend Static Assets
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir));

// SPA fallback for root navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

// 404 Handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ success: false, error: 'Internal Server Error', details: err.message });
});

// Start Server & Initialize Database
async function startServer() {
  console.log('═══════════════════════════════════════════════════');
  console.log('       🛡️  MicroEscrow Backend Engine 🛡️           ');
  console.log('═══════════════════════════════════════════════════');

  // Initialize Database
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`\n🚀 Server is running at http://localhost:${PORT}`);
    console.log(`📡 API Endpoints available at http://localhost:${PORT}/api/campaigns & /api/pledges`);
    console.log(`💾 Database Status: ${isMySQLConnected() ? '✅ MySQL Connected' : '⚡ High-Speed Fallback Store Active'}`);
    console.log('═══════════════════════════════════════════════════\n');
  });
}

// Start application
startServer().catch(err => {
  console.error('Fatal initialization error:', err);
});

module.exports = app;
