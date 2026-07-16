const express = require('express');
const app = express();
const path = require('path');
const db = require('../lib/db');

app.use(express.json({ limit: '50mb' }));

// ---- Generic CRUD ----
function crudRoutes(table, idField = 'id') {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try { res.json(await db.getAll(table)); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/:id', async (req, res) => {
    try {
      const row = await db.getOne(table, Number(req.params.id));
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/', async (req, res) => {
    try { res.json(await db.create(table, req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.put('/:id', async (req, res) => {
    try { res.json(await db.update(table, Number(req.params.id), req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/delete', async (req, res) => {
    try { res.json(await db.bulkDelete(table, req.body.ids || [])); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
}

app.use('/api/clients', crudRoutes('clients'));
app.use('/api/jobs', crudRoutes('jobs'));
app.use('/api/visas', crudRoutes('visas'));
app.use('/api/accounts', crudRoutes('accounts'));
app.use('/api/register', crudRoutes('register_data'));
app.use('/api/users', crudRoutes('users'));

// Login
app.post('/api/login', async (req, res) => {
  try {
    const result = await db.login(req.body.username, req.body.password);
    if (result) res.json(result);
    else res.status(401).json({ success: false, error: 'Invalid credentials' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// File upload
app.post('/api/upload', async (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) return res.status(400).json({ error: 'name and data required' });
    const file = await db.create('files', { name, data });
    res.json({ id: file.id, name, url: `/api/files/${file.id}/${name}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Serve uploaded files
app.get('/api/files/:id/:name', async (req, res) => {
  try {
    const file = await db.getOne('files', Number(req.params.id));
    if (!file) return res.status(404).json({ error: 'Not found' });
    const buf = Buffer.from(file.data, 'base64');
    const ext = path.extname(file.name).toLowerCase();
    const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf' }[ext] || 'application/octet-stream';
    res.set('Content-Type', mime);
    res.send(buf);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Serve frontend
app.use('/machh', express.static(path.join(__dirname, '..', 'public', 'machh')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Init DB on first load
db.initSchema().catch(console.error);

module.exports = app;
