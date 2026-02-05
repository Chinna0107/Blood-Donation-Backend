require('dotenv').config(); // load .env variables
const express = require('express');
const cors = require('cors');

const donorRoutes = require('./routes/donors');
const requestRoutes = require('./routes/requests');
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const adminRoutes = require('./routes/admin');
const contactRoutes = require('./routes/contact');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://hk-blood-donation.vercel.app',
    'https://hk-blood-donation-git-main-chinna0107s-projects.vercel.app'
  ],
  credentials: true
}));

// Routes
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// Health Check
app.get('/', (req, res) => {
  res.send('✅ Blood Donation Backend Running Successfully!');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Blood donation API is running' });
});

// Handle favicon.ico requests
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// ✅ Only needed for local testing
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  });
}

module.exports = app; // for Vercel deployment