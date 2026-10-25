/**
 * MicroEscrow — Campaign Controller
 * Handles business logic and MySQL persistence for campaigns
 */

const db = require('../database/database');

function genCampaignId() {
  return 'C-' + Math.random().toString(36).substring(2, 9).toUpperCase();
}

/**
 * Format campaign row for API response
 */
function formatCampaign(c) {
  return {
    id: c.id,
    title: c.title,
    targetAmount: Number(c.target_amount),
    category: c.category,
    deadline: Number(c.deadline),
    description: c.description || '',
    status: c.status,
    createdAt: Number(c.created_at),
    totalPledged: Number(c.total_pledged || 0),
    backerCount: Number(c.backer_count || 0)
  };
}

/**
 * GET /api/campaigns
 * List all campaigns with aggregate pledged total & backer count
 */
async function getAllCampaigns(req, res) {
  try {
    const rows = await db.query(`
      SELECT 
        c.*,
        COALESCE(SUM(p.amount), 0) AS total_pledged,
        COUNT(p.id) AS backer_count
      FROM campaigns c
      LEFT JOIN pledges p ON c.id = p.campaign_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    res.json({
      success: true,
      data: rows.map(formatCampaign),
      isMySQL: db.isMySQLConnected()
    });
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/campaigns/:id
 * Get single campaign by ID
 */
async function getCampaignById(req, res) {
  try {
    const { id } = req.params;
    const rows = await db.query(`
      SELECT 
        c.*,
        COALESCE(SUM(p.amount), 0) AS total_pledged,
        COUNT(p.id) AS backer_count
      FROM campaigns c
      LEFT JOIN pledges p ON c.id = p.campaign_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    res.json({ success: true, data: formatCampaign(rows[0]) });
  } catch (err) {
    console.error('Error fetching campaign:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/campaigns
 * Create a new dynamic campaign
 */
async function createCampaign(req, res) {
  try {
    const { title, targetAmount, category, deadlineHours, description } = req.body;

    if (!title || !targetAmount) {
      return res.status(400).json({ success: false, error: 'Title and targetAmount are required.' });
    }

    const id = genCampaignId();
    const now = Date.now();
    const deadline = now + (Number(deadlineHours) || 72) * 3600000;

    await db.query(`
      INSERT INTO campaigns (id, title, target_amount, category, deadline, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'funding', ?)
    `, [id, title.trim(), Number(targetAmount), category || 'Campus Event', deadline, description || '', now]);

    const created = await db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    res.status(201).json({
      success: true,
      message: 'Campaign created successfully.',
      data: formatCampaign({ ...created[0], total_pledged: 0, backer_count: 0 })
    });
  } catch (err) {
    console.error('Error creating campaign:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/campaigns/:id/threshold
 * Dynamically adjust target threshold amount
 */
async function updateThreshold(req, res) {
  try {
    const { id } = req.params;
    const { targetAmount } = req.body;

    if (!targetAmount || Number(targetAmount) <= 0) {
      return res.status(400).json({ success: false, error: 'Valid targetAmount is required.' });
    }

    await db.query('UPDATE campaigns SET target_amount = ? WHERE id = ?', [Number(targetAmount), id]);

    res.json({
      success: true,
      message: `Campaign target threshold updated to ₹${Number(targetAmount).toLocaleString('en-IN')}.`,
      targetAmount: Number(targetAmount)
    });
  } catch (err) {
    console.error('Error updating threshold:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/campaigns/:id/disburse
 * Release vaulted escrow funds to vendor
 */
async function disburseCampaign(req, res) {
  try {
    const { id } = req.params;
    await db.query('UPDATE campaigns SET status = ? WHERE id = ?', ['disbursed', id]);
    await db.query('UPDATE pledges SET status = ? WHERE campaign_id = ?', ['Disbursed to Vendor', id]);

    res.json({
      success: true,
      message: 'Escrow funds successfully disbursed to vendor!',
      status: 'disbursed'
    });
  } catch (err) {
    console.error('Error disbursing campaign:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/campaigns/:id/refund
 * Trigger emergency or deadline auto-refund to students
 */
async function refundCampaign(req, res) {
  try {
    const { id } = req.params;
    await db.query('UPDATE campaigns SET status = ? WHERE id = ?', ['refunded', id]);
    await db.query('UPDATE pledges SET status = ? WHERE campaign_id = ?', ['Refund Issued', id]);

    res.json({
      success: true,
      message: 'Auto-refund triggered: Pledges returned to original student UPI handles.',
      status: 'refunded'
    });
  } catch (err) {
    console.error('Error refunding campaign:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * DELETE /api/campaigns/:id
 * Delete campaign and all associated pledges
 */
async function deleteCampaign(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM campaigns WHERE id = ?', [id]);
    res.json({ success: true, message: 'Campaign deleted successfully.' });
  } catch (err) {
    console.error('Error deleting campaign:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/campaigns/reset-demo
 * Reset database back to default seed records
 */
async function resetDemo(req, res) {
  try {
    await db.resetDemoData();
    res.json({ success: true, message: 'Demo data reset successfully.' });
  } catch (err) {
    console.error('Error resetting demo:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateThreshold,
  disburseCampaign,
  refundCampaign,
  deleteCampaign,
  resetDemo
};
