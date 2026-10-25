/**
 * MicroEscrow — Authentication & Role-Based Authorization Module
 * Manages user login/registration, session persistence, role separation,
 * and real-time student vault ledger queries.
 */

let currentUser = null;
let currentAuthRole = 'student';
let currentAuthMode = 'login';

// ──────────────────────────────────────
// SESSION MANAGEMENT
// ──────────────────────────────────────
function initAuthSession() {
  try {
    const raw = localStorage.getItem('me_user');
    if (raw) {
      currentUser = JSON.parse(raw);
    }
  } catch (e) {
    currentUser = null;
  }
}

function saveAuthSession(user, token) {
  currentUser = user;
  localStorage.setItem('me_user', JSON.stringify(user));
  if (token) localStorage.setItem('me_token', token);
}

function clearAuthSession() {
  currentUser = null;
  localStorage.removeItem('me_user');
  localStorage.removeItem('me_token');
}

// ──────────────────────────────────────
// AUTH VIEW INTERACTIONS
// ──────────────────────────────────────
function setAuthRole(role) {
  currentAuthRole = role;
  const isStudent = role === 'student';

  const tabStudent = document.getElementById('tab-student');
  const tabOrg = document.getElementById('tab-organizer');
  const lblId = document.getElementById('lbl-auth-identifier');
  const inpId = document.getElementById('auth-identifier');
  const txtDemo = document.getElementById('txt-demo-quick');
  const regStudentFields = document.getElementById('reg-student-fields');

  if (tabStudent && tabOrg) {
    if (isStudent) {
      tabStudent.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5';
      tabOrg.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 text-gray-400 hover:text-white flex items-center justify-center gap-1.5';
    } else {
      tabOrg.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5';
      tabStudent.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 text-gray-400 hover:text-white flex items-center justify-center gap-1.5';
    }
  }

  if (lblId && inpId) {
    lblId.textContent = isStudent ? 'College Roll No or Email' : 'Organizer Campus Email';
    inpId.placeholder = isStudent ? 'e.g. 2026CS101 or student@campus.edu' : 'e.g. organizer@campus.edu';
  }

  if (txtDemo) {
    txtDemo.textContent = isStudent ? 'Quick Login as Demo Student (Aarav)' : 'Quick Login as Demo Organizer (Prof. Vikram)';
  }

  if (regStudentFields) {
    regStudentFields.classList.toggle('hidden', !isStudent);
  }
}

function fillDemoCredentials() {
  const inpId = document.getElementById('auth-identifier');
  const inpPwd = document.getElementById('auth-password');

  if (currentAuthRole === 'student') {
    if (inpId) inpId.value = 'student@campus.edu';
    if (inpPwd) inpPwd.value = 'student123';
  } else {
    if (inpId) inpId.value = 'organizer@campus.edu';
    if (inpPwd) inpPwd.value = 'organizer123';
  }

  showToast(`Pre-filled ${currentAuthRole} demo credentials. Click Authorize to proceed.`, 'info');
}

function toggleAuthMode(mode) {
  currentAuthMode = mode;
  const isRegister = mode === 'register';

  const loginForm = document.getElementById('auth-login-form');
  const regForm = document.getElementById('auth-register-form');

  if (loginForm && regForm) {
    loginForm.classList.toggle('hidden', isRegister);
    regForm.classList.toggle('hidden', !isRegister);
  }
}

// ──────────────────────────────────────
// LOGIN & REGISTRATION HANDLERS
// ──────────────────────────────────────
async function handleAuthLogin(e) {
  e.preventDefault();
  const identifier = document.getElementById('auth-identifier')?.value.trim();
  const password = document.getElementById('auth-password')?.value;

  if (!identifier || !password) {
    showToast('Please enter your credentials.', 'warning');
    return;
  }

  const submitBtn = document.getElementById('btn-auth-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Verifying credentials…</span>';
  }

  try {
    const res = await ApiClient.login({
      identifier,
      password,
      role: currentAuthRole
    });

    saveAuthSession(res.user, res.token);
    showToast(`Welcome back, ${res.user.name}!`, 'success');
    applyRoleView(res.user.role);
  } catch (err) {
    showToast(err.message || 'Authorization failed. Please try again.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Authorize & Enter</span><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>';
    }
  }
}

async function handleAuthRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name')?.value.trim();
  const email = document.getElementById('reg-email')?.value.trim();
  const rollNo = document.getElementById('reg-roll')?.value.trim();
  const dept = document.getElementById('reg-dept')?.value.trim();
  const phone = document.getElementById('reg-phone')?.value.trim();
  const password = document.getElementById('reg-password')?.value;

  if (!name || !email || !password) {
    showToast('Please fill in required fields.', 'warning');
    return;
  }

  try {
    const res = await ApiClient.register({
      name,
      email,
      rollNo,
      phone,
      department: dept,
      password,
      role: currentAuthRole
    });

    saveAuthSession(res.user, res.token);
    showToast(`Account registered! Logged in as ${res.user.role}.`, 'success');
    applyRoleView(res.user.role);
  } catch (err) {
    showToast(err.message || 'Registration failed.', 'error');
  }
}

function handleLogout() {
  clearAuthSession();
  showToast('Logged out of MicroEscrow.', 'info');
  showAuthView();
}

function navigateHome() {
  if (currentUser) {
    applyRoleView(currentUser.role);
  } else {
    showAuthView();
  }
}

