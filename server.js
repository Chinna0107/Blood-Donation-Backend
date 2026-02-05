const express = require('express');
const cors = require('cors');
require('dotenv').config();

const donorRoutes = require('./routes/donors');
const requestRoutes = require('./routes/requests');
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const adminRoutes = require('./routes/admin');
const contactRoutes = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://hk-blood-donation.vercel.app',
    'https://hk-blood-donation-git-main-chinna0107s-projects.vercel.app',
    // 'https://g8l76-1770305143891-ae8954e776db.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Blood donation API is running' });
});

// Handle favicon requests
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// Catch-all handler for debugging
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl,
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/login',
      'POST /api/auth/signup',
      'GET /api/donors',
      'POST /api/contact/submit'
    ]
  });
});

// For Vercel deployment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;