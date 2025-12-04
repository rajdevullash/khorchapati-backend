# Email Configuration Guide (Bengali)

## .env ফাইলে কি কি যোগ করতে হবে

### Option 1: Gmail ব্যবহার (সহজ)

`.env` ফাইলে যোগ করুন:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

**Gmail App Password তৈরি করার জন্য:**
1. Google Account এ যান: https://myaccount.google.com
2. Security → 2-Step Verification enable করুন
3. App Passwords এ যান: https://myaccount.google.com/apppasswords
4. "Mail" এবং "Other (Custom name)" select করুন
5. "Ay-Bay" নাম দিন
6. Generate করুন - 16 character password পাবেন
7. সেই password টা `.env` ফাইলের `EMAIL_PASS` এ দিন

### Option 2: Custom SMTP (Production এর জন্য ভাল)

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

### Option 3: SendGrid (Recommended for Production)

```env
SENDGRID_API_KEY=your-sendgrid-api-key
```

SendGrid free tier: 100 emails/day
- Sign up: https://sendgrid.com
- Create API key
- Copy API key to `.env`

### Option 4: Development Mode (Email না পাঠালেও চলবে)

```env
ALLOW_EMAIL_FAILURE=true
```

এটা set করলে:
- Email fail হলে OTP console এ log হবে
- API response এ OTP code return হবে
- App break হবে না

## Email Test করা

```bash
npm run test-email
```

এটা run করলে email configuration test হবে।

## Render.com এ Deploy করার সময়

Render.com এর Environment Variables এ যোগ করুন:

1. Render dashboard → Your Service → Environment
2. Add:
   - `EMAIL_USER` = your-email@gmail.com
   - `EMAIL_PASS` = your-app-password
   - অথবা
   - `SENDGRID_API_KEY` = your-api-key

**Important:** Render.com এ Gmail timeout হতে পারে। SendGrid ব্যবহার করা ভাল।

## Troubleshooting

### Connection Timeout Error
- Gmail এর পরিবর্তে SendGrid ব্যবহার করুন
- অথবা `ALLOW_EMAIL_FAILURE=true` set করুন

### Authentication Failed
- Gmail App Password ব্যবহার করুন (regular password না)
- 2-Step Verification enable আছে কিনা check করুন

### Email না যাচ্ছে
- Server logs check করুন
- `npm run test-email` run করুন
- `ALLOW_EMAIL_FAILURE=true` set করে OTP console এ দেখুন

