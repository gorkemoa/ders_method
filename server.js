const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database connection
let db;

async function initDatabase() {
  try {
    // Create SQLite database
    db = new sqlite3.Database('./database.sqlite', (err) => {
      if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
      }
    });

    // Create tables
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        // Users table
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Daily entries table
        db.run(`
          CREATE TABLE IF NOT EXISTS daily_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            counts TEXT NOT NULL,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, date),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            console.error('Error creating tables:', err);
            reject(err);
          } else {
            console.log('Database initialized successfully');
            resolve();
          }
        });
      });
    });

  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Helper function for database queries
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Routes

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await dbRun(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    // Generate JWT
    const token = jwt.sign(
      { id: result.id, email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '30d' }
    );

    res.json({
      message: 'User created successfully',
      token,
      user: { id: result.id, name, email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await dbGet(
      'SELECT id, name, email, password FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's entry
app.get('/api/daily-entry', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const entry = await dbGet(
      'SELECT * FROM daily_entries WHERE user_id = ? AND date = ?',
      [req.user.id, today]
    );

    if (entry) {
      res.json({
        counts: JSON.parse(entry.counts),
        note: entry.note || ''
      });
    } else {
      res.json({ counts: {}, note: '' });
    }
  } catch (error) {
    console.error('Get daily entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save today's entry
app.post('/api/daily-entry', authenticateToken, async (req, res) => {
  try {
    const { counts, note } = req.body;
    const today = new Date().toISOString().split('T')[0];

    if (!counts || typeof counts !== 'object') {
      return res.status(400).json({ error: 'Counts object required' });
    }

    // Check if entry exists
    const existingEntry = await dbGet(
      'SELECT id FROM daily_entries WHERE user_id = ? AND date = ?',
      [req.user.id, today]
    );

    if (existingEntry) {
      // Update existing entry
      await dbRun(
        'UPDATE daily_entries SET counts = ?, note = ? WHERE user_id = ? AND date = ?',
        [JSON.stringify(counts), note || '', req.user.id, today]
      );
    } else {
      // Create new entry
      await dbRun(
        'INSERT INTO daily_entries (user_id, date, counts, note) VALUES (?, ?, ?, ?)',
        [req.user.id, today, JSON.stringify(counts), note || '']
      );
    }

    res.json({ message: 'Entry saved successfully' });
  } catch (error) {
    console.error('Save daily entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get history
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const entries = await dbAll(
      'SELECT date, counts, note FROM daily_entries WHERE user_id = ? ORDER BY date DESC LIMIT 10',
      [req.user.id]
    );

    const history = entries.map(entry => ({
      date: entry.date,
      counts: JSON.parse(entry.counts),
      note: entry.note
    }));

    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch(console.error);