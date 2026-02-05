const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { sendVerificationEmail } = require('../emailService');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Send OTP for signup
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email is required' 
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'User with this email already exists' 
      });
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
      message: `OTP sent to ${email}. Please check your inbox.` 
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send OTP' 
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and OTP are required' 
      });
    }

    // Find valid verification code
    const result = await pool.query(
      'SELECT * FROM email_verifications WHERE email = $1 AND code = $2 AND expires_at > NOW() AND verified = FALSE ORDER BY created_at DESC LIMIT 1',
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or expired OTP' 
      });
    }

    // Mark as verified
    await pool.query(
      'UPDATE email_verifications SET verified = TRUE WHERE id = $1',
      [result.rows[0].id]
    );

    res.json({ 
      success: true,
      message: 'OTP verified successfully!' 
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to verify OTP' 
    });
  }
});

// Complete signup
router.post('/signup', async (req, res) => {
  try {
    const { email, fullName, aadhar, bloodType, phone, address, password, confirmPassword } = req.body;

    // Validate required fields
    if (!email || !fullName || !aadhar || !bloodType || !phone || !address || !password || !confirmPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    // Check password match
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Passwords do not match' 
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

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR aadhar = $2 OR phone = $3',
      [email, aadhar, phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'User with this email, Aadhar, or phone already exists' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (full_name, email, aadhar, blood_type, phone, address, password_hash) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, full_name, email`,
      [fullName, email, aadhar, bloodType, phone, address, passwordHash]
    );

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully!',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error completing signup:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete registration' 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }

    // Return user data with JWT token
    const { password_hash, ...userData } = user;
    
    const tokenType = user.is_admin ? 'admintoken' : 'token';
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        is_admin: user.is_admin,
        type: tokenType
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      [tokenType]: token,
      user: userData
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ 
      success: false,
      error: 'Login failed' 
    });
  }
});

// Get user profile (protected route)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, aadhar, blood_type, phone, address, is_admin, created_at FROM users WHERE id = $1 AND is_active = TRUE',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch profile' 
    });
  }
});

// Generate QR code for user (protected route)
router.get('/qr-code', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, blood_type, phone FROM users WHERE id = $1 AND is_active = TRUE',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const user = result.rows[0];
    const qrData = {
      id: user.id,
      name: user.full_name,
      email: user.email,
      bloodType: user.blood_type,
      phone: user.phone,
      type: 'donor',
      verified: true
    };

    res.json({
      success: true,
      qrData
    });
  } catch (error) {
    console.error('Error generating QR data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate QR code data' 
    });
  }
});

// Test admintoken authentication
router.get('/test-admin', authenticateAdmin, async (req, res) => {
  res.json({
    success: true,
    message: 'Admin token working!',
    user: req.user
  });
});

// Test regular token authentication  
router.get('/test-user', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'User token working!',
    user: req.user
  });
});

module.exports = router;