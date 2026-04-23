/* ══════════════════════════════════════════
   MAIN.JS — Portfolio page logic
   ══════════════════════════════════════════ */

const API = '';

// ── Load site config ────────────────────
async function loadConfig() {
  try {
    const r = await fetch(`${API}/api/config`);
    const cfg = await r.json();

    const heroTitle = document.getElementById('hero-title');
    const heroSub = document.getElementById('hero-subtitle');
    const aboutText = document.getElementById('about-text');
    const xLink = document.getElementById('x-link');
    const tgLink = document.getElementById('tg-link');
    const xContact = document.getElementById('x-contact');
    const tgContact = document.getElementById('tg-contact');
    const avatar = document.getElementById('hero-avatar-inner');

    if (heroTitle && cfg.hero_title) heroTitle.textContent = cfg.hero_title;
    if (heroSub && cfg.hero_subtitle) heroSub.textContent = cfg.hero_subtitle;
    if (aboutText && cfg.about_text) aboutText.textContent = cfg.about_text;

    const xUser = cfg.x_username || '@0x_zyven';
    const tgUser = cfg.telegram_username || '@Rifatsync';

    if (xLink) xLink.href = `https://x.com/${xUser.replace('@', '')}`;
    if (tgLink) tgLink.href = `https://t.me/${tgUser.replace('@', '')}`;
    if (xContact) xContact.textContent = xUser;
    if (tgContact) tgContact.textContent = tgUser;

    if (avatar && cfg.avatar_url) {
      avatar.innerHTML = `<img src="${cfg.avatar_url}" alt="Avatar">`;
    }
  } catch (e) {
    console.error('Config load failed:', e);
  }
}

// ── Load projects ───────────────────────
async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  try {
    const r = await fetch(`${API}/api/projects`);
    const projects = await r.json();

    if (!projects.length) {
      grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;">No projects yet.</p>';
      return;
    }

    grid.innerHTML = projects.map(p => `
      <a href="${p.url || '#'}" target="${p.url && !p.url.startsWith('#') ? '_blank' : '_self'}"
         rel="noopener" class="project-card fade-in">
        ${p.featured ? '<span class="featured-badge">FEATURED</span>' : ''}
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.description)}</p>
        <div class="project-tags">
          ${(p.tags || '').split(',').filter(t => t.trim()).map(t =>
            `<span class="project-tag">${esc(t.trim())}</span>`
          ).join('')}
        </div>
      </a>
    `).join('');

    observeFadeIns();
  } catch (e) {
    console.error('Projects load failed:', e);
  }
}

// ── Navbar scroll effect ────────────────
function initNavbar() {
  const nav = document.querySelector('.navbar');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.textContent = links.classList.contains('open') ? '\u2715' : '\u2630';
    });
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.textContent = '\u2630';
      });
    });
  }

  // Active link highlight on scroll
  const sections = document.querySelectorAll('.section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 100;
      if (window.scrollY >= top) current = sec.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  }, { passive: true });
}

// ── Fade-in observer ────────────────────
function observeFadeIns() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in:not(.visible)').forEach(el => observer.observe(el));
}

// ── Utility ─────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ── Init ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  loadConfig();
  loadProjects();
  observeFadeIns();
});
