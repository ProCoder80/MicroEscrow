/**
 * MicroEscrow — Campaign Functionality Module
 * Handles campaign state, Smart Escrow Risk Engine, countdown timers, and selector dropdown
 */

let activeCampaignId = null;
let countdownInterval = null;

// ──────────────────────────────────────
// SMART ESCROW RISK ENGINE
// ──────────────────────────────────────
function computeRisk(campaign, totalPledged) {
  if (campaign.status === 'disbursed') return { level: 'blue', label: 'THRESHOLD SECURED', desc: 'Goal Met — Escrow Locked & Ready', icon: '🔵' };
  if (campaign.status === 'refunded')  return { level: 'red',  label: 'CANCELLED',         desc: 'Refunds Issued',                 icon: '🔴' };

  const pct = campaign.targetAmount > 0 ? (totalPledged / campaign.targetAmount) : 0;
  const hoursLeft = Math.max(0, (campaign.deadline - Date.now()) / 3600000);

  if (pct >= 1)                     return { level: 'blue',   label: 'THRESHOLD SECURED', desc: 'Goal Met — Escrow Locked & Ready',          icon: '🔵' };
  if (pct >= 0.5 && hoursLeft > 12) return { level: 'green',  label: 'HIGH SAFETY INDEX', desc: 'Low Risk — On track for vendor payout',      icon: '🟢' };
  if (pct < 0.3 && hoursLeft < 12)  return { level: 'yellow', label: 'AT RISK WARNING',   desc: 'Funding Slow — Auto-refund trigger pending', icon: '🟡' };
  if (hoursLeft < 6 && pct < 0.6)   return { level: 'yellow', label: 'AT RISK WARNING',   desc: 'Funding Slow — Auto-refund trigger pending', icon: '🟡' };
  return { level: 'green', label: 'HIGH SAFETY INDEX', desc: 'Low Risk — On track for vendor payout', icon: '🟢' };
}

function renderRiskBadge(containerId, risk) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const colorMap = {
    green:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', pulse: 'risk-green' },
    yellow: { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   pulse: 'risk-yellow' },
    blue:   { bg: 'bg-indigo-500/10',   border: 'border-indigo-500/20',  text: 'text-indigo-400',  pulse: 'risk-blue' },
    red:    { bg: 'bg-red-500/10',      border: 'border-red-500/20',     text: 'text-red-400',     pulse: '' }
  };
  const c = colorMap[risk.level] || colorMap.green;
  el.innerHTML = `
    <div class="${c.pulse} inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${c.bg} ${c.text} border ${c.border}" title="${risk.desc}">
      <span>${risk.icon}</span>
      <span>${risk.label}</span>
    </div>`;
}

// ──────────────────────────────────────
// CAMPAIGN RENDERING & DROPDOWN
// ──────────────────────────────────────
async function renderCampaign(campaign) {
  if (!campaign) return;

  const pledges = await ApiClient.fetchPledges(campaign.id);
  const total = pledges.reduce((sum, p) => sum + p.amount, 0);
  const target = campaign.targetAmount;
  const pct = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;
  const risk = computeRisk(campaign, total);

  // Update header badges
  const badgeCount = document.getElementById('badge-count');
  if (badgeCount) badgeCount.textContent = pledges.length;

  const selectedName = document.getElementById('selected-campaign-name');
  if (selectedName) selectedName.textContent = campaign.title;

  // Student view hero card
  const titleEl = document.getElementById('campaign-title');
  if (titleEl) titleEl.textContent = campaign.title;

  const catBadge = document.getElementById('campaign-category-badge');
  if (catBadge) catBadge.textContent = campaign.category || 'Event';

  const descEl = document.getElementById('campaign-desc-student');
  if (descEl) descEl.textContent = campaign.description || '';

  const curAmt = document.getElementById('current-amount');
  if (curAmt) curAmt.textContent = '₹' + total.toLocaleString('en-IN');

  const tgtAmt = document.getElementById('target-amount');
  if (tgtAmt) tgtAmt.textContent = '₹' + target.toLocaleString('en-IN');

  const progBar = document.getElementById('progress-bar');
  if (progBar) {
    progBar.style.width = pct + '%';
    progBar.className = `progress-fill h-full rounded-full ${pct >= 100 ? 'bg-gradient-to-r from-emerald-400 to-indigo-400' : 'bg-gradient-to-r from-indigo-500 to-emerald-400'}`;
  }

  const progPct = document.getElementById('progress-percent');
  if (progPct) progPct.textContent = pct + '% funded';

  renderRiskBadge('risk-badge-student', risk);
  renderRiskBadge('risk-badge-org', risk);

  // Status pills
  updateStatusPills(campaign.status);

  // Countdown timer
  startCountdown(campaign.deadline);

  // Handle ended state
  handleEndedState(campaign);

  // Render organizer view if active
  if (typeof renderOrganizerView === 'function') {
    renderOrganizerView(campaign, pledges, total);
  }
}

