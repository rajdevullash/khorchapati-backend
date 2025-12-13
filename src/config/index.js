const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aybay';
const jwtSecret = process.env.JWT_SECRET || 'please_change_me';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

const email = {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
};

module.exports = { port, mongoUri, jwtSecret, email };
