/**
 * MicroEscrow — Authentication API Routes
 * Endpoints for /api/auth
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/login - Role-based authorization
router.post('/login', authController.login);

// POST /api/auth/register - Create account
router.post('/register', authController.register);

// GET /api/auth/me/:id - Current user details
router.get('/me/:id', authController.getMe);

// GET /api/auth/my-pledges/:userId - Real-time student pledge vault history
router.get('/my-pledges/:userId', authController.getMyPledges);

module.exports = router;
