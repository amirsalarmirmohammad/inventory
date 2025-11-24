
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(path.join(__dirname, 'inventory.db'));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      quantity TEXT,
      location TEXT,
      category TEXT,
      description TEXT
    );
  `);
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/items', (_req, res) => {
  db.all('SELECT * FROM items ORDER BY id DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ message: 'Failed to read items', error: err.message });
      return;
    }
    res.json({ items: rows });
  });
});

app.post('/api/items', (req, res) => {
  const { name, code, quantity = '0', location = '', category = '', description = '' } = req.body || {};

  if (!name || !code) {
    res.status(400).json({ message: 'name and code are required' });
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO items (name, code, quantity, location, category, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(name, code, quantity, location, category, description, err => {
    if (err) {
      res.status(500).json({ message: 'Failed to create item', error: err.message });
      return;
    }

    db.all('SELECT * FROM items ORDER BY id DESC', (listErr, rows) => {
      if (listErr) {
        res.status(500).json({ message: 'Failed to read items', error: listErr.message });
        return;
      }
      res.status(201).json({ items: rows });
    });
  });
});

app.delete('/api/items/:id', (req, res) => {
  db.run('DELETE FROM items WHERE id = ?', [req.params.id], err => {
    if (err) {
      res.status(500).json({ message: 'Failed to delete item', error: err.message });
      return;
    }
    res.json({ success: true });
  });
});

app.delete('/api/items', (_req, res) => {
  db.run('DELETE FROM items', err => {
    if (err) {
      res.status(500).json({ message: 'Failed to clear items', error: err.message });
      return;
    }
    res.json({ success: true });
  });
});

app.listen(port, () => {
  console.log(`Inventory API listening on port ${port}`);
});
 