// ──────────────────────────────────────
// ROLE-BASED PAGE DIVISION
// ──────────────────────────────────────
function applyRoleView(role) {
  const authView = document.getElementById('auth-view');
  const studentView = document.getElementById('student-view');
  const orgView = document.getElementById('organizer-view');
  const userBadge = document.getElementById('user-badge');
  const btnLoginNav = document.getElementById('btn-login-nav');
  const campaignDropdown = document.getElementById('campaign-dropdown');

  // Hide auth screen
  if (authView) authView.classList.add('hidden');

  // Update Header User Badge
  if (currentUser) {
    if (userBadge) userBadge.classList.remove('hidden');
    if (btnLoginNav) btnLoginNav.classList.add('hidden');
    if (campaignDropdown) campaignDropdown.classList.remove('hidden');

    const nameEl = document.getElementById('user-display-name');
    const metaEl = document.getElementById('user-display-meta');
    const avatarEl = document.getElementById('user-role-avatar');

    if (nameEl) nameEl.textContent = currentUser.name;
    if (metaEl) {
      metaEl.textContent = currentUser.role === 'student'
        ? (currentUser.rollNo || 'Student')
        : (currentUser.department || 'Event Admin');
    }
    if (avatarEl) {
      avatarEl.textContent = currentUser.role === 'student' ? '🎓' : '⚙️';
      avatarEl.className = currentUser.role === 'student'
        ? 'w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-sm font-bold'
        : 'w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-sm font-bold';
    }
  }

  // Divide Pages by Role
  if (role === 'student') {
    // Show student view, hide organizer view
    if (studentView) studentView.classList.remove('hidden');
    if (orgView) orgView.classList.add('hidden');

    // Pre-fill student details on pledge form
    prefillStudentPledgeForm();

    // Query and render real-time student pledge vault
    refreshStudentPledges();
  } else if (role === 'organizer') {
    // Show organizer view, hide student view
    if (studentView) studentView.classList.add('hidden');
    if (orgView) orgView.classList.remove('hidden');

    // Refresh organizer dashboard metrics & roster in real time
    if (activeCampaignId) {
      ApiClient.fetchCampaign(activeCampaignId).then(renderCampaign);
    }
  }
}

function showAuthView() {
  const authView = document.getElementById('auth-view');
  const studentView = document.getElementById('student-view');
  const orgView = document.getElementById('organizer-view');
  const userBadge = document.getElementById('user-badge');
  const btnLoginNav = document.getElementById('btn-login-nav');

  if (authView) authView.classList.remove('hidden');
  if (studentView) studentView.classList.add('hidden');
  if (orgView) orgView.classList.add('hidden');

  if (userBadge) userBadge.classList.add('hidden');
  if (btnLoginNav) btnLoginNav.classList.remove('hidden');

  // Reset to login mode
  toggleAuthMode('login');
}

function prefillStudentPledgeForm() {
  if (!currentUser || currentUser.role !== 'student') return;

  const inpName = document.getElementById('inp-name');
  const inpRoll = document.getElementById('inp-roll');
  const inpPhone = document.getElementById('inp-phone');

  if (inpName && currentUser.name) inpName.value = currentUser.name;
  if (inpRoll && currentUser.rollNo) inpRoll.value = currentUser.rollNo;
  if (inpPhone && currentUser.phone) inpPhone.value = currentUser.phone;
}

// ──────────────────────────────────────
// REAL-TIME STUDENT PLEDGE VAULT
// ──────────────────────────────────────
async function refreshStudentPledges() {
  if (!currentUser || currentUser.role !== 'student') return;

  const container = document.getElementById('my-pledges-list');
  if (!container) return;

  try {
    const pledges = await ApiClient.getMyPledges(currentUser.id);

    if (pledges.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 px-4 rounded-xl bg-white/[0.02] border border-white/5">
          <p class="text-xs text-gray-400">You haven't made any micro-pledges yet.</p>
          <p class="text-[10px] text-gray-500 mt-0.5">Select a pass above to lock your funds safely in escrow!</p>
        </div>`;
      return;
    }

    container.innerHTML = pledges.map(p => `
      <div class="flex items-center justify-between p-3.5 rounded-xl bg-navy-800/60 border border-white/5 hover:border-indigo-500/30 transition">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-mono font-bold text-indigo-400 flex-shrink-0">
            🔒
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-white truncate">${p.campaignTitle}</span>
              <span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">${p.tier}</span>
            </div>
            <div class="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5 font-mono">
              <span class="text-emerald-400 font-bold">₹${p.amount.toLocaleString('en-IN')}</span>
              <span>·</span>
              <span class="text-gray-300 font-semibold">${p.vaultHash}</span>
              <span>·</span>
              <span>${new Date(p.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="text-[10px] px-2 py-1 rounded-full font-bold ${
            p.status === 'Escrow Locked' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' :
            p.status === 'Disbursed to Vendor' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
            'bg-red-500/15 text-red-300 border border-red-500/30'
          }">${p.status}</span>
          <button onclick="viewStudentVaultPass('${p.id}', '${p.vaultHash}', '${p.tier}', ${p.amount})" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 transition">
            Pass
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error fetching student pledges:', err);
    container.innerHTML = '<div class="text-center py-4 text-xs text-red-400">Failed to load vault passes.</div>';
  }
}

function viewStudentVaultPass(id, vaultHash, tier, amount) {
  if (!currentUser) return;
  lastPledge = {
    id,
    vaultHash,
    name: currentUser.name,
    rollNo: currentUser.rollNo || '2026CS101',
    tier,
    amount
  };
  openVaultPass();
}
