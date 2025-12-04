// Get public configuration (like Google Client ID for frontend)
exports.getConfig = async (req, res) => {
  try {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

