const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sno TEXT, principal TEXT, through TEXT, city TEXT,
      country TEXT, phone TEXT, email TEXT, address TEXT
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, visaNo TEXT, issueDate TEXT,
      principalId TEXT, vacancies INTEGER, description TEXT,
      permissionNo TEXT, permissionDate TEXT, country TEXT,
      status TEXT, type TEXT
    );

    CREATE TABLE IF NOT EXISTS visas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job TEXT, visaDate TEXT, principalId TEXT,
      principal TEXT, through TEXT, permissionNo TEXT,
      permissionDate TEXT, expiryDate TEXT, eNo TEXT,
      eNoDate TEXT, embassy TEXT, stampDate TEXT,
      regNo TEXT, regDate TEXT, appDate TEXT,
      status TEXT DEFAULT 'In Process',
      name TEXT, fatherName TEXT, passport TEXT,
      passIssueDate TEXT, passExpiryDate TEXT, idCard TEXT,
      idIssueDate TEXT, idExpiryDate TEXT, dob TEXT,
      pob TEXT, nationality TEXT, marital TEXT,
      empAddress TEXT, empPhone TEXT, empMobile TEXT,
      email TEXT, editor TEXT,
      flightNo TEXT, sector TEXT, dated TEXT, time TEXT,
      remarks TEXT, paymentOption TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sno TEXT, name TEXT, amount REAL, date TEXT,
      description TEXT, category TEXT
    );

    CREATE TABLE IF NOT EXISTS register (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sno TEXT, name TEXT, amount REAL, date TEXT,
      description TEXT, category TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT, title TEXT, hireDate TEXT,
      address TEXT, city TEXT, mobile TEXT, phone TEXT,
      email TEXT, username TEXT, password TEXT,
      status TEXT DEFAULT 'Active', level TEXT,
      reportsTo TEXT
    );
  `);

  // Seed sample data if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM clients').get().c;
  if (count === 0) seedData();
}

function seedData() {
  const insertClient = db.prepare(`INSERT INTO clients (sno,principal,through,city,country,phone,email,address)
    VALUES (?,?,?,?,?,?,?,?)`);
  const insertJob = db.prepare(`INSERT INTO jobs (title,visaNo,issueDate,principalId,vacancies,description,permissionNo,permissionDate,country,status,type)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const insertVisa = db.prepare(`INSERT INTO visas (id,job,visaDate,principalId,principal,through,permissionNo,name,fatherName,passport,idCard,dob,eNo,eNoDate,regNo,regDate,appDate,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertUser = db.prepare(`INSERT INTO users (name,title,hireDate,address,city,mobile,phone,email,username,password,status,level,reportsTo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  const tx = db.transaction(() => {
    insertClient.run('1451', '1451/01/ISB M/S, AHMED AMEEN BIN MUSA ALMOMIN', '1451/01/ISB', 'Alwaei Alkhamsah Recruitment Office', 'Saudi Arabia', '', '', '');
    insertClient.run('1450', '1450/01/KHI, ABDULLAH SAEED AL MEHRI TRADING COMPANY', '1450/01/KHI', 'CHAMBER OF COMMERCE NAJRAN', 'Saudi Arabia', '', '', '');

    insertJob.run('HOUSE WORKER', '1908132156', '01/01/1448', '1053396964', 50, 'House worker visa processing', 'PN-001', '01/01/1448', 'Saudi Arabia', 'Active', 'New');
    insertJob.run('LOADING UNLOADING WORKER', '1306168573', '15/12/1447', '7049016764', 100, 'Loading unloading worker', 'PN-002', '15/12/1447', 'Saudi Arabia', 'Active', 'New');

    insertVisa.run(1575, 'HOUSE WORKER, 1908132156', '01/01/1448', '1053396964', '1451/01/ISB M/S, AHMED AMEEN BIN MUSA ALMOMIN', '1451/01/ISB', 'PN-001', 'AHMED KHAN', 'MUHAMMAD KHAN', 'AB123456', '12345-6789012-3', '15/06/1990', 'EN-001', '10/12/1447', 'RG-001', '02/01/1448', '01/01/1448', 'In Process');
    insertVisa.run(1574, 'LOADING UNLOADING WORKER, 1306168573', '15/12/1447', '7049016764', '1450/01/KHI, ABDULLAH SAEED AL MEHRI TRADING COMPANY', '1450/01/KHI', 'PN-002', 'ALI RAZA', 'HUSSAIN RAZA', 'CD789012', '54321-0987654-3', '22/11/1985', 'EN-002', '08/12/1447', 'RG-002', '10/12/1447', '05/12/1447', 'In Process');

    insertUser.run('Nadar Khan', 'CEO', '12/08/2022', 'Office', 'Islamabad', '0300-1234567', '051-1234567', 'ceo@machhiana.com', 'nadir', 'nadir', 'Active', 'Admin', 'Super Admin');
  });
  tx();
}

module.exports = { getDb };
