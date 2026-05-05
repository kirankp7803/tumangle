import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
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
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Route to handle signup
app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Note: In a real app, passwords should be hashed using bcrypt before storing!
    const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
    const info = stmt.run(name || null, email, password); 
    res.status(201).json({ success: true, message: 'User created successfully', userId: info.lastInsertRowid });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }
});

// Route to handle login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Note: In a real app, compare hashed passwords!
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?');
    const user = stmt.get(email, password); 

    if (user) {
      res.status(200).json({ 
        success: true, 
        message: 'Login successful', 
        user: { name: user.name, email: user.email } 
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Route to view all users (Admin)
app.get('/api/users', (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC');
    const users = stmt.all();
    
    // We can return JSON or simple HTML
    let html = '<h1>Registered Users</h1><table border="1" cellpadding="10" style="border-collapse: collapse;">';
    html += '<tr><th>ID</th><th>Name</th><th>Email</th><th>Signed Up At</th></tr>';
    
    users.forEach(u => {
      html += `<tr><td>${u.id}</td><td>${u.name || 'N/A'}</td><td>${u.email}</td><td>${u.created_at}</td></tr>`;
    });
    html += '</table>';

    res.send(html);
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
