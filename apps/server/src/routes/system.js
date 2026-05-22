const express = require("express");
const router = express.Router();

const { buildHederaRuntimeStatus } = require("../services/hedera/client");

/**
 * @openapi
 * tags:
 *   - name: System
 *     description: Runtime and network status endpoints
 */

/**
 * @openapi
 * /system/status:
 *   get:
 *     tags: [System]
 *     summary: Get runtime dependency status
 *     description: |
 *       Returns a lightweight environment-level health summary that helps the frontend
 *       and operators confirm whether major optional integrations are configured.
 *     responses:
 *       200:
 *         description: System status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 api:
 *                   type: string
 *                   example: "healthy"
 *                 database:
 *                   type: string
 *                   example: "connected"
 *                 hedera:
 *                   type: object
 *                   additionalProperties: true
 *                 network:
 *                   type: string
 *                   example: "testnet"
 */
router.get("/status", async (req, res) => {
  const databaseStatus = req.app.locals.databaseStatus || {
    status: "unknown",
    checkedAt: null,
    syncStatus: "unknown",
  };

  return res.json({
    api: "healthy",
    database: databaseStatus.status,
    databaseCheckedAt: databaseStatus.checkedAt,
    databaseSyncStatus: databaseStatus.syncStatus,
    hedera: buildHederaRuntimeStatus(),
    network: process.env.HEDERA_NETWORK || "testnet",
  });
});

module.exports = router;
