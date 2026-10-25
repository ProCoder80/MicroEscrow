/**
 * MicroEscrow — Digital Escrow Vault Pass Module
 * Handles vault hash ticket rendering, WhatsApp share link, and print layout
 */

function openVaultPass() {
  const p = lastPledge;
  if (!p) {
    showToast('No recent pledge to display.', 'info');
    return;
  }

  document.getElementById('vault-hash').textContent = p.vaultHash || '#ESC-XXXX-2026';
  document.getElementById('vault-name').textContent = p.name;
  document.getElementById('vault-roll').textContent = p.rollNo;
  document.getElementById('vault-tier').textContent = p.tier;
  document.getElementById('vault-amount').textContent = '₹' + p.amount.toLocaleString('en-IN');

  const modal = document.getElementById('vault-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeVaultModal() {
  const modal = document.getElementById('vault-modal');
  if (modal) modal.classList.add('hidden');
}

function shareWhatsApp() {
  const p = lastPledge;
  if (!p) return;
  const msg = encodeURIComponent(
    `🎟️ *MicroEscrow Vault Pass*\n` +
    `Event: Tech Fest 2026\n` +
    `Vault ID: *${p.vaultHash}*\n` +
    `Amount Locked: ₹${p.amount}\n` +
    `Tier: ${p.tier}\n` +
    `Status: 🔒 Escrow Locked (Auto-Refund Guaranteed)\n\n` +
    `Backed via MicroEscrow UPI Platform`
  );
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

function printVaultPass() {
  window.print();
}
