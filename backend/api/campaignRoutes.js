/**
 * MicroEscrow — Campaign API Endpoints
 * Route definitions for /api/campaigns
 */

const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

// GET /api/campaigns - List all campaigns with real-time totals
router.get('/', campaignController.getAllCampaigns);

// POST /api/campaigns - Create a new campaign
router.post('/', campaignController.createCampaign);

// POST /api/campaigns/reset-demo - Reset demo seed data
router.post('/reset-demo', campaignController.resetDemo);

// GET /api/campaigns/:id - Fetch single campaign
router.get('/:id', campaignController.getCampaignById);

// PATCH /api/campaigns/:id/threshold - Dynamically adjust threshold
router.patch('/:id/threshold', campaignController.updateThreshold);

// POST /api/campaigns/:id/disburse - Release escrow funds to vendor
router.post('/:id/disburse', campaignController.disburseCampaign);

// POST /api/campaigns/:id/refund - Trigger auto-refund to backers
router.post('/:id/refund', campaignController.refundCampaign);

// DELETE /api/campaigns/:id - Delete campaign
router.delete('/:id', campaignController.deleteCampaign);

module.exports = router;
