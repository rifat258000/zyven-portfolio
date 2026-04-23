/* ══════════════════════════════════════════
   ADMIN.JS — Admin panel logic
   ══════════════════════════════════════════ */

let adminToken = '';
let editingContestId = null;
let editingProjectId = null;

// ── Auth ─────────────────────────────────
async function adminLogin(e) {
  e.preventDefault();
  const pw = document.getElementById('admin-password').value;
  const errEl = document.getElementById('login-error');

  try {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    const data = await r.json();
    if (data.ok) {
      adminToken = data.token;
      document.getElementById('login-view').style.display = 'none';
      document.getElementById('dashboard-view').style.display = 'block';
      loadAdminContests();
      loadAdminProjects();
      loadAdminSettings();
    } else {
      errEl.textContent = 'Wrong password';
      errEl.style.display = 'block';
    }
  } catch {
    errEl.textContent = 'Connection failed';
    errEl.style.display = 'block';
  }
}

async function adminLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  adminToken = '';
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('dashboard-view').style.display = 'none';
  document.getElementById('admin-password').value = '';
}

async function checkAuth() {
  try {
    const r = await fetch('/api/auth/check');
    const data = await r.json();
    if (data.authenticated) {
      document.getElementById('login-view').style.display = 'none';
      document.getElementById('dashboard-view').style.display = 'block';
      loadAdminContests();
      loadAdminProjects();
      loadAdminSettings();
    }
  } catch {}
}

function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (adminToken) h['X-Admin-Token'] = adminToken;
  return h;
}

// ── Tabs ─────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`panel-${tab}`).classList.add('active');
}

// ── Toast ────────────────────────────────
function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ══ CONTESTS ════════════════════════════

async function loadAdminContests() {
  try {
    const r = await fetch('/api/contests?status=all');
    const contests = await r.json();
    const tbody = document.getElementById('contests-tbody');
    if (!tbody) return;

    tbody.innerHTML = contests.map(c => `
      <tr>
        <td>${c.pinned ? '\uD83D\uDCCC ' : ''}${esc(c.title)}</td>
        <td><span class="contest-category ${c.category}" style="font-size:.7rem">${c.category}</span></td>
        <td>${esc(c.source)}</td>
        <td>${c.status}</td>
        <td>${c.deadline ? new Date(c.deadline).toLocaleDateString() : '-'}</td>
        <td>${esc(c.prize || '-')}</td>
        <td class="actions">
          <button onclick="editContest(${c.id})">Edit</button>
          <button onclick="togglePinAdmin(${c.id})">${c.pinned ? 'Unpin' : 'Pin'}</button>
          <button class="del" onclick="deleteContest(${c.id})">Del</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Load contests failed:', e);
  }
}

async function saveContest(e) {
  e.preventDefault();
  const form = document.getElementById('contest-form');
  const data = {
    title: form.title.value,
    source: form.source.value,
    description: form.description.value,
    category: form.category.value,
    deadline: form.deadline.value || null,
    prize: form.prize.value,
    url: form.url.value,
    image_url: form.image_url.value,
    status: form.status.value,
    pinned: form.pinned.checked,
  };

  const url = editingContestId ? `/api/contests/${editingContestId}` : '/api/contests';
  const method = editingContestId ? 'PUT' : 'POST';

  try {
    const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(data) });
    if (r.ok) {
      toast(editingContestId ? 'Contest updated' : 'Contest created');
      resetContestForm();
      loadAdminContests();
    } else {
      const err = await r.json();
      toast(err.error || 'Failed', 'error');
    }
  } catch {
    toast('Connection failed', 'error');
  }
}

async function editContest(id) {
  try {
    const r = await fetch(`/api/contests/${id}`);
    const c = await r.json();
    const form = document.getElementById('contest-form');
    form.title.value = c.title;
    form.source.value = c.source;
    form.description.value = c.description;
    form.category.value = c.category;
    form.deadline.value = c.deadline ? c.deadline.slice(0, 16) : '';
    form.prize.value = c.prize;
    form.url.value = c.url;
    form.image_url.value = c.image_url || '';
    form.status.value = c.status;
    form.pinned.checked = c.pinned;
    editingContestId = id;
    document.getElementById('contest-form-title').textContent = 'Edit Contest';
    document.getElementById('contest-form-submit').textContent = 'Update Contest';
    form.scrollIntoView({ behavior: 'smooth' });
  } catch {
    toast('Load failed', 'error');
  }
}

function resetContestForm() {
  editingContestId = null;
  document.getElementById('contest-form').reset();
  document.getElementById('contest-form-title').textContent = 'Add Contest';
  document.getElementById('contest-form-submit').textContent = 'Add Contest';
}

async function deleteContest(id) {
  if (!confirm('Delete this contest?')) return;
  try {
    await fetch(`/api/contests/${id}`, { method: 'DELETE', headers: authHeaders() });
    toast('Contest deleted');
    loadAdminContests();
  } catch {
    toast('Delete failed', 'error');
  }
}

async function togglePinAdmin(id) {
  try {
    await fetch(`/api/contests/${id}/pin`, { method: 'POST', headers: authHeaders() });
    loadAdminContests();
  } catch {}
}

// ══ PROJECTS ════════════════════════════

async function loadAdminProjects() {
  try {
    const r = await fetch('/api/projects');
    const projects = await r.json();
    const tbody = document.getElementById('projects-tbody');
    if (!tbody) return;

    tbody.innerHTML = projects.map(p => `
      <tr>
        <td>${p.featured ? '\u2B50 ' : ''}${esc(p.title)}</td>
        <td>${esc(p.description).slice(0, 60)}${p.description.length > 60 ? '...' : ''}</td>
        <td>${esc(p.tags)}</td>
        <td>${p.order}</td>
        <td class="actions">
          <button onclick="editProject(${p.id})">Edit</button>
          <button class="del" onclick="deleteProject(${p.id})">Del</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Load projects failed:', e);
  }
}

async function saveProject(e) {
  e.preventDefault();
  const form = document.getElementById('project-form');
  const data = {
    title: form.title.value,
    description: form.description.value,
    url: form.url.value,
    image_url: form.image_url.value,
    tags: form.tags.value,
    featured: form.featured.checked,
    order: parseInt(form.order.value) || 0,
  };

  const url = editingProjectId ? `/api/projects/${editingProjectId}` : '/api/projects';
  const method = editingProjectId ? 'PUT' : 'POST';

  try {
    const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(data) });
    if (r.ok) {
      toast(editingProjectId ? 'Project updated' : 'Project created');
      resetProjectForm();
      loadAdminProjects();
    } else {
      toast('Failed', 'error');
    }
  } catch {
    toast('Connection failed', 'error');
  }
}

