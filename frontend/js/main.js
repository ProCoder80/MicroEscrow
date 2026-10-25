/**
 * MicroEscrow — Main Frontend Controller & Bootstrapper
 * Orchestrates component loading, view switching, alerts, and boot lifecycle
 */

let currentView = 'student';

// ──────────────────────────────────────
// VIEW SWITCHING
// ──────────────────────────────────────
function switchView(view) {
  currentView = view;
  const isStudent = view === 'student';

  const btnStudent = document.getElementById('btn-student-view');
  const btnOrg = document.getElementById('btn-organizer-view');
  const viewStudent = document.getElementById('student-view');
  const viewOrg = document.getElementById('organizer-view');

  if (btnStudent && btnOrg) {
    if (isStudent) {
      btnStudent.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 bg-indigo-500 text-white shadow-md shadow-indigo-500/20';
      btnOrg.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 text-gray-400 hover:text-gray-200';
    } else {
      btnOrg.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 bg-indigo-500 text-white shadow-md shadow-indigo-500/20';
      btnStudent.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 text-gray-400 hover:text-gray-200';
    }
  }

  if (viewStudent && viewOrg) {
    viewStudent.classList.toggle('hidden', !isStudent);
    viewOrg.classList.toggle('hidden', isStudent);
  }

  // Refresh current campaign data when switching view
  if (activeCampaignId) {
    ApiClient.fetchCampaign(activeCampaignId).then(renderCampaign);
  }
}

// ──────────────────────────────────────
// TOAST NOTIFICATIONS
// ──────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    error:   'border-red-500/30 bg-red-500/10 text-red-400',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    info:    'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
  };
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = `toast glass rounded-xl px-4 py-3 border ${colors[type]} flex items-center gap-3 shadow-lg`;
  toast.innerHTML = `<span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${colors[type].replace('border-','bg-').split(' ')[0]}">${icons[type]}</span><span class="text-sm font-medium flex-1">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); }, 3500);
}

// ──────────────────────────────────────
// CONFETTI CELEBRATION
// ──────────────────────────────────────
function launchConfetti() {
  const colors = ['#10B981', '#6366F1', '#8B5CF6', '#34D399', '#A78BFA', '#FCD34D', '#F472B6', '#60A5FA'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    const size = 6 + Math.random() * 8;
    el.style.left = Math.random() * 100 + 'vw';
    el.style.width = size + 'px'; el.style.height = size + 'px';
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.animationDuration = (1.5 + Math.random() * 2) + 's';
    el.style.animationDelay = Math.random() * 0.5 + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}

// ──────────────────────────────────────
// COMPONENT LOADER
// ──────────────────────────────────────
async function loadComponents() {
  const components = [
    { id: 'app-header',               file: 'frontend/components/header.html' },
    { id: 'auth-view-container',       file: 'frontend/components/auth-view.html' },
    { id: 'student-view-container',   file: 'frontend/components/student-view.html' },
    { id: 'organizer-view-container', file: 'frontend/components/organizer-view.html' },
    { id: 'app-modals',               file: 'frontend/components/modals.html' },
    { id: 'app-footer',               file: 'frontend/components/footer.html' }
  ];

  await Promise.all(components.map(async (c) => {
    const el = document.getElementById(c.id);
    if (!el) return;
    try {
      const res = await fetch(c.file);
      if (res.ok) {
        el.innerHTML = await res.text();
      }
    } catch (err) {
      console.warn(`Could not load component ${c.file}:`, err);
    }
  }));
}

// ──────────────────────────────────────
// BOOTSTRAP INITIALIZATION
// ──────────────────────────────────────
async function init() {
  // 1. Load modular HTML components into containers
  await loadComponents();

  // 2. Initialize Auth Session from storage
  if (typeof initAuthSession === 'function') {
    initAuthSession();
  }

  // 3. Load active campaigns
  try {
    const campaigns = await ApiClient.fetchCampaigns();
    if (campaigns && campaigns.length > 0) {
      activeCampaignId = campaigns[0].id;
      await renderCampaign(campaigns[0]);
      await renderCampaignDropdown();
    }
  } catch (err) {
    console.error('Failed to load campaigns:', err);
    showToast('Failed to connect to backend server.', 'error');
  }

  // 4. Divide view on basis of authenticated user
  if (currentUser) {
    applyRoleView(currentUser.role);
  } else {
    showAuthView();
  }
}

document.addEventListener('DOMContentLoaded', init);
