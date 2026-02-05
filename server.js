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
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);


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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Blood donation API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});