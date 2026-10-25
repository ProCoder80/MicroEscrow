/**
 * MicroEscrow — Pledge Functionality Module
 * Handles tier selection, custom amounts, UPI payment modal, QR animation, and pledge creation
 */

let selectedTier = { name: 'General Pass', amount: 299, key: 'general' };
let lastPledge = null;

// ──────────────────────────────────────
// TIER SELECTION
// ──────────────────────────────────────
function selectTier(el) {
  document.querySelectorAll('.tier-card').forEach(c => {
    c.classList.remove('selected');
    const dot = c.querySelector('.tier-dot');
    if (dot) dot.className = 'tier-dot w-2.5 h-2.5 rounded-full bg-transparent';
  });

  el.classList.add('selected');
  const dot = el.querySelector('.tier-dot');
  if (dot) {
    const key = el.dataset.tier;
    const colors = { general: 'bg-indigo-500', vip: 'bg-violet-500', custom: 'bg-emerald-500' };
    dot.className = `tier-dot w-2.5 h-2.5 rounded-full ${colors[key] || 'bg-indigo-500'}`;
  }

  const tierKey = el.dataset.tier;
  const amount = parseInt(el.dataset.amount, 10);
  const names = { general: 'General Pass', vip: 'VIP + Hoodie Pass', custom: 'Custom Amount' };

  selectedTier = { name: names[tierKey], amount, key: tierKey };

  const customInput = document.getElementById('custom-amount-input');
  if (customInput) {
    if (tierKey === 'custom') {
      customInput.disabled = false;
      customInput.focus();
      selectedTier.amount = parseInt(customInput.value, 10) || 0;
    } else {
      customInput.disabled = true;
    }
  }
}

function updateCustomAmount(input) {
  selectedTier.amount = parseInt(input.value, 10) || 0;
}

// ──────────────────────────────────────
// PAYMENT MODAL
// ──────────────────────────────────────
function openPaymentModal() {
  const name = document.getElementById('inp-name')?.value.trim();
  const roll = document.getElementById('inp-roll')?.value.trim();
  const phone = document.getElementById('inp-phone')?.value.trim();

  if (!name || !roll || !phone) {
    showToast('Please fill in your name, roll number, and phone number.', 'warning');
    return;
  }

  if (selectedTier.key === 'custom' && (!selectedTier.amount || selectedTier.amount < 50)) {
    showToast('Minimum custom pledge amount is ₹50.', 'warning');
    return;
  }

  setModalStep('upi');
  const modal = document.getElementById('payment-modal');
  if (modal) modal.classList.remove('hidden');
}

function closePaymentModal() {
  const modal = document.getElementById('payment-modal');
  if (modal) modal.classList.add('hidden');
}

function setModalStep(step) {
  const steps = ['upi', 'qr', 'success'];
  steps.forEach(s => {
    const el = document.getElementById(`modal-step-${s}`);
    if (el) el.classList.toggle('hidden', s !== step);
  });
}

function selectUPI(app) {
  const names = { gpay: 'Google Pay', phonepe: 'PhonePe', paytm: 'Paytm' };
  const upiNameEl = document.getElementById('selected-upi-name');
  if (upiNameEl) upiNameEl.textContent = names[app] || app;

  const qrAmtEl = document.getElementById('qr-amount');
  if (qrAmtEl) qrAmtEl.textContent = '₹' + selectedTier.amount;

  generateMockQR();
  setModalStep('qr');

  let count = 5;
  const countEl = document.getElementById('qr-countdown');
  if (countEl) countEl.textContent = count;

  const timer = setInterval(() => {
    count--;
    if (countEl) countEl.textContent = count;
    if (count <= 0) {
      clearInterval(timer);
      confirmPayment();
    }
  }, 1000);
}

function generateMockQR() {
  const svg = document.getElementById('mock-qr');
  if (!svg) return;
  const size = 200;
  const cells = 21;
  const cs = size / cells;
  let rects = '';

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const isCorner = (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7);
      let filled = false;
      if (isCorner) {
        const lr = r < 7 ? r : r - (cells - 7);
        const lc = c < 7 ? c : c - (cells - 7);
        if (lr === 0 || lr === 6 || lc === 0 || lc === 6) filled = true;
        else if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) filled = true;
      } else {
        filled = ((r * 7 + c * 13 + (r ^ c) * 3) % 5) < 2;
      }
      if (filled) {
        rects += `<rect x="${c * cs}" y="${r * cs}" width="${cs}" height="${cs}" fill="#0F172A"/>`;
      }
    }
  }
  svg.innerHTML = `<rect width="${size}" height="${size}" fill="white"/>${rects}`;
}

async function confirmPayment() {
  const name = document.getElementById('inp-name')?.value.trim();
  const roll = document.getElementById('inp-roll')?.value.trim();
  const phone = document.getElementById('inp-phone')?.value.trim();

  try {
    const res = await ApiClient.submitPledge({
      campaignId: activeCampaignId,
      userId: currentUser ? currentUser.id : null,
      name,
      rollNo: roll,
      phone,
      tier: selectedTier.name,
      amount: selectedTier.amount
    });

    lastPledge = res.data;

    const txnIdEl = document.getElementById('success-txn-id');
    if (txnIdEl) txnIdEl.textContent = 'TXN-' + Math.random().toString(36).substring(2, 12).toUpperCase();

    setModalStep('success');
    launchConfetti();

    // Re-render campaign with updated pledge totals
    const campaign = await ApiClient.fetchCampaign(activeCampaignId);
    await renderCampaign(campaign);

    // Refresh student's personal vault passes in real time
    if (typeof refreshStudentPledges === 'function') {
      refreshStudentPledges();
    }

    showToast(`Pledge of ₹${selectedTier.amount} secured in escrow!`, 'success');

    // Keep inputs populated for logged-in user or reset
    if (typeof prefillStudentPledgeForm === 'function') {
      prefillStudentPledgeForm();
    }
  } catch (err) {
    showToast(err.message || 'Payment processing failed', 'error');
    closePaymentModal();
  }
}
