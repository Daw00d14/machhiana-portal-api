const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- Generic CRUD helper ----
function crudRoutes(table, idField = 'id') {
  const router = express.Router();
  const db = getDb();

  // List all
  router.get('/', (req, res) => {
    try {
      const rows = db.prepare(`SELECT * FROM ${table} ORDER BY ${idField} DESC`).all();
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Get one
  router.get('/:id', (req, res) => {
    try {
      const row = db.prepare(`SELECT * FROM ${table} WHERE ${idField} = ?`).get(Number(req.params.id));
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Create
  router.post('/', (req, res) => {
    try {
      const keys = Object.keys(req.body);
      const vals = keys.map(k => req.body[k]);
      const cols = keys.join(',');
      const ph = keys.map(() => '?').join(',');
      const result = db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${ph})`).run(...vals);
      res.json({ id: result.lastInsertRowid, ...req.body });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Update
  router.put('/:id', (req, res) => {
    try {
      const keys = Object.keys(req.body);
      const vals = keys.map(k => req.body[k]);
      const set = keys.map(k => `${k}=?`).join(',');
      vals.push(Number(req.params.id));
      db.prepare(`UPDATE ${table} SET ${set} WHERE ${idField}=?`).run(...vals);
      res.json({ ...req.body, [idField]: Number(req.params.id) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Bulk delete
  router.post('/delete', (req, res) => {
    try {
      const ids = req.body.ids || [];
      if (!ids.length) return res.status(400).json({ error: 'No IDs provided' });
      const ph = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM ${table} WHERE ${idField} IN (${ph})`).run(...ids);
      res.json({ deleted: ids.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
}

// ---- Routes ----
app.use('/api/clients', crudRoutes('clients'));
app.use('/api/jobs', crudRoutes('jobs'));
app.use('/api/visas', crudRoutes('visas'));
app.use('/api/accounts', crudRoutes('accounts'));
app.use('/api/register', crudRoutes('register'));
app.use('/api/users', crudRoutes('users'));

// ---- File upload (base64) ----
app.post('/api/upload', (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) return res.status(400).json({ error: 'name and data required' });
    const db = getDb();
    db.prepare(`CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, data TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`).run();
    const result = db.prepare('INSERT INTO files (name,data) VALUES (?,?)').run(name, data);
    res.json({ id: result.lastInsertRowid, name, url: `/api/files/${result.lastInsertRowid}/${name}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Serve uploaded files
app.get('/api/files/:id/:name', (req, res) => {
  try {
    const db = getDb();
    const file = db.prepare('SELECT * FROM files WHERE id=?').get(Number(req.params.id));
    if (!file) return res.status(404).json({ error: 'File not found' });
    const buf = Buffer.from(file.data, 'base64');
    const ext = path.extname(file.name).toLowerCase();
    const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf' }[ext] || 'application/octet-stream';
    res.set('Content-Type', mime);
    res.send(buf);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- Auth ----
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username=? AND password=?').get(username, password);
  if (user) {
    res.json({ success: true, user: { id: user.id, name: user.name, username: user.username, level: user.level } });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// ---- Serve frontend ----
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Machhiana Portal API running on port ${PORT}`);
});
