const express = require('express');
const pool = require('../db');
const { sendVerificationEmail } = require('../emailService');
const { donorSchema, verificationSchema } = require('../validation');

const router = express.Router();

// Send verification email
router.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store verification code in database
    await pool.query(
      'INSERT INTO email_verifications (email, code, expires_at) VALUES ($1, $2, $3)',
      [email, code, expiresAt]
    );

    await sendVerificationEmail(email, code);
    
    res.json({ 
      success: true,
      message: `Verification code sent to ${email}. Please check your inbox.` 
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send verification email' 
    });
  }
});

// Verify email code
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and code are required' 
      });
    }

    // Find valid verification code
    const result = await pool.query(
      'SELECT * FROM email_verifications WHERE email = $1 AND code = $2 AND expires_at > NOW() AND verified = FALSE ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or expired verification code' 
      });
    }

    // Mark as verified
    await pool.query(
      'UPDATE email_verifications SET verified = TRUE WHERE id = $1',
      [result.rows[0].id]
    );

    res.json({ 
      success: true,
      message: 'Email verified successfully! You can now submit the form.' 
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to verify email' 
    });
  }
});

// Register donor
router.post('/register', async (req, res) => {
  try {
    const { name, age, bloodType, phone, email, address } = req.body;

    // Validate required fields
    if (!name || !age || !bloodType || !phone || !email || !address) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    // Check if email is verified
    const verificationResult = await pool.query(
      'SELECT * FROM email_verifications WHERE email = $1 AND verified = TRUE ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    if (verificationResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Email not verified. Please verify your email first.' 
      });
    }

    // Check if donor already exists
    const existingDonor = await pool.query(
      'SELECT id FROM donors WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (existingDonor.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Donor with this email or phone already exists' 
      });
    }

    // Insert new donor
    const result = await pool.query(
      `INSERT INTO donors (name, age, blood_type, phone, email, address) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, email`,
      [name, parseInt(age), bloodType, phone, email, address]
    );

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully!',
      donor: result.rows[0]
    });
  } catch (error) {
    console.error('Error registering donor:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to register donor' 
    });
  }
});

// Get all donors
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, age, blood_type, phone, email, address, created_at FROM donors ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching donors:', error);
    res.status(500).json({ error: 'Failed to fetch donors' });
  }
});

// Get donor by blood type
router.get('/blood-type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const result = await pool.query(
      'SELECT id, name, age, blood_type, phone, email, address FROM donors WHERE blood_type = $1',
      [type]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching donors by blood type:', error);
    res.status(500).json({ error: 'Failed to fetch donors' });
  }
});

// Search donors by blood type and location
router.post('/search', async (req, res) => {
  try {
    const { bloodType, location } = req.body;
    
    if (!bloodType) {
      return res.status(400).json({ 
        success: false,
        error: 'Blood type is required' 
      });
    }

    let query = 'SELECT name, blood_type, phone, address FROM donors WHERE blood_type = $1';
    let params = [bloodType];

    // Add location filter if provided
    if (location && location.trim()) {
      query += ' AND LOWER(address) LIKE LOWER($2)';
      params.push(`%${location.trim()}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      donors: result.rows
    });
  } catch (error) {
    console.error('Error searching donors:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to search donors' 
    });
  }
});

module.exports = router;