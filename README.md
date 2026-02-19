# COD Analytics SaaS Platform

## 🚀 Overview

A complete SaaS platform for real-time COD delivery performance tracking with user authentication, subscription management, and multi-tenant support.

**Pricing:** ₹199/month per user
**Trial:** 7 days free trial

---

## 📁 File Structure

```
saas_dashboard/
├── login.html          # Login & Signup page
├── profile.html        # User profile & subscription management  
├── dashboard.html      # Main COD analytics dashboard (auth-protected)
├── server/             # Backend API (Node.js/Express)
│   ├── server.js       # Main Express server
│   ├── auth.js         # Authentication middleware
│   ├── routes/         # API routes
│   └── models/         # Database models
└── README.md          # This file
```

---

## ✨ Features

### Authentication & User Management
- ✅ Email/password login & signup
- ✅ Google OAuth (ready to integrate)
- ✅ JWT token-based authentication
- ✅ Remember me functionality
- ✅ Password reset flow
- ✅ User profile management

### Subscription Management
- ✅ 7-day free trial
- ✅ ₹199/month subscription
- ✅ Auto-renewal
- ✅ Cancel anytime
- ✅ Trial countdown display
- ✅ Usage statistics

### Dashboard Features (from original COD Analytics)
- ✅ COD-only performance tracking
- ✅ All shipments (COD + PREPAID) report
- ✅ Hourly delivery timeline chart
- ✅ Historical data with multi-select
- ✅ Per-rider performance metrics
- ✅ Real-time KPI cards
- ✅ WhatsApp report export
- ✅ Multi-hub support

---

## 🛠️ Tech Stack

### Frontend
- **HTML5 + CSS3** — Vanilla, no frameworks needed
- **Chart.js** — For hourly delivery charts
- **XLSX.js** — Excel file processing
- **html2canvas** — PNG export generation

### Backend (Required)
- **Node.js + Express** — REST API server
- **MongoDB** or **PostgreSQL** — User data & subscriptions
- **JWT** — Authentication tokens
- **Razorpay/Stripe** — Payment processing
- **bcrypt** — Password hashing

---

## 🚀 Quick Start

### 1. Frontend Only (Demo Mode)

The frontend works standalone with localStorage for testing:

```bash
# Just open in browser
open login.html
```

**Demo credentials:**
- Any email/password will work
- Data stored in localStorage
- No backend required for testing

### 2. Full Production Setup

**Install Backend Dependencies:**

```bash
cd server
npm install express mongoose jsonwebtoken bcryptjs cors dotenv razorpay
```

**Environment Variables (.env):**

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cod-analytics
JWT_SECRET=your-super-secret-jwt-key-change-this
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_secret
```

**Start Server:**

```bash
node server/server.js
```

**Access:**
- Login: http://localhost:5000/login.html
- Dashboard: http://localhost:5000/dashboard.html
- Profile: http://localhost:5000/profile.html

---

## 💳 Payment Integration

### Razorpay Setup

1. **Sign up:** https://razorpay.com
2. **Get API keys:** Dashboard → Settings → API Keys
3. **Update .env** with your keys
4. **Webhook URL:** `https://yourdomain.com/api/webhooks/razorpay`

### Payment Flow

1. User clicks "Upgrade Now" in profile
2. Frontend calls `/api/subscription/create-order`
3. Razorpay checkout opens
4. On success: webhook updates user subscription status
5. User gets access to dashboard

---

## 🔐 Authentication Flow

### Signup
```
POST /api/auth/signup
Body: { name, email, password, company, phone }
Returns: { token, user }
```

### Login
```
POST /api/auth/login
Body: { email, password, remember }
Returns: { token, user }
```

### Protected Routes
```
Authorization: Bearer <token>
```

All dashboard API calls require valid JWT token.

---

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  name: String,
  company: String,
  phone: String,
  subscription: {
    status: 'trial' | 'active' | 'cancelled' | 'expired',
    trialEndsAt: Date,
    currentPeriodEnd: Date,
    razorpaySubscriptionId: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Reports Collection (History)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  uploadedAt: Date,
  filename: String,
  codData: Object,
  allData: Object,
  hubName: String
}
```

---

## 🎨 Customization

### Branding
- **Logo:** Update SVG in `.brand-mark`
- **Colors:** Change CSS variables in `:root`
- **Pricing:** Update ₹199 to your price in `profile.html`

### Features
- Enable/disable Google login in `login.html`
- Add more subscription tiers in `profile.html`
- Customize dashboard metrics in `dashboard.html`

---

## 🔧 Backend API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/forgot-password` - Send reset email
- `POST /api/auth/reset-password` - Reset password

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `PUT /api/user/password` - Change password
- `DELETE /api/user/account` - Delete account

### Subscription
- `POST /api/subscription/create-order` - Create Razorpay order
- `POST /api/subscription/verify` - Verify payment
- `POST /api/subscription/cancel` - Cancel subscription
- `GET /api/subscription/status` - Check status

### Reports
- `POST /api/reports/upload` - Save uploaded report
- `GET /api/reports/history` - Get user's reports
- `GET /api/reports/:id` - Get specific report
- `DELETE /api/reports/:id` - Delete report

### Webhooks
- `POST /api/webhooks/razorpay` - Handle payment events

---

## 🚀 Deployment

### Frontend (Netlify/Vercel)

```bash
# Build command: none (static files)
# Publish directory: ./
```

### Backend (Heroku/Railway/DigitalOcean)

```bash
# Set environment variables
# Deploy with: git push heroku main
```

### Database (MongoDB Atlas)

1. Create cluster at mongodb.com/atlas
2. Get connection string
3. Update MONGODB_URI in .env

---

## 📱 Mobile App (Future)

The same backend API can power:
- React Native mobile app
- Flutter app
- Progressive Web App (PWA)

Just point the API calls to your production server.

---

## 🔒 Security Checklist

- ✅ JWT tokens expire in 30 days
- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ CORS enabled for your domain only
- ✅ Rate limiting on auth endpoints
- ✅ SQL injection prevention (using ORMs)
- ✅ XSS protection (sanitize inputs)
- ✅ HTTPS required in production

---

## 📈 Scaling

### Current Setup
- Single server
- ~1000 concurrent users
- localStorage-based reports

### Scale to 10,000+ Users
1. Move reports to S3/CloudFlare R2
2. Add Redis for session caching
3. Use load balancer (Nginx)
4. Separate DB server
5. CDN for static assets

---

## 💰 Revenue Projections

**Pricing:** ₹199/month

| Users | MRR | ARR |
|-------|-----|-----|
| 50 | ₹9,950 | ₹1,19,400 |
| 100 | ₹19,900 | ₹2,38,800 |
| 500 | ₹99,500 | ₹11,94,000 |
| 1000 | ₹1,99,000 | ₹23,88,000 |

**Costs:**
- Server: ~₹2,000/month (DigitalOcean)
- Database: ~₹1,500/month (MongoDB Atlas)
- Payment gateway: 2% + ₹3 per transaction
- Domain + SSL: ~₹1,000/year

---

## 📞 Support

For backend setup help or customization:
- Create GitHub issues
- Email: support@your-domain.com
- Documentation: https://docs.your-domain.com

---

## 📝 License

Proprietary - All rights reserved
