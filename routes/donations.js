const express = require('express');
const pool = require('../db');

const router = express.Router();

// Get donation history by email
router.post('/history', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email is required' 
      });
    }

    // Check donors table for donation records
    const donorResult = await pool.query(
      'SELECT name, age, blood_type as bloodType, phone, address, created_at as date FROM donors WHERE email = $1',
      [email]
    );

    // Transform donor records to donation format
    const donations = donorResult.rows.map(donor => ({
      id: `donor_${donor.name}_${donor.date}`,
      bloodType: donor.bloodType,
      units: 1,
      date: donor.date,
      location: 'Blood Bank Center',
      status: 'Completed',
      recipient: 'Blood Bank'
    }));

    res.json({
      success: true,
      donations: donations
    });
  } catch (error) {
    console.error('Error fetching donation history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch donation history' 
    });
  }
});

// Get blood request history by email
router.post('/requests-history', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email is required' 
      });
    }

    // Check blood_requests table for request records
    const requestResult = await pool.query(
      'SELECT id, patient_name as patientName, blood_type as bloodType, units_needed as units, urgency, hospital, status, created_at as date FROM blood_requests WHERE email = $1 ORDER BY created_at DESC',
      [email]
    );

    res.json({
      success: true,
      requests: requestResult.rows
    });
  } catch (error) {
    console.error('Error fetching request history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch request history' 
    });
  }
});

module.exports = router;