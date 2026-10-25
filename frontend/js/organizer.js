/**
 * MicroEscrow — Organizer Functionality Module
 * Handles admin metrics, create/edit campaign modal, fund release & refund simulation, and roster table
 */

let editMode = false;

// ──────────────────────────────────────
// ORGANIZER DASHBOARD RENDERING
// ──────────────────────────────────────
function renderOrganizerView(campaign, pledges, total) {
  // Metric cards
  const metricTotal = document.getElementById('metric-total');
  if (metricTotal) metricTotal.textContent = '₹' + total.toLocaleString('en-IN');

  const metricCount = document.getElementById('metric-count');
  if (metricCount) metricCount.textContent = pledges.length;

  const metricDays = document.getElementById('metric-days');
  if (metricDays) {
    const daysLeft = Math.max(0, Math.ceil((campaign.deadline - Date.now()) / 86400000));
    metricDays.textContent = daysLeft + 'd';
  }

  // Roster table
  renderRoster(pledges);

  // Status-dependent controls
  const simControls = document.getElementById('sim-controls');
  const payoutReceipt = document.getElementById('payout-receipt');

  if (campaign.status === 'disbursed') {
    if (simControls) simControls.classList.add('hidden');
    if (payoutReceipt) {
      payoutReceipt.classList.remove('hidden');
      document.getElementById('receipt-txn').textContent = 'DISB-' + campaign.id.slice(-6);
      document.getElementById('receipt-amount').textContent = '₹' + total.toLocaleString('en-IN');
      document.getElementById('receipt-time').textContent = new Date().toLocaleString('en-IN');
    }
  } else if (campaign.status === 'refunded') {
    if (simControls) simControls.classList.add('hidden');
    if (payoutReceipt) payoutReceipt.classList.add('hidden');
  } else {
    if (simControls) simControls.classList.remove('hidden');
    if (payoutReceipt) payoutReceipt.classList.add('hidden');
  }
}

