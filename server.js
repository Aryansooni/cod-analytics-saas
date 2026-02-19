const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
  res.sendFile('login.html', { root: __dirname });
});

app.get('/login.html', (req, res) => {
  res.sendFile('login.html', { root: __dirname });
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile('dashboard.html', { root: __dirname });
});

app.get('/profile.html', (req, res) => {
  res.sendFile('profile.html', { root: __dirname });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📱 Visit: http://localhost:${PORT}`);
});
