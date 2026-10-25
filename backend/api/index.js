/**
 * MicroEscrow — API Router Central Hub
 * Mounts all resource routes under /api
 */

const express = require("express");
const router = express.Router();

const campaignRoutes = require("./campaignRoutes");
const pledgeRoutes = require("./pledgeRoutes");
const authRoutes = require("./authRoutes");

router.use("/auth", authRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/pledges", pledgeRoutes);

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    platform: "MicroEscrow UPI Platform",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
