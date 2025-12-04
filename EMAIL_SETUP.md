# Email Service Configuration Guide

## Problem: Connection Timeout

If you're getting `ETIMEDOUT` errors when sending emails, it's likely because:
1. Gmail SMTP is blocked or has connection issues from your hosting provider (e.g., Render.com)
2. Network restrictions on your hosting platform
3. Incorrect SMTP configuration

## Solutions

### Option 1: Use Custom SMTP (Recommended for Production)

Use a dedicated email service provider like:
- **SendGrid** (Free tier: 100 emails/day)
- **Mailgun** (Free tier: 5,000 emails/month)
- **AWS SES** (Pay as you go)
- **Brevo (formerly Sendinblue)** (Free tier: 300 emails/day)

#### SendGrid Setup:

1. Sign up at https://sendgrid.com
2. Create an API key
3. Add to your `.env`:
```env
SENDGRID_API_KEY=your-sendgrid-api-key
```

#### Custom SMTP Setup:

Add to your `.env`:
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

### Option 2: Fix Gmail SMTP

If you want to use Gmail:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Create a new app password for "Mail"
3. Add to your `.env`:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

**Note:** Gmail may still timeout on some hosting providers. Consider using a custom SMTP service instead.

### Option 3: Allow Email Failures (Development/Testing)

If email service is not critical for testing:

Add to your `.env`:
```env
ALLOW_EMAIL_FAILURE=true
```

This will:
- Log OTP codes in the server console
- Return OTP in API response (for testing)
- Prevent app from breaking when email fails

## Current Behavior

The email service now:
- ✅ Has 10-second connection timeout
- ✅ Logs OTP in console if email fails
- ✅ Returns OTP in API response if `ALLOW_EMAIL_FAILURE=true`
- ✅ Supports multiple email providers
- ✅ Gracefully handles failures

## Testing

After configuration, test by:
1. Sending an OTP for registration
2. Check server logs for any errors
3. If email fails, OTP will be logged in console

## Production Recommendations

For production, use:
1. **SendGrid** or **Mailgun** (most reliable)
2. Set `ALLOW_EMAIL_FAILURE=false`
3. Monitor email delivery rates
4. Set up email service alerts

