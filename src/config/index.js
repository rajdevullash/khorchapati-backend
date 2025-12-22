const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aybay';
const jwtSecret = process.env.JWT_SECRET || 'please_change_me';
const nodeEnv = process.env.NODE_ENV || 'development';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

// Email-related configuration (Gmail / SMTP).
// Use environment variables EMAIL_USER and EMAIL_PASS (Gmail app password) for authentication.
const email = {
  user: process.env.EMAIL_USER || process.env.SMTP_USER,
  pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
};

const smtp = {
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_SECURE === 'true' || false,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
};

// Allow the app to continue in development even if email fails
const allowEmailFailure = process.env.ALLOW_EMAIL_FAILURE === 'true' || nodeEnv === 'development';

module.exports = { port, mongoUri, jwtSecret, nodeEnv, email, smtp, allowEmailFailure };
