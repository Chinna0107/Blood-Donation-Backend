const express = require('express');
const { sendVerificationEmail } = require('../emailService');

const router = express.Router();

// Submit contact form
router.post('/submit', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false,
        error: 'Name, email, subject, and message are required' 
      });
    }

    // Send email to admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    const adminMessage = `
      New Contact Form Submission:
      
      Name: ${name}
      Email: ${email}
      Phone: ${phone || 'Not provided'}
      Subject: ${subject}
      
      Message:
      ${message}
    `;
    
    // Send email to user (confirmation)
    const userMessage = `
      Thank you for contacting us!
      
      We have received your message regarding "${subject}" and will get back to you soon.
      
      Your message:
      ${message}
    `;

    // Send both emails
    await Promise.all([
      sendVerificationEmail(adminEmail, adminMessage),
      sendVerificationEmail(email, userMessage)
    ]);

    res.json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.'
    });
  } catch (error) {
    console.error('Error sending contact emails:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send message' 
    });
  }
});

module.exports = router;