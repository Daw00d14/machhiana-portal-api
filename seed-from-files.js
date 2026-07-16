// Seed from CSVs directly into PostgreSQL
// Usage: POSTGRES_URL=postgres://... node seed-from-files.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRESS_URL || process.env.POSTGRES_URL });
const DOWNLOADS = '/home/dawood/Downloads';

function parseCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  const lines = text.split('\n');
  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length < 2) continue;
    const row = {};
    headers.forEach((h, idx) => {
      let key = h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      if (key === 's_no_' || key === 'sno' || key === 's_no') key = 'sno';
      if (key === 'id') key = 'original_id';
      row[key] = (vals[idx] || '').replace(/^"|"$/g, '');
    });
    rows.push(row);
  }
  return rows;
}

function parseLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes; continue; }
    if (line[i] === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += line[i];
  }
  result.push(current);
  return result;
}

async function main() {
  console.log('Seeding from CSV files...\n');

  // Clear existing
  const client = await pool.connect();
  try {
    for (const table of ['clients','jobs','visas','accounts','register_data','users','files']) {
      await client.query(`DELETE FROM ${table}`);
    }

    // --- Clients ---
    const clients = parseCSV(path.join(DOWNLOADS, 'clients.csv'));
    for (const r of clients) {
      await client.query(
        `INSERT INTO clients (sno,principal,through,city,country,phone,email)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [r.sno, r.principal, r.through, r.city, r.country, r.phone||'', r.email||'']
      );
    }
    console.log(`Clients: ${clients.length} imported`);

    // --- Jobs ---
    const jobs = parseCSV(path.join(DOWNLOADS, 'jobs.csv'));
    for (const r of jobs) {
      await client.query(
        `INSERT INTO jobs (title,visa_no,issue_date,principal_id,vacancies,description,permission_no,permission_date,country,status,type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [r.job_title, r.visa_no, r.visa_issue_date, r.principal_id,
         parseInt(r.vacancies)||0, r.job_description, r.permission_no_, r.permission_issue_date,
         r.country, r.job_status || 'Active', r.job_type || 'New']
      );
    }
    console.log(`Jobs: ${jobs.length} imported`);

    // --- Visas ---
    const visas = parseCSV(path.join(DOWNLOADS, 'visaapps.csv'));
    for (const r of visas) {
      await client.query(
        `INSERT INTO visas (job,visa_date,principal_id,principal,through,permission_no,name,father_name,passport,id_card,dob,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [r.job, r.visa_issue_date, r.principal_id, r.principal, r.through,
         r.permission_no_, r.name, r.father_name, r.passport_no_, String(r.id_card_no_||''),
         r.date_of_birth, r.application_status || 'In Process']
      );
    }
    console.log(`Visas: ${visas.length} imported`);

    // --- Accounts ---
    const accounts = parseCSV(path.join(DOWNLOADS, 'accounts.csv'));
    for (const r of accounts) {
      await client.query(
        `INSERT INTO accounts (sno,name,amount,date,description) VALUES ($1,$2,$3,$4,$5)`,
        [r.s_no_, r.application_passport_no_name, parseFloat(r.total_amount)||0,
         r.creation_date, r.remarks || '']
      );
    }
    console.log(`Accounts: ${accounts.length} imported`);

    // --- Users ---
    const users = parseCSV(path.join(DOWNLOADS, 'emps.csv'));
    for (const r of users) {
      await client.query(
        `INSERT INTO users (name,title,hire_date,address,city,mobile,phone,email,username,password,status,level)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [r.employee_name, r.job_title, r.hire_date, r.address, r.city,
         r.mobile___, r.phone___, r.email, r.user_name, 'nadir',
         r.status || 'Active', r.user_level || 'User']
      );
    }
    console.log(`Users: ${users.length} imported`);

    // --- Register ---
    const reg = parseCSV(path.join(DOWNLOADS, 'register_accounts.csv'));
    for (const r of reg) {
      await client.query(
        `INSERT INTO register_data (sno,name,category,description) VALUES ($1,$2,$3,$4)`,
        [r.s_no_, r.expense_acc_title, r.account_type, r.city || '']
      );
    }
    console.log(`Register: ${reg.length} imported`);

    console.log('\nAll data imported successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
