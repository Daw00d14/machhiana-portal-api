const { Pool } = require('pg');

// Use Vercel Postgres env var, or local postgres connection string
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
}

async function query(text, params = []) {
  const client = await getPool().connect();
  try {
    await client.query('SET search_path TO public');
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      sno TEXT, principal TEXT, through TEXT, city TEXT,
      country TEXT, phone TEXT, email TEXT, address TEXT
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      title TEXT, visaNo TEXT, issue_date TEXT,
      principal_id TEXT, vacancies INTEGER, description TEXT,
      permission_no TEXT, permission_date TEXT, country TEXT,
      status TEXT, type TEXT
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS visas (
      id SERIAL PRIMARY KEY,
      job TEXT, visa_date TEXT, principal_id TEXT,
      principal TEXT, through TEXT, permission_no TEXT,
      permission_date TEXT, expiry_date TEXT, e_no TEXT,
      e_no_date TEXT, embassy TEXT, stamp_date TEXT,
      reg_no TEXT, reg_date TEXT, app_date TEXT,
      status TEXT DEFAULT 'In Process',
      name TEXT, father_name TEXT, passport TEXT,
      pass_issue_date TEXT, pass_expiry_date TEXT, id_card TEXT,
      id_issue_date TEXT, id_expiry_date TEXT, dob TEXT,
      pob TEXT, nationality TEXT, marital TEXT,
      emp_address TEXT, emp_phone TEXT, emp_mobile TEXT,
      email TEXT, editor TEXT,
      flight_no TEXT, sector TEXT, dated TEXT, time TEXT,
      remarks TEXT, payment_option TEXT
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      sno TEXT, name TEXT, amount REAL, date TEXT,
      description TEXT, category TEXT
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS register_data (
      id SERIAL PRIMARY KEY,
      sno TEXT, name TEXT, amount REAL, date TEXT,
      description TEXT, category TEXT
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT, title TEXT, hire_date TEXT,
      address TEXT, city TEXT, mobile TEXT, phone TEXT,
      email TEXT, username TEXT, password TEXT,
      status TEXT DEFAULT 'Active', level TEXT,
      reports_to TEXT
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      name TEXT, data TEXT, created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed if empty
  const { rows } = await query('SELECT COUNT(*) as c FROM clients');
  if (parseInt(rows[0].c) === 0) await seedData();
}

async function seedData() {
  await query(`INSERT INTO clients (sno,principal,through,city,country) VALUES ($1,$2,$3,$4,$5)`,
    ['1451', '1451/01/ISB M/S, AHMED AMEEN BIN MUSA ALMOMIN', '1451/01/ISB', 'Alwaei Alkhamsah Recruitment Office', 'Saudi Arabia']);
  await query(`INSERT INTO clients (sno,principal,through,city,country) VALUES ($1,$2,$3,$4,$5)`,
    ['1450', '1450/01/KHI, ABDULLAH SAEED AL MEHRI TRADING COMPANY', '1450/01/KHI', 'CHAMBER OF COMMERCE NAJRAN', 'Saudi Arabia']);

  await query(`INSERT INTO jobs (title,visaNo,vacancies,status,type) VALUES ($1,$2,$3,$4,$5)`,
    ['HOUSE WORKER', '1908132156', 50, 'Active', 'New']);
  await query(`INSERT INTO jobs (title,visaNo,vacancies,status,type) VALUES ($1,$2,$3,$4,$5)`,
    ['LOADING UNLOADING WORKER', '1306168573', 100, 'Active', 'New']);

  await query(`INSERT INTO visas (id,job,visa_date,principal_id,principal,through,permission_no,name,father_name,passport,id_card,dob,e_no,e_no_date,reg_no,reg_date,app_date,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [1575, 'HOUSE WORKER, 1908132156', '01/01/1448', '1053396964', '1451/01/ISB M/S, AHMED AMEEN BIN MUSA ALMOMIN', '1451/01/ISB', 'PN-001', 'AHMED KHAN', 'MUHAMMAD KHAN', 'AB123456', '12345-6789012-3', '15/06/1990', 'EN-001', '10/12/1447', 'RG-001', '02/01/1448', '01/01/1448', 'In Process']);

  await query(`INSERT INTO users (name,title,hire_date,username,password,level) VALUES ($1,$2,$3,$4,$5,$6)`,
    ['Nadar Khan', 'CEO', '2022-08-12', 'nadir', 'nadir', 'Admin']);
}

async function getAll(table, orderCol = 'id') {
  const { rows } = await query(`SELECT * FROM ${table} ORDER BY ${orderCol} DESC`);
  return rows;
}

async function getOne(table, id) {
  const { rows } = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return rows[0];
}

async function create(table, data) {
  const keys = Object.keys(data);
  const vals = Object.values(data);
  const cols = keys.join(',');
  const ph = keys.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await query(`INSERT INTO ${table} (${cols}) VALUES (${ph}) RETURNING *`, vals);
  return rows[0];
}

async function update(table, id, data) {
  const keys = Object.keys(data);
  const vals = Object.values(data);
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(',');
  vals.push(id);
  await query(`UPDATE ${table} SET ${set} WHERE id = $${vals.length}`, vals);
  return { ...data, id };
}

async function bulkDelete(table, ids) {
  if (!ids.length) return { deleted: 0 };
  const ph = ids.map((_, i) => `$${i + 1}`).join(',');
  await query(`DELETE FROM ${table} WHERE id IN (${ph})`, ids);
  return { deleted: ids.length };
}

async function login(username, password) {
  const { rows } = await query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
  if (rows.length) {
    const u = rows[0];
    return { success: true, user: { id: u.id, name: u.name, username: u.username, level: u.level } };
  }
  return null;
}

module.exports = { initSchema, getAll, getOne, create, update, bulkDelete, login, query };
