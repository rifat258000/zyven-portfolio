/* ══════════════════════════════════════════
   CONTESTS.JS — Contest tracker logic
   ══════════════════════════════════════════ */

const CONTESTS_API = '/api/contests';

let currentCategory = 'all';
let currentSort = 'latest';
let currentSearch = '';
let showSaved = false;

// ── Load & render contests ──────────────
async function loadContests() {
  const grid = document.getElementById('contests-grid');
  if (!grid) return;

  const params = new URLSearchParams();
  if (currentCategory !== 'all') params.set('category', currentCategory);
  if (currentSearch) params.set('search', currentSearch);
  params.set('sort', currentSort);
  params.set('status', showSaved ? 'saved' : 'active');

  try {
    const r = await fetch(`${CONTESTS_API}?${params}`);
    const contests = await r.json();

    if (!contests.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <p>${showSaved ? 'No saved contests yet.' : 'No contests found. Try a different filter.'}</p>
        </div>
      `;
      updateCount(0);
      return;
    }

    grid.innerHTML = contests.map(c => renderContestCard(c)).join('');
    updateCount(contests.length);

    // Re-observe fade-ins
    if (typeof observeFadeIns === 'function') observeFadeIns();
  } catch (e) {
    console.error('Contest load failed:', e);
    grid.innerHTML = '<div class="empty-state"><p>Failed to load contests.</p></div>';
  }
}

function renderContestCard(c) {
  const deadline = c.deadline ? formatDeadline(c.deadline) : null;
  const isSaved = c.status === 'saved';

  return `
    <div class="contest-card ${c.pinned ? 'pinned' : ''} fade-in" data-id="${c.id}">
      <div class="contest-card-header">
        <span class="contest-category ${c.category}">${c.category.toUpperCase()}</span>
        ${c.pinned ? '<span class="contest-pin" title="Pinned">\uD83D\uDCCC</span>' : ''}
      </div>
      <h3>${esc(c.title)}</h3>
      <div class="contest-source">${esc(c.source)}</div>
      <div class="contest-desc">${esc(c.description)}</div>
      <div class="contest-meta">
        ${deadline ? `
          <div class="contest-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            ${deadline}
          </div>
        ` : ''}
        ${c.prize ? `
          <div class="contest-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            ${esc(c.prize)}
          </div>
        ` : ''}
      </div>
      <div class="contest-actions">
        <a href="${esc(c.url)}" target="_blank" rel="noopener" class="btn-open">
          Open Post \u2197
        </a>
        <button class="btn-bookmark ${isSaved ? 'saved' : ''}" onclick="toggleBookmark(${c.id})" title="${isSaved ? 'Remove bookmark' : 'Save'}">
          ${isSaved ? '\u2764' : '\u2661'}
        </button>
      </div>
    </div>
  `;
}

// ── Filters ─────────────────────────────
function setCategory(cat, el) {
  currentCategory = cat;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  loadContests();
}

function setSort(val) {
  currentSort = val;
  loadContests();
}

function toggleSaved() {
  showSaved = !showSaved;
  const btn = document.getElementById('bookmark-toggle');
  if (btn) btn.classList.toggle('active', showSaved);
  loadContests();
}

// ── Search with debounce ────────────────
let searchTimeout;
function onSearch(val) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentSearch = val.trim();
    loadContests();
  }, 300);
}

// ── Bookmark toggle ─────────────────────
async function toggleBookmark(id) {
  try {
    await fetch(`/api/contests/${id}/bookmark`, { method: 'POST' });
    loadContests();
  } catch (e) {
    console.error('Bookmark toggle failed:', e);
  }
}

// ── Helpers ──────────────────────────────
function formatDeadline(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = d - now;

  if (diff < 0) return 'Ended';
  if (diff < 3600000) return `${Math.ceil(diff / 60000)}m left`;
  if (diff < 86400000) return `${Math.ceil(diff / 3600000)}h left`;
  const days = Math.ceil(diff / 86400000);
  if (days <= 7) return `${days}d left`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function updateCount(n) {
  const el = document.getElementById('contest-count');
  if (el) el.textContent = `${n} contest${n !== 1 ? 's' : ''}`;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ── Init ────────────────────────────────
document.addEventListener('DOMContentLoaded', loadContests);