function renderRoster(pledges) {
  const tbody = document.getElementById('roster-body');
  const empty = document.getElementById('empty-roster');
  const countEl = document.getElementById('roster-count');

  if (countEl) countEl.textContent = `${pledges.length} records`;

  if (!tbody) return;
  if (pledges.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  tbody.innerHTML = pledges.map((p, idx) => `
    <tr class="hover:bg-white/[0.02] transition">
      <td class="py-3 px-3 text-gray-500 font-mono text-xs">${idx + 1}</td>
      <td class="py-3 px-3 font-semibold text-white">${p.name}</td>
      <td class="py-3 px-3 text-gray-400 font-mono text-xs">${p.rollNo}</td>
      <td class="py-3 px-3 text-gray-400">${p.tier}</td>
      <td class="py-3 px-3 text-right font-bold text-emerald-400">₹${p.amount.toLocaleString('en-IN')}</td>
      <td class="py-3 px-3 text-center">
        <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
          p.status === 'Escrow Locked' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
          p.status === 'Disbursed to Vendor' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
          'bg-red-500/10 text-red-400 border border-red-500/20'
        }">${p.status}</span>
      </td>
    </tr>
  `).join('');
}

// ──────────────────────────────────────
// CAMPAIGN CREATION & EDITING MODAL
// ──────────────────────────────────────
function openCreateCampaignModal() {
  editMode = false;
  document.getElementById('campaign-modal-title').textContent = '+ Create New Campaign';
  document.getElementById('cm-submit-btn').textContent = 'Create Campaign';
  document.getElementById('cm-title').value = '';
  document.getElementById('cm-target').value = '';
  document.getElementById('cm-category').value = 'Tech Fest';
  document.getElementById('cm-deadline').value = '72';
  document.getElementById('cm-desc').value = '';

  document.getElementById('cm-title').disabled = false;
  document.getElementById('cm-category').disabled = false;
  document.getElementById('cm-deadline').disabled = false;
  document.getElementById('cm-desc').disabled = false;

  const modal = document.getElementById('create-campaign-modal');
  if (modal) modal.classList.remove('hidden');
}

async function openEditCampaignModal() {
  editMode = true;
  const campaign = await ApiClient.fetchCampaign(activeCampaignId);
  if (!campaign) return;

  document.getElementById('campaign-modal-title').textContent = 'Edit Campaign Threshold';
  document.getElementById('cm-submit-btn').textContent = 'Update Threshold';
  document.getElementById('cm-title').value = campaign.title;
  document.getElementById('cm-target').value = campaign.targetAmount;
  document.getElementById('cm-category').value = campaign.category;
  document.getElementById('cm-desc').value = campaign.description || '';

  // Only allow editing threshold dynamically
  document.getElementById('cm-title').disabled = true;
  document.getElementById('cm-category').disabled = true;
  document.getElementById('cm-deadline').disabled = true;
  document.getElementById('cm-desc').disabled = true;

  const modal = document.getElementById('create-campaign-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeCampaignModal() {
  const modal = document.getElementById('create-campaign-modal');
  if (modal) modal.classList.add('hidden');
}

async function submitCampaignForm() {
  const target = parseInt(document.getElementById('cm-target').value, 10);

  if (!target || target <= 0) {
    showToast('Please enter a valid target amount.', 'warning');
    return;
  }

  if (editMode) {
    // Dynamic threshold update
    try {
      await ApiClient.updateThreshold(activeCampaignId, target);
      showToast(`Target threshold updated to ₹${target.toLocaleString('en-IN')}`, 'success');
      closeCampaignModal();
      const campaign = await ApiClient.fetchCampaign(activeCampaignId);
      await renderCampaign(campaign);
      await renderCampaignDropdown();
    } catch (err) {
      showToast(err.message || 'Failed to update threshold', 'error');
    }
  } else {
    // Create new campaign
    const title = document.getElementById('cm-title').value.trim();
    const category = document.getElementById('cm-category').value;
    const deadlineHours = parseInt(document.getElementById('cm-deadline').value, 10) || 72;
    const desc = document.getElementById('cm-desc').value.trim();

    if (!title) {
      showToast('Event title is required.', 'warning');
      return;
    }

    try {
      const created = await ApiClient.createCampaign({
        title,
        targetAmount: target,
        category,
        deadlineHours,
        description: desc
      });

      showToast(`Campaign "${created.title}" created!`, 'success');
      closeCampaignModal();
      activeCampaignId = created.id;
      await renderCampaign(created);
      await renderCampaignDropdown();
    } catch (err) {
      showToast(err.message || 'Failed to create campaign', 'error');
    }
  }
}

// ──────────────────────────────────────
// SIMULATION ACTIONS
// ──────────────────────────────────────
async function simulateGoalMet() {
  try {
    await ApiClient.disburseFunds(activeCampaignId);
    showToast('Escrow funds released to vendor account!', 'success');
    launchConfetti();
    const campaign = await ApiClient.fetchCampaign(activeCampaignId);
    await renderCampaign(campaign);
  } catch (err) {
    showToast(err.message || 'Failed to release funds', 'error');
  }
}

async function simulateCancelled() {
  try {
    await ApiClient.refundCampaign(activeCampaignId);
    showToast('Event cancelled. All pledges auto-refunded to UPI handles!', 'info');
    const campaign = await ApiClient.fetchCampaign(activeCampaignId);
    await renderCampaign(campaign);
  } catch (err) {
    showToast(err.message || 'Failed to trigger refunds', 'error');
  }
}

async function resetDemo() {
  try {
    await ApiClient.resetDemo();
    showToast('Demo data reset to default seed state.', 'info');
    const campaigns = await ApiClient.fetchCampaigns();
    if (campaigns.length > 0) {
      activeCampaignId = campaigns[0].id;
      await renderCampaign(campaigns[0]);
    }
    await renderCampaignDropdown();
  } catch (err) {
    showToast(err.message || 'Failed to reset demo', 'error');
  }
}
