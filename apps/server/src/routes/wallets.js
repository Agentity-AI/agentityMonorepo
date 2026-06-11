const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const Agent = require("../models/agent");
const AgentWallet = require("../models/agentWallet");
const { requireAuth } = require("../middleware/auth");
const { logEvent } = require("../services/audit/logEvent");
const { createMonitoringAlert } = require("../services/alerts/alertService");
const {
  ValidationError,
  requireHederaAccountId,
  requireString,
  requireUuid,
} = require("../utils/validation");
const { getHederaNetwork } = require("../config/hedera");

/**
 * @openapi
 * tags:
 *   - name: Wallets
 *     description: Hedera account linkage for agents
 */

/**
 * @openapi
 * /wallets/link:
 *   post:
 *     tags: [Wallets]
 *     summary: Link a Hedera account to an authenticated user's agent
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [agentId, hederaAccountId]
 *             properties:
 *               agentId:
 *                 type: string
 *               hederaAccountId:
 *                 type: string
 *                 example: "0.0.1234567"
 *               hederaPublicKey:
 *                 type: string
 *                 description: Optional public key override. Defaults to `hederaAccountId`.
 *               network:
 *                 type: string
 *                 example: "testnet"
 *               kmsKeyId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Linked Hedera account
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found
 *       409:
 *         description: Hedera account already linked to another user's agent
 */
router.post("/link", requireAuth, async (req, res, next) => {
  try {
    const trimmedAgentId = requireUuid(req.body?.agentId, "agentId");
    const trimmedHederaAccountId = requireHederaAccountId(
      req.body?.hederaAccountId || req.body?.walletAddress,
      "hederaAccountId",
    );
    const trimmedHederaPublicKey = req.body?.hederaPublicKey
      ? requireString(req.body.hederaPublicKey, "hederaPublicKey", {
          min: 6,
          max: 255,
        })
      : trimmedHederaAccountId;
    const network = req.body?.network
      ? requireString(req.body.network, "network", { min: 3, max: 32 })
      : getHederaNetwork();
    const trimmedKmsKeyId = req.body?.kmsKeyId
      ? requireString(req.body.kmsKeyId, "kmsKeyId", { min: 3, max: 255 })
      : null;

    const agent = await Agent.findOne({
      where: {
        id: trimmedAgentId,
        creator_id: req.user.id,
      },
    });

    if (!agent) {
      return res.status(404).json({ message: "Agent not found for this user" });
    }

    const existingWalletForAgent = await AgentWallet.findOne({
      where: { agent_id: agent.id },
    });

    const existingWalletForAccount = await AgentWallet.findOne({
      where: {
        hedera_account_id: trimmedHederaAccountId,
        agent_id: { [Op.ne]: agent.id },
      },
      include: [
        {
          model: Agent,
          as: "agent",
          required: false,
          attributes: ["id", "creator_id"],
        },
      ],
    });

    if (
      existingWalletForAccount &&
      existingWalletForAccount.agent?.creator_id &&
      existingWalletForAccount.agent.creator_id !== req.user.id
    ) {
      return res.status(409).json({
        message: "This Hedera account is already linked to another user's agent",
      });
    }

    if (
      existingWalletForAgent &&
      existingWalletForAccount &&
      existingWalletForAgent.id !== existingWalletForAccount.id
    ) {
      await existingWalletForAgent.destroy();
    }

    if (existingWalletForAgent) {
      await existingWalletForAgent.update({
        hedera_account_id: trimmedHederaAccountId,
        hedera_public_key: trimmedHederaPublicKey,
        network,
        kms_key_id: trimmedKmsKeyId || null,
        status: "linked",
      });
    } else if (existingWalletForAccount) {
      await existingWalletForAccount.update({
        agent_id: agent.id,
        hedera_public_key: trimmedHederaPublicKey,
        network,
        kms_key_id: trimmedKmsKeyId || null,
        status: "linked",
      });
    } else {
      await AgentWallet.create({
        agent_id: agent.id,
        hedera_account_id: trimmedHederaAccountId,
        hedera_public_key: trimmedHederaPublicKey,
        network,
        kms_key_id: trimmedKmsKeyId || null,
        status: "linked",
      });
    }

    const wallet = await AgentWallet.findOne({
      where: { agent_id: agent.id },
    });

    await logEvent(req, {
      action: "wallet_link",
      agentId: agent.id,
      payload: {
        hederaAccountId: trimmedHederaAccountId,
        network,
        kmsKeyId: trimmedKmsKeyId || null,
      },
    });

    await createMonitoringAlert({
      userId: req.user.id,
      agentId: agent.id,
      sourceId: wallet.id,
      sourceType: "agent_wallet",
      title: "Hedera wallet linked",
      severity: "low",
      type: "wallet_linked",
      message: `${agent.agent_name} is linked to Hedera account ${wallet.hedera_account_id}.`,
      metadata: {
        hederaAccountId: wallet.hedera_account_id,
        network: wallet.network,
      },
    });

    return res.json({
      id: wallet.id,
      agentId: wallet.agent_id,
      hederaAccountId: wallet.hedera_account_id,
      hederaPublicKey: wallet.hedera_public_key,
      network: wallet.network,
      kmsKeyId: wallet.kms_key_id,
      status: wallet.status,
      createdAt: wallet.created_at,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message:
          "Wallet link conflict detected. This Hedera account may already be linked.",
      });
    }

    next(error);
  }
});

module.exports = router;
