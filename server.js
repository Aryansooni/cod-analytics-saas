const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'mysupersecretkey123456789abc';
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// MongoDB Connection
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));
} else {
  console.log('⚠️  No MONGODB_URI - running without database');
}

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  company: String,
  phone: String,
  subscription: { 
    status: { type: String, default: 'trial' },
    trialEndsAt: Date
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Report Schema  
const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: String,
  codData: Object,
  allData: Object,
  hubName: String,
  uploadedAt: { type: Date, default: Date.now }
});

const Report = mongoose.model('Report', reportSchema);

// Auth Middleware
function auth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// SIGNUP
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, company, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User exists' });
    
    const hashedPass = await bcrypt.hash(password, 10);
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    
    const user = await User.create({
      email, password: hashedPass, name, company, phone,
      subscription: { status: 'trial', trialEndsAt: trialEnd }
    });
    
    const token = jwt.sign({ userId: user._id, email, name }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({
      token,
      user: { id: user._id, email, name, company, phone, subscription: 'trial', trial: true, trialDaysLeft: 7 }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error: ' + error.message });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign({ userId: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
    
    const now = new Date();
    let trialDays = 0;
    if (user.subscription.status === 'trial') {
      trialDays = Math.max(0, Math.ceil((user.subscription.trialEndsAt - now) / 86400000));
    }
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        company: user.company,
        phone: user.phone,
        subscription: user.subscription.status,
        trial: user.subscription.status === 'trial',
        trialDaysLeft: trialDays
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error: ' + error.message });
  }
});

// GET PROFILE
app.get('/api/user/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ email: user.email, name: user.name, company: user.company, phone: user.phone });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
});

// UPDATE PROFILE
app.put('/api/user/profile', auth, async (req, res) => {
  try {
    const { name, company, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user.userId, { name, company, phone }, { new: true });
    res.json({ message: 'Updated', user: { name: user.name, company: user.company, phone: user.phone } });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
});
app.put('/api/user/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Current password incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Error updating password' });
  }
});

// SAVE REPORT
app.post('/api/reports/save', auth, async (req, res) => {
  try {
    const { timestamp, codData, allData, hubName } = req.body;
    await Report.create({ userId: req.user.userId, timestamp, codData, allData, hubName });
    res.json({ message: 'Saved' });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
});

// GET HISTORY
app.get('/api/reports/history', auth, async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.userId }).sort({ uploadedAt: -1 }).limit(20);
    const history = reports.map(r => ({
      ts: r.timestamp,
      cod: { delivered: r.codData?.delivered || 0, total: r.codData?.total || 0, hubName: r.hubName },
      all: { total: r.allData?.total || 0 },
      saved: r.uploadedAt
    }));
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
});
app.get('/api/admin/stats', auth, async (req, res) => {
  try {

    // ✅ CHANGE THIS TO YOUR EMAIL
    if (req.user.email !== "contactpripanda@gmail.com") {
      return res.status(403).json({ message: "Access denied" });
    }

    const totalUsers = await User.countDocuments();
    const trialUsers = await User.countDocuments({ "subscription.status": "trial" });
    const activeUsers = await User.countDocuments({ "subscription.status": "active" });
    const cancelledUsers = await User.countDocuments({ "subscription.status": "cancelled" });
    const expiredUsers = await User.countDocuments({ "subscription.status": "expired" });

    res.json({
      totalUsers,
      trialUsers,
      activeUsers,
      cancelledUsers,
      expiredUsers
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching stats" });
  }
});
// SERVE FILES
app.get('/', (req, res) => res.sendFile('login.html', { root: __dirname }));
app.get('/login.html', (req, res) => res.sendFile('login.html', { root: __dirname }));
app.get('/dashboard.html', (req, res) => res.sendFile('dashboard.html', { root: __dirname }));
app.get('/profile.html', (req, res) => res.sendFile('profile.html', { root: __dirname }));

app.listen(PORT, () => {
  console.log(`✅ Server on port ${PORT}`);
});
