/**
 * COD Analytics - Backend Server
 * 
 * Simple Express server with JWT authentication
 * Ready for MongoDB integration
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// In-memory user store (replace with MongoDB in production)
const users = new Map();
const subscriptions = new Map();

// ════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ════════════════════════════════════════════════════════════

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ════════════════════════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════════════════════════

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, company, phone } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password required' });
    }

    // Check if user exists
    if (users.has(email)) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      email,
      password: hashedPassword,
      name,
      company,
      phone,
      createdAt: new Date()
    };

    users.set(email, user);

    // Create trial subscription
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    subscriptions.set(email, {
      status: 'trial',
      trialEndsAt,
      currentPeriodEnd: trialEndsAt
    });

    // Generate JWT
    const token = jwt.sign(
      { email, name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return user data (without password)
    res.json({
      token,
      user: {
        email,
        name,
        company,
        phone,
        subscription: 'trial',
        trial: true,
        trialDaysLeft: 7
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, remember } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Find user
    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Get subscription
    const subscription = subscriptions.get(email) || { status: 'expired' };

    // Check trial/subscription status
    const now = new Date();
    let trialDaysLeft = 0;
    if (subscription.status === 'trial') {
      trialDaysLeft = Math.max(
        0,
        Math.ceil((subscription.trialEndsAt - now) / (1000 * 60 * 60 * 24))
      );
      if (trialDaysLeft <= 0) {
        subscription.status = 'expired';
      }
    }

    // Generate JWT
    const expiresIn = remember ? '30d' : '24h';
    const token = jwt.sign(
      { email, name: user.name },
      JWT_SECRET,
      { expiresIn }
    );

    // Return user data
    res.json({
      token,
      user: {
        email,
        name: user.name,
        company: user.company,
        phone: user.phone,
        subscription: subscription.status,
        trial: subscription.status === 'trial',
        trialDaysLeft
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════
// USER ROUTES (Protected)
// ════════════════════════════════════════════════════════════

// Get profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  const user = users.get(req.user.email);
  const subscription = subscriptions.get(req.user.email);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({
    email: user.email,
    name: user.name,
    company: user.company,
    phone: user.phone,
    subscription: subscription?.status || 'expired'
  });
});

// Update profile
app.put('/api/user/profile', authenticateToken, (req, res) => {
  const { name, company, phone } = req.body;
  const user = users.get(req.user.email);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.name = name || user.name;
  user.company = company || user.company;
  user.phone = phone || user.phone;
  users.set(req.user.email, user);

  res.json({
    message: 'Profile updated successfully',
    user: {
      email: user.email,
      name: user.name,
      company: user.company,
      phone: user.phone
    }
  });
});

// Change password
app.put('/api/user/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = users.get(req.user.email);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Current password incorrect' });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    users.set(req.user.email, user);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════
// SUBSCRIPTION ROUTES (Protected)
// ════════════════════════════════════════════════════════════

// Create payment order
app.post('/api/subscription/create-order', authenticateToken, (req, res) => {
  // TODO: Integrate with Razorpay
  // const order = await razorpay.orders.create({
  //   amount: 19900, // ₹199 in paise
  //   currency: 'INR',
  //   receipt: 'sub_' + Date.now()
  // });
  
  res.json({
    orderId: 'order_' + Date.now(),
    amount: 19900,
    currency: 'INR',
    key: process.env.RAZORPAY_KEY_ID || 'demo_key'
  });
});

// Verify payment
app.post('/api/subscription/verify', authenticateToken, (req, res) => {
  const { paymentId, orderId, signature } = req.body;

  // TODO: Verify signature with Razorpay
  // const isValid = verifyRazorpaySignature(orderId, paymentId, signature);

  // Activate subscription
  const subscription = subscriptions.get(req.user.email) || {};
  subscription.status = 'active';
  subscription.trial = false;
  subscription.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  subscriptions.set(req.user.email, subscription);

  res.json({
    message: 'Subscription activated',
    subscription
  });
});

// Cancel subscription
app.post('/api/subscription/cancel', authenticateToken, (req, res) => {
  const subscription = subscriptions.get(req.user.email);

  if (!subscription) {
    return res.status(404).json({ message: 'Subscription not found' });
  }

  subscription.status = 'cancelled';
  subscriptions.set(req.user.email, subscription);

  res.json({
    message: 'Subscription cancelled. Access until ' + subscription.currentPeriodEnd
  });
});

// ════════════════════════════════════════════════════════════
// SERVE FRONTEND
// ════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'profile.html'));
});

// ════════════════════════════════════════════════════════════
// START SERVER
// ════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         🚀  COD Analytics Server Running                ║
║                                                          ║
║         Port: ${PORT}                                      ║
║         Environment: ${process.env.NODE_ENV || 'development'}                            ║
║                                                          ║
║         📱  Login:     http://localhost:${PORT}/login      ║
║         📊  Dashboard: http://localhost:${PORT}/dashboard ║
║         ⚙️   Profile:   http://localhost:${PORT}/profile   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
