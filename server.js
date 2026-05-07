import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize SQLite database
const dbPath = process.env.DB_PATH || 'database.sqlite';
const db = new Database(dbPath);

// Create users table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Validation functions
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidPassword(password) {
  return password && password.length >= 8;
}

function isValidName(name) {
  return name && name.trim().length >= 2;
}

// Route to handle signup
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  
  // Input Validation
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (!isValidName(name)) {
    return res.status(400).json({ error: 'Name must be at least 2 characters' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const stmt = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
    const info = stmt.run(name, email, hashedPassword); 
    res.status(201).json({ success: true, message: 'User created successfully', userId: info.lastInsertRowid });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }
});

// Route to handle login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email); 

    if (user && await bcrypt.compare(password, user.password_hash)) {
      res.status(200).json({ 
        success: true, 
        message: 'Login successful', 
        user: { id: user.id, name: user.name, email: user.email } 
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Route to view all users (Admin) - Returns JSON
app.get('/api/users', (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC');
    const users = stmt.all();
    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Catch-all route to serve the frontend for any other requests
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
