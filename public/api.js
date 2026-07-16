// Machhiana Portal - API Data Layer
// Replaces hardcoded data arrays with API-backed storage

const API = '/api';

// Generic API helpers
async function apiGet(url) {
  const r = await fetch(API + url);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiPost(url, data) {
  const r = await fetch(API + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiPut(url, data) {
  const r = await fetch(API + url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiDelete(url, data) {
  const r = await fetch(API + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Load all data from API
async function loadAllData() {
  try {
    const [c, j, v, a, r, u] = await Promise.all([
      apiGet('/clients'), apiGet('/jobs'), apiGet('/visas'),
      apiGet('/accounts'), apiGet('/register'), apiGet('/users')
    ]);
    clients.length = 0; jobs.length = 0; visas.length = 0;
    accounts.length = 0; registerData.length = 0; users.length = 0;
    clients.push(...c); jobs.push(...j); visas.push(...v);
    accounts.push(...a); registerData.push(...r); users.push(...u);
  } catch (e) {
    console.error('Failed to load data:', e);
  }
}

// Override login
const origDoLogin = doLogin;
doLogin = async function() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const captcha = document.getElementById('captchaInput').value.trim();
  if (!username || !password) { showToast('Enter credentials', 'error'); return; }
  if (captcha.toUpperCase() !== currentCaptcha) { showToast('Invalid captcha', 'error'); return; }
  try {
    const res = await apiPost('/login', { username, password });
    if (res.success) {
      currentUser = res.user;
      await loadAllData();
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.getElementById('app').classList.add('active');
      updateDashboardStats();
      showSection('dashboard');
      generateCaptcha();
    } else {
      showToast('Invalid credentials', 'error');
    }
  } catch(e) {
    showToast('Login failed', 'error');
  }
};

// Override CRUD functions - Clients
const origAddClient = addClient;
addClient = async function() {
  const c = {
    sno: document.getElementById('clientSno').value,
    principal: document.getElementById('clientPrincipal').value,
    through: document.getElementById('clientThrough').value,
    city: document.getElementById('clientCity').value,
    country: document.getElementById('clientCountry').value,
    phone: document.getElementById('clientPhone').value,
    email: document.getElementById('clientEmail').value,
    address: document.getElementById('clientAddress').value
  };
  try {
    const saved = await apiPost('/clients', c);
    saved.id = saved.id || Date.now();
    clients.unshift(saved);
    renderClients();
    updateDashboardStats();
    showToast('Client added successfully', 'success');
    showSection('clientsList');
  } catch(e) { showToast('Failed to add client', 'error'); }
};

const origSaveClient = saveClient;
saveClient = async function() {
  const id = parseInt(document.getElementById('editClientId').value);
  const c = clients.find(x => x.id === id);
  if (!c) return;
  Object.assign(c, {
    sno: document.getElementById('editClientSno').value,
    principal: document.getElementById('editClientPrincipal').value,
    through: document.getElementById('editClientThrough').value,
    city: document.getElementById('editClientCity').value,
    country: document.getElementById('editClientCountry').value,
    phone: document.getElementById('editClientPhone').value,
    email: document.getElementById('editClientEmail').value,
    address: document.getElementById('editClientAddress').value
  });
  try {
    await apiPut('/clients/' + id, c);
    renderClients();
    updateDashboardStats();
    showToast('Client updated successfully', 'success');
    showSection('clientsList');
  } catch(e) { showToast('Failed to update client', 'error'); }
};

const origDeleteSelectedClients = deleteSelectedClients;
deleteSelectedClients = async function() {
  const checked = document.querySelectorAll('#clientsBody .table-check:checked');
  if (checked.length === 0) { showToast('Select clients to delete', 'error'); return; }
  if (!confirm('Delete ' + checked.length + ' client(s)?')) return;
  const ids = [];
  checked.forEach(cb => {
    const row = cb.closest('tr');
    if (!row) return;
    const idCell = row.querySelector('td:nth-child(2)');
    ids.push(parseInt(idCell.textContent));
  });
  try {
    await apiDelete('/clients/delete', { ids });
    clients = clients.filter(c => !ids.includes(c.id));
    renderClients();
    updateDashboardStats();
    showToast(ids.length + ' client(s) deleted', 'success');
  } catch(e) { showToast('Failed to delete', 'error'); }
};

// Jobs
const origAddJob = addJob;
addJob = async function() {
  const j = {
    title: document.getElementById('jobTitle').value,
    visaNo: document.getElementById('jobVisaNo').value,
    issueDate: document.getElementById('jobIssueDate').value,
    principalId: document.getElementById('jobPrincipalId').value,
    vacancies: parseInt(document.getElementById('jobVacancies').value) || 0,
    description: document.getElementById('jobDescription').value,
    permissionNo: document.getElementById('jobPermissionNo').value,
    permissionDate: document.getElementById('jobPermissionDate').value,
    country: document.getElementById('jobCountry').value,
    status: document.querySelector('input[name="jobStatus"]:checked')?.value || 'Active',
    type: document.querySelector('input[name="jobType"]:checked')?.value || 'New'
  };
  try {
    const saved = await apiPost('/jobs', j);
    saved.id = saved.id || Date.now();
    jobs.unshift(saved);
    renderJobs();
    updateDashboardStats();
    showToast('Job added successfully', 'success');
    showSection('jobsList');
  } catch(e) { showToast('Failed to add job', 'error'); }
};

const origSaveJob = saveJob;
saveJob = async function() {
  const id = parseInt(document.getElementById('editJobId').value);
  const j = jobs.find(x => x.id === id);
  if (!j) return;
  Object.assign(j, {
    title: document.getElementById('editJobTitle').value,
    visaNo: document.getElementById('editJobVisaNo').value,
    issueDate: document.getElementById('editJobIssueDate').value,
    principalId: document.getElementById('editJobPrincipalId').value,
    vacancies: parseInt(document.getElementById('editJobVacancies').value) || 0,
    description: document.getElementById('editJobDescription').value,
    permissionNo: document.getElementById('editJobPermissionNo').value,
    permissionDate: document.getElementById('editJobPermissionDate').value,
    country: document.getElementById('editJobCountry').value,
    status: document.querySelector('input[name="editJobStatus"]:checked')?.value || 'Active',
    type: document.querySelector('input[name="editJobType"]:checked')?.value || 'New'
  });
  try {
    await apiPut('/jobs/' + id, j);
    renderJobs();
    updateDashboardStats();
    showToast('Job updated successfully', 'success');
    showSection('jobsList');
  } catch(e) { showToast('Failed to update job', 'error'); }
};

const origDeleteSelectedJobs = deleteSelectedJobs;
deleteSelectedJobs = async function() {
  const checked = document.querySelectorAll('#jobsBody .table-check:checked');
  if (checked.length === 0) { showToast('Select jobs to delete', 'error'); return; }
  if (!confirm('Delete ' + checked.length + ' job(s)?')) return;
  const ids = [];
  checked.forEach(cb => {
    const row = cb.closest('tr');
    if (!row) return;
    const idCell = row.querySelector('td:nth-child(2)');
    ids.push(parseInt(idCell.textContent));
  });
  try {
    await apiDelete('/jobs/delete', { ids });
    jobs = jobs.filter(j => !ids.includes(j.id));
    renderJobs();
    updateDashboardStats();
    showToast(ids.length + ' job(s) deleted', 'success');
  } catch(e) { showToast('Failed to delete', 'error'); }
};

// Visas
const origAddVisa = addVisa;
addVisa = async function() {
  const job = document.getElementById('visaJob').value;
  if (!job) { showToast('Please select a job', 'error'); return; }
  const statusRadio = document.querySelector('input[name="visaAppStatus"]:checked')?.value || 'In Process';
  const maritalRadio = document.querySelector('input[name="visaMarital"]:checked')?.value || 'Married';
  const v = {
    job, visaDate: document.getElementById('visaVisaDate').value,
    principalId: document.getElementById('visaPrincipalId').value,
    principal: document.getElementById('visaPrincipal').value,
    through: document.getElementById('visaThrough').value,
    permissionNo: document.getElementById('visaPermissionNo').value,
    permissionDate: document.getElementById('visaPermissionDate').value,
    expiryDate: document.getElementById('visaExpiryDate').value,
    eNo: document.getElementById('visaENo').value,
    eNoDate: document.getElementById('visaENoDate').value,
    embassy: document.getElementById('visaEmbassy').value,
    stampDate: document.getElementById('visaStampDate').value,
    regNo: document.getElementById('visaRegNo').value,
    regDate: document.getElementById('visaRegDate').value,
    appDate: document.getElementById('visaAppDate').value,
    status: statusRadio,
    name: document.getElementById('visaName').value,
    fatherName: document.getElementById('visaFatherName').value,
    passport: document.getElementById('visaPassport').value,
    passIssueDate: document.getElementById('visaPassIssueDate').value,
    passExpiryDate: document.getElementById('visaPassExpiryDate').value,
    idCard: document.getElementById('visaIdCard').value,
    idIssueDate: document.getElementById('visaIdIssueDate').value,
    idExpiryDate: document.getElementById('visaIdExpiryDate').value,
    dob: document.getElementById('visaDob').value,
    pob: document.getElementById('visaPob').value,
    nationality: document.getElementById('visaNationality').value,
    marital: maritalRadio,
    empAddress: document.getElementById('visaEmpAddress').value,
    empPhone: document.getElementById('visaEmpPhone').value,
    empMobile: document.getElementById('visaEmpMobile').value,
    email: document.getElementById('visaEmail').value,
    flightNo: document.getElementById('visaFlightNo').value,
    sector: document.getElementById('visaSector').value,
    dated: document.getElementById('visaDated').value,
    time: document.getElementById('visaTime').value,
    remarks: document.getElementById('visaRemarks')?.textContent || '',
    paymentOption: document.getElementById('visaPaymentOption').value
  };
  try {
    const saved = await apiPost('/visas', v);
    saved.id = saved.id || Date.now();
    visas.unshift(saved);
    renderVisas();
    updateDashboardStats();
    showToast('Visa added successfully', 'success');
    showSection('visaList');
  } catch(e) { showToast('Failed to add visa', 'error'); }
};

const origSaveVisa = saveVisa;
saveVisa = async function() {
  var editId = document.getElementById('visaEditId').value;
  if (editId) {
    const id = parseInt(editId);
    var v = visas.find(x => x.id === id);
    if (!v) return;
    Object.assign(v, {
      job: document.getElementById('visaJob').value,
      visaDate: document.getElementById('visaVisaDate').value,
      principalId: document.getElementById('visaPrincipalId').value,
      principal: document.getElementById('visaPrincipal').value,
      through: document.getElementById('visaThrough').value,
      permissionNo: document.getElementById('visaPermissionNo').value,
      permissionDate: document.getElementById('visaPermissionDate').value,
      expiryDate: document.getElementById('visaExpiryDate').value,
      eNo: document.getElementById('visaENo').value,
      eNoDate: document.getElementById('visaENoDate').value,
      embassy: document.getElementById('visaEmbassy').value,
      stampDate: document.getElementById('visaStampDate').value,
      regNo: document.getElementById('visaRegNo').value,
      regDate: document.getElementById('visaRegDate').value,
      appDate: document.getElementById('visaAppDate').value,
      status: document.querySelector('input[name="visaAppStatus"]:checked')?.value || 'In Process',
      name: document.getElementById('visaName').value,
      fatherName: document.getElementById('visaFatherName').value,
      passport: document.getElementById('visaPassport').value,
      passIssueDate: document.getElementById('visaPassIssueDate').value,
      passExpiryDate: document.getElementById('visaPassExpiryDate').value,
      idCard: document.getElementById('visaIdCard').value,
      idIssueDate: document.getElementById('visaIdIssueDate').value,
      idExpiryDate: document.getElementById('visaIdExpiryDate').value,
      dob: document.getElementById('visaDob').value,
      pob: document.getElementById('visaPob').value,
      nationality: document.getElementById('visaNationality').value,
      marital: document.querySelector('input[name="visaMarital"]:checked')?.value || 'Married',
      empAddress: document.getElementById('visaEmpAddress').value,
      empPhone: document.getElementById('visaEmpPhone').value,
      empMobile: document.getElementById('visaEmpMobile').value,
      email: document.getElementById('visaEmail').value,
      editor: document.getElementById('visaEditor').value,
      flightNo: document.getElementById('visaFlightNo').value,
      sector: document.getElementById('visaSector').value,
      dated: document.getElementById('visaDated').value,
      time: document.getElementById('visaTime').value,
      remarks: document.getElementById('visaRemarks')?.textContent || '',
      paymentOption: document.getElementById('visaPaymentOption').value
    });
    try {
      await apiPut('/visas/' + id, v);
      renderVisas();
      updateDashboardStats();
      showToast('Visa updated successfully', 'success');
      showSection('visaList');
    } catch(e) { showToast('Failed to update visa', 'error'); }
  } else {
    origAddVisa();
  }
  // Reset form
  document.getElementById('visaEditId').value = '';
  document.getElementById('visaFormLabel').textContent = 'Add';
  document.getElementById('visaSubmitLabel').textContent = 'Add';
  document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', i===0));
  document.querySelectorAll('.tab-pane').forEach((p,i) => p.style.display = i===0 ? 'block' : 'none');
};

const origDeleteSelectedVisas = deleteSelectedVisas;
deleteSelectedVisas = async function() {
  const checked = document.querySelectorAll('#visaBody .table-check:checked');
  if (checked.length === 0) { showToast('Select visas to delete', 'error'); return; }
  if (!confirm('Delete ' + checked.length + ' visa(s)?')) return;
  const ids = [];
  checked.forEach(cb => {
    const row = cb.closest('tr');
    if (!row) return;
    const idCell = row.querySelector('td:nth-child(3)');
    ids.push(parseInt(idCell.textContent));
  });
  try {
    await apiDelete('/visas/delete', { ids });
    visas = visas.filter(v => !ids.includes(v.id));
    renderVisas();
    updateDashboardStats();
    showToast(ids.length + ' visa(s) deleted', 'success');
  } catch(e) { showToast('Failed to delete', 'error'); }
};

// File upload
const origSaveVisaWithDocs = origSaveVisa;
const visaFileInput = document.getElementById('visaDocuments');
if (visaFileInput) {
  visaFileInput.addEventListener('change', async function(e) {
    const files = e.target.files;
    if (!files.length) return;
    const uploaded = [];
    for (let f of files) {
      const reader = new FileReader();
      const data = await new Promise(resolve => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(f);
      });
      try {
        const res = await apiPost('/upload', { name: f.name, data });
        uploaded.push(res.url);
      } catch(e) { console.error('Upload failed:', f.name); }
    }
    this.dataset.uploaded = JSON.stringify(uploaded);
    showToast(uploaded.length + ' file(s) uploaded', 'success');
  });
}
