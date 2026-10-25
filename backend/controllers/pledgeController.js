/**
 * MicroEscrow — Pledge Controller
 * Handles student UPI micro-pledges, vault hash receipt generation, and audit logging
 */

const db = require('../database/database');

function genPledgeId() {
  return 'PLG-' + Math.random().toString(36).substring(2, 9).toUpperCase();
}

function genVaultHash() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `#ESC-${num}-2026`;
}

/**
 * Format pledge row for API response
 */
function formatPledge(p) {
  return {
    id: p.id,
    campaignId: p.campaign_id,
    userId: p.user_id || null,
    name: p.name,
    rollNo: p.roll_no,
    phone: p.phone,
    tier: p.tier,
    amount: Number(p.amount),
    timestamp: Number(p.timestamp),
    status: p.status,
    vaultHash: p.vault_hash
  };
}

/**
 * GET /api/pledges
 * List all pledges across all campaigns
 */
async function getAllPledges(req, res) {
  try {
    const rows = await db.query('SELECT * FROM pledges ORDER BY timestamp DESC');
    res.json({ success: true, data: rows.map(formatPledge) });
  } catch (err) {
    console.error('Error fetching all pledges:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/pledges/campaign/:campaignId
 * List pledges for a specific campaign
 */
async function getPledgesByCampaign(req, res) {
  try {
    const { campaignId } = req.params;
    const rows = await db.query('SELECT * FROM pledges WHERE campaign_id = ? ORDER BY timestamp DESC', [campaignId]);
    res.json({ success: true, data: rows.map(formatPledge) });
  } catch (err) {
    console.error('Error fetching campaign pledges:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/pledges
 * Submit a new UPI micro-pledge
 */
async function createPledge(req, res) {
  try {
    const { campaignId, userId, name, rollNo, phone, tier, amount } = req.body;

    if (!campaignId || !name || !amount) {
      return res.status(400).json({ success: false, error: 'Campaign ID, backer name, and pledge amount are required.' });
    }

    // Verify campaign exists & is still open
    const campaigns = await db.query('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
    if (!campaigns || campaigns.length === 0) {
      return res.status(404).json({ success: false, error: 'Target campaign not found.' });
    }

    const campaign = campaigns[0];
    if (campaign.status !== 'funding') {
      return res.status(400).json({ success: false, error: `Campaign is closed (${campaign.status}). No new pledges accepted.` });
    }

    const pledgeId = genPledgeId();
    const vaultHash = genVaultHash();
    const now = Date.now();
    const numAmount = Number(amount);

    await db.query(`
      INSERT INTO pledges (id, campaign_id, user_id, name, roll_no, phone, tier, amount, timestamp, status, vault_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Escrow Locked', ?)
    `, [
      pledgeId,
      campaignId,
      userId || null,
      name.trim(),
      (rollNo || '2026STU' + Math.floor(100 + Math.random() * 900)).trim(),
      (phone || '98' + Math.floor(10000000 + Math.random() * 90000000)).trim(),
      tier || 'General Pass',
      numAmount,
      now,
      vaultHash
    ]);

    const createdPledge = {
      id: pledgeId,
      campaignId,
      name: name.trim(),
      rollNo: rollNo || '',
      phone: phone || '',
      tier: tier || 'General Pass',
      amount: numAmount,
      timestamp: now,
      status: 'Escrow Locked',
      vaultHash
    };

    // Calculate new total pledged for this campaign
    const stats = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_pledged, COUNT(id) AS backer_count
      FROM pledges WHERE campaign_id = ?
    `, [campaignId]);

    res.status(201).json({
      success: true,
      message: 'UPI Pledge received & locked into Escrow Vault!',
      data: createdPledge,
      campaignStats: {
        totalPledged: Number(stats[0].total_pledged),
        backerCount: Number(stats[0].backer_count)
      }
    });
  } catch (err) {
    console.error('Error submitting pledge:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getAllPledges,
  getPledgesByCampaign,
  createPledge
};
