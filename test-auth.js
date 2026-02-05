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