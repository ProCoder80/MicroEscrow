/**
 * MicroEscrow — Pledge API Endpoints
 * Route definitions for /api/pledges
 */

const express = require('express');
const router = express.Router();
const pledgeController = require('../controllers/pledgeController');

// GET /api/pledges - List all pledges
router.get('/', pledgeController.getAllPledges);

// GET /api/pledges/campaign/:campaignId - List pledges for a campaign
router.get('/campaign/:campaignId', pledgeController.getPledgesByCampaign);

// POST /api/pledges - Submit a new UPI micro-pledge
router.post('/', pledgeController.createPledge);

module.exports = router;