async function editProject(id) {
  try {
    const r = await fetch(`/api/projects`);
    const projects = await r.json();
    const p = projects.find(x => x.id === id);
    if (!p) return;

    const form = document.getElementById('project-form');
    form.title.value = p.title;
    form.description.value = p.description;
    form.url.value = p.url;
    form.image_url.value = p.image_url || '';
    form.tags.value = p.tags;
    form.featured.checked = p.featured;
    form.order.value = p.order;
    editingProjectId = id;
    document.getElementById('project-form-title').textContent = 'Edit Project';
    document.getElementById('project-form-submit').textContent = 'Update Project';
    switchTab('projects');
  } catch {
    toast('Load failed', 'error');
  }
}

function resetProjectForm() {
  editingProjectId = null;
  document.getElementById('project-form').reset();
  document.getElementById('project-form-title').textContent = 'Add Project';
  document.getElementById('project-form-submit').textContent = 'Add Project';
}

async function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  try {
    await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: authHeaders() });
    toast('Project deleted');
    loadAdminProjects();
  } catch {
    toast('Delete failed', 'error');
  }
}

// ══ SETTINGS ════════════════════════════

async function loadAdminSettings() {
  try {
    const r = await fetch('/api/config');
    const cfg = await r.json();
    const form = document.getElementById('settings-form');
    if (!form) return;
    for (const [key, val] of Object.entries(cfg)) {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) input.value = val;
    }
  } catch {}
}

async function saveSettings(e) {
  e.preventDefault();
  const form = document.getElementById('settings-form');
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v; });

  try {
    const r = await fetch('/api/config', {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (r.ok) toast('Settings saved');
    else toast('Save failed', 'error');
  } catch {
    toast('Connection failed', 'error');
  }
}

// ── Helpers ──────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ── Init ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  document.getElementById('login-form')?.addEventListener('submit', adminLogin);
  document.getElementById('contest-form')?.addEventListener('submit', saveContest);
  document.getElementById('project-form')?.addEventListener('submit', saveProject);
  document.getElementById('settings-form')?.addEventListener('submit', saveSettings);
});