function updateStatusPills(status) {
  const studentText = document.getElementById('student-status-text');
  const orgText = document.getElementById('org-status-text');
  const labels = {
    funding: 'Funding in Progress',
    disbursed: 'Funds Released to Vendor',
    refunded: 'Refunds Dispatched'
  };

  const text = labels[status] || 'Active';
  if (studentText) studentText.textContent = text;
  if (orgText) orgText.textContent = text;
}

function handleEndedState(campaign) {
  const overlay = document.getElementById('campaign-ended-overlay');
  const formSection = document.getElementById('pledge-form-section');
  if (!overlay || !formSection) return;

  if (campaign.status === 'disbursed') {
    formSection.classList.add('hidden');
    overlay.classList.remove('hidden');
    document.getElementById('ended-icon').textContent = '🎉';
    document.getElementById('ended-icon').className = 'w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl bg-indigo-500/10 text-indigo-400';
    document.getElementById('ended-title').textContent = 'Campaign Goal Met & Disbursed!';
    document.getElementById('ended-desc').textContent = 'Escrow funds have been successfully locked and transferred to the vendor.';
  } else if (campaign.status === 'refunded') {
    formSection.classList.add('hidden');
    overlay.classList.remove('hidden');
    document.getElementById('ended-icon').textContent = '↩️';
    document.getElementById('ended-icon').className = 'w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl bg-red-500/10 text-red-400';
    document.getElementById('ended-title').textContent = 'Campaign Refunded';
    document.getElementById('ended-desc').textContent = 'Minimum threshold was not reached or organizer cancelled. All pledges have been returned.';
  } else {
    formSection.classList.remove('hidden');
    overlay.classList.add('hidden');
  }
}

function startCountdown(deadline) {
  if (countdownInterval) clearInterval(countdownInterval);

  function tick() {
    const el = document.getElementById('countdown');
    if (!el) return;
    const diff = Math.max(0, deadline - Date.now());
    if (diff <= 0) {
      el.textContent = '00:00:00';
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    const pad = n => String(n).padStart(2, '0');
    el.textContent = d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  tick();
  countdownInterval = setInterval(tick, 1000);
}

// ──────────────────────────────────────
// DROPDOWN
// ──────────────────────────────────────
async function renderCampaignDropdown() {
  const campaigns = await ApiClient.fetchCampaigns();
  const menu = document.getElementById('campaign-menu');
  if (!menu) return;

  menu.innerHTML = campaigns.map(c => `
    <div onclick="selectCampaign('${c.id}')" class="px-4 py-3 hover:bg-white/5 cursor-pointer transition flex items-center justify-between gap-3 border-b border-white/5 last:border-0 ${c.id === activeCampaignId ? 'bg-indigo-500/10' : ''}">
      <div class="min-w-0">
        <p class="text-xs font-bold text-gray-200 truncate">${c.title}</p>
        <p class="text-[10px] text-gray-500">₹${c.targetAmount.toLocaleString('en-IN')} goal · ${c.category}</p>
      </div>
      <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${c.status === 'funding' ? 'bg-emerald-500/10 text-emerald-400' : c.status === 'disbursed' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-red-500/10 text-red-400'}">${c.status}</span>
    </div>
  `).join('');
}

function toggleCampaignDropdown() {
  const dd = document.getElementById('campaign-dropdown');
  if (dd) dd.classList.toggle('open');
}

async function selectCampaign(id) {
  activeCampaignId = id;
  const dd = document.getElementById('campaign-dropdown');
  if (dd) dd.classList.remove('open');
  const campaign = await ApiClient.fetchCampaign(id);
  await renderCampaign(campaign);
  await renderCampaignDropdown();
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const dd = document.getElementById('campaign-dropdown');
  if (dd && !dd.contains(e.target)) {
    dd.classList.remove('open');
  }
});
