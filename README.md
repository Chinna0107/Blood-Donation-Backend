# Blood Donation Backend API

Express.js backend for blood donation system with email verification and Neon PostgreSQL database.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
PORT=5000
DATABASE_URL=your_neon_database_url_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

3. Run the SQL schema in your Neon database:
```sql
-- Copy and execute the contents of schema.sql
```

4. Start the server:
```bash
npm run dev
```

## API Endpoints

### POST /api/donors/send-verification
Send verification code to email
```json
{
  "email": "user@example.com"
}
```

### POST /api/donors/verify-email
Verify email with code
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

### POST /api/donors/register
Register new donor (email must be verified first)
```json
{
  "name": "John Doe",
  "age": 25,
  "bloodType": "O+",
  "phone": "1234567890",
  "email": "user@example.com",
  "address": "123 Main St, City, State"
}
```

### GET /api/donors
Get all donors

### GET /api/donors/blood-type/:type
Get donors by blood type (e.g., /api/donors/blood-type/O+)

### GET /api/health
Health check endpoint

## Frontend Integration

Update your React component to use these endpoints:

```javascript
// Send verification email
const sendVerificationEmail = async () => {
  const response = await fetch('http://localhost:5000/api/donors/send-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: formData.email })
  });
  const data = await response.json();
  // Handle response
};

// Verify code
const verifyCode = async () => {
  const response = await fetch('http://localhost:5000/api/donors/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: formData.email, code: verificationCode })
  });
  const data = await response.json();
  // Handle response
};

// Register donor
const handleSubmit = async (e) => {
  e.preventDefault();
  const response = await fetch('http://localhost:5000/api/donors/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  const data = await response.json();
  // Handle response
};
```