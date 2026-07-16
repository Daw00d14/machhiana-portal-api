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

// ---- CSV Import endpoint ----
app.post('/api/import/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { rows } = req.body;
    if (!rows || !rows.length) return res.status(400).json({ error: 'No rows provided' });
    const allowed = ['clients','jobs','visas','accounts','register_data','users'];
    if (!allowed.includes(table)) return res.status(400).json({ error: 'Invalid table' });
    const { query } = require('../lib/db');
    let count = 0;
    for (const row of rows) {
      const keys = Object.keys(row);
      const vals = Object.values(row);
      const cols = keys.join(',');
      const ph = keys.map((_, i) => `$${i + 1}`).join(',');
      try {
        await query(`INSERT INTO ${table} (${cols}) VALUES (${ph})`, vals);
        count++;
      } catch (e) { /* skip bad rows */ }
    }
    res.json({ success: true, imported: count, total: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- Seed endpoint ----
const seedData = require('../lib/seed-data');
app.post('/api/seed', async (req, res) => {
  try {
    const { query } = require('../lib/db');
    for (const table of ['clients','jobs','visas','accounts','register_data','files']) {
      await query(`DELETE FROM ${table}`);
    }
    for (const item of seedData.clients) await query(
      `INSERT INTO clients (sno,principal,through,city,country) VALUES ($1,$2,$3,$4,$5)`,
      [item.sno, item.principal, item.through, item.city, item.country]
    );
    for (const item of seedData.jobs) await query(
      `INSERT INTO jobs (title,visa_no,issue_date,principal_id,vacancies,description,permission_no,permission_date,country,status,type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [item.title, item.visaNo, item.issue_date, item.principal_id, item.vacancies, item.description, item.permission_no, item.permission_date, item.country, item.status, item.type]
    );
    for (const item of seedData.visas) {
      const keys = Object.keys(item);
      const vals = Object.values(item);
      const cols = keys.join(',');
      const ph = keys.map((_,i) => `$${i+1}`).join(',');
      await query(`INSERT INTO visas (${cols}) VALUES (${ph})`, vals);
    }
    for (const item of seedData.accounts) await query(
      `INSERT INTO accounts (sno,name,amount,date,description,category) VALUES ($1,$2,$3,$4,$5,$6)`,
      [item.sno, item.name, item.amount, item.date, item.description, item.category]
    );
    for (const item of seedData.register) await query(
      `INSERT INTO register_data (sno,name,category,description) VALUES ($1,$2,$3,$4)`,
      [item.sno, item.name, item.category, item.description]
    );
    res.json({ success: true, counts: {
      clients: seedData.clients.length, jobs: seedData.jobs.length,
      visas: seedData.visas.length, accounts: seedData.accounts.length,
      register: seedData.register.length
    }});
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
