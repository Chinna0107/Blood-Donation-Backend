const express = require('express');
const pool = require('../db');
const { sendVerificationEmail } = require('../emailService');

const router = express.Router();

// Send verification email for blood request
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

// Verify email code for blood request
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
      message: 'Email verified successfully! You can now submit the request.' 
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to verify email' 
    });
  }
});

// Submit blood request
router.post('/submit', async (req, res) => {
  try {
    const { patientName, bloodType, unitsNeeded, urgency, hospital, hospitalAddress, contactName, phone, email } = req.body;

    // Validate required fields
    if (!patientName || !bloodType || !unitsNeeded || !urgency || !hospital || !hospitalAddress || !contactName || !phone || !email) {
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

    // Insert blood request
    const result = await pool.query(
      `INSERT INTO blood_requests (patient_name, blood_type, units_needed, urgency, hospital, hospital_address, contact_name, phone, email) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, patient_name, blood_type`,
      [patientName, bloodType, parseInt(unitsNeeded), urgency, hospital, hospitalAddress, contactName, phone, email]
    );

    res.status(201).json({
      success: true,
      message: 'Blood request submitted successfully!',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting blood request:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to submit blood request' 
    });
  }
});

// Get all blood requests
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM blood_requests WHERE status = $1 ORDER BY urgency DESC, created_at DESC',
      ['Active']
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching blood requests:', error);
    res.status(500).json({ error: 'Failed to fetch blood requests' });
  }
});

module.exports = router;