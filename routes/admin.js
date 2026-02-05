const express = require('express');
const pool = require('../db');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all donors (admin only)
router.get('/donors', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.id, 
        d.name, 
        d.email, 
        d.blood_type as "bloodType", 
        d.phone, 
        d.address,
        d.created_at as "lastDonation",
        'Active' as status
      FROM donors d 
      ORDER BY d.created_at DESC
    `);

    res.json({
      success: true,
      donors: result.rows
    });
  } catch (error) {
    console.error('Error fetching donors:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch donors' 
    });
  }
});

// Delete donor (admin only)
router.delete('/donors/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM donors WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Donor not found' 
      });
    }

    res.json({
      success: true,
      message: 'Donor deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting donor:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete donor' 
    });
  }
});

// Get all blood requests (admin only)
router.get('/requests', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        patient_name as "patientName",
        blood_type as "bloodType",
        units_needed as units,
        urgency,
        hospital,
        phone as "requesterPhone",
        status,
        created_at as "requestDate"
      FROM blood_requests 
      ORDER BY 
        CASE urgency 
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
        END,
        created_at DESC
    `);

    res.json({
      success: true,
      requests: result.rows
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch requests' 
    });
  }
});

// Update request status (admin only)
router.patch('/requests/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['Active', 'Fulfilled', 'Cancelled'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid status' 
      });
    }

    const result = await pool.query(
      'UPDATE blood_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Request not found' 
      });
    }

    res.json({
      success: true,
      message: 'Request status updated successfully'
    });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update request status' 
    });
  }
});

// Generate reports (admin only)
router.post('/reports/generate', authenticateAdmin, async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.body;
    
    if (!reportType) {
      return res.status(400).json({ 
        success: false,
        error: 'Report type is required' 
      });
    }

    let reportData = {};
    const dateFilter = startDate && endDate ? 
      `AND created_at BETWEEN '${startDate}' AND '${endDate}'` : '';

    switch (reportType) {
      case 'donors':
        const donorStats = await pool.query(`
          SELECT 
            COUNT(*) as total_donors,
            COUNT(CASE WHEN blood_type LIKE '%+' THEN 1 END) as positive_donors,
            COUNT(CASE WHEN blood_type LIKE '%-' THEN 1 END) as negative_donors
          FROM donors WHERE 1=1 ${dateFilter}
        `);
        const bloodTypeStats = await pool.query(`
          SELECT blood_type, COUNT(*) as count 
          FROM donors WHERE 1=1 ${dateFilter}
          GROUP BY blood_type ORDER BY count DESC
        `);
        reportData = {
          summary: donorStats.rows[0],
          bloodTypes: bloodTypeStats.rows
        };
        break;

      case 'requests':
        const requestStats = await pool.query(`
          SELECT 
            COUNT(*) as total_requests,
            COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_requests,
            COUNT(CASE WHEN status = 'Fulfilled' THEN 1 END) as fulfilled_requests,
            COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled_requests
          FROM blood_requests WHERE 1=1 ${dateFilter}
        `);
        const urgencyStats = await pool.query(`
          SELECT urgency, COUNT(*) as count 
          FROM blood_requests WHERE 1=1 ${dateFilter}
          GROUP BY urgency ORDER BY 
          CASE urgency 
            WHEN 'Critical' THEN 1
            WHEN 'High' THEN 2
            WHEN 'Medium' THEN 3
            WHEN 'Low' THEN 4
          END
        `);
        reportData = {
          summary: requestStats.rows[0],
          urgencyBreakdown: urgencyStats.rows
        };
        break;

      case 'inventory':
        const inventoryStats = await pool.query(`
          SELECT 
            blood_type,
            COUNT(*) as available_donors
          FROM donors WHERE 1=1 ${dateFilter}
          GROUP BY blood_type
          ORDER BY blood_type
        `);
        reportData = {
          bloodInventory: inventoryStats.rows
        };
        break;

      default:
        return res.status(400).json({ 
          success: false,
          error: 'Invalid report type' 
        });
    }

    res.json({
      success: true,
      reportType,
      dateRange: { startDate, endDate },
      data: reportData,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate report' 
    });
  }
});

// Get report statistics (admin only)
router.get('/reports/stats', authenticateAdmin, async (req, res) => {
  try {
    const donorCount = await pool.query('SELECT COUNT(*) as count FROM donors');
    const requestCount = await pool.query('SELECT COUNT(*) as count FROM blood_requests');
    const activeRequests = await pool.query("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'Active'");
    const thisMonthRequests = await pool.query(`
      SELECT COUNT(*) as count FROM blood_requests 
      WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);

    res.json({
      success: true,
      stats: {
        totalDonors: donorCount.rows[0].count,
        totalRequests: requestCount.rows[0].count,
        activeRequests: activeRequests.rows[0].count,
        thisMonthRequests: thisMonthRequests.rows[0].count
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch statistics' 
    });
  }
});

module.exports = router;