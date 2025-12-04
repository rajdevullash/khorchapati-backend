const passport = require('passport');
const GoogleTokenStrategy = require('passport-google-token').Strategy;
const User = require('../models/User');

// Google Token Strategy for mobile apps
passport.use(
  new GoogleTokenStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // User exists, return user
          return done(null, user);
        }

        // Check if user exists with this email (but no Google ID)
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          if (!user.avatar && profile._json?.picture) {
            user.avatar = profile._json.picture;
          }
          await user.save();
          return done(null, user);
        }

        // Create new user
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile._json?.picture || null,
        });

        return done(null, user);
      } catch (error) {
        console.error('Google Token Strategy error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;

