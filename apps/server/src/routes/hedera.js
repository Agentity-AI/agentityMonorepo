const express = require("express");
const axios = require("axios");
const router = express.Router();

const {
  getHederaExplorerUrl,
  getHederaMirrorNodeUrl,
} = require("../config/hedera");
const { buildHederaRuntimeStatus } = require("../services/hedera/client");
const {
  findProofByTransactionId,
} = require("../services/hedera/registryService");
const { ValidationError, requireString } = require("../utils/validation");

/**
 * @openapi
 * tags:
 *   - name: Trust Runtime
 *     description: Trust Runtime status and proof inspection
 */

/**
 * @openapi
 * /hedera/status:
 *   get:
 *     tags: [Trust Runtime]
 *     summary: Get Trust Runtime status
 *     description: |
 *       Returns operator, mirror node, HCS topic, proof mode, and payment mode configuration.
 *       The endpoint never requires live credentials for local testing; missing credentials are
 *       reported as simulated proof/payment mode instead of crashing the API.
 *     responses:
 *       200:
 *         description: Trust Runtime configuration
 */
router.get("/status", (req, res) => {
  return res.json(buildHederaRuntimeStatus());
});

function normalizeMirrorTransactionId(transactionId) {
  return String(transactionId).replace("@", "-").replace(/-(\d+)\.(\d+)$/, "-$1-$2");
}

async function fetchMirrorTransaction(transactionId) {
  const mirrorNodeUrl = getHederaMirrorNodeUrl();
  const normalizedId = normalizeMirrorTransactionId(transactionId);

  try {
    const response = await axios.get(
      `${mirrorNodeUrl}/api/v1/transactions/${encodeURIComponent(normalizedId)}`,
      { timeout: 5000 },
    );
    return response.data;
  } catch (error) {
    return {
      unavailable: true,
      message: error.response?.data?._status?.messages?.[0]?.message || error.message,
    };
  }
}

/**
 * @openapi
 * /hedera/transactions/{transactionId}:
 *   get:
 *     tags: [Trust Runtime]
 *     summary: Inspect a Trust Runtime transaction and local Agentity proof
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Trust Runtime transaction ID, for example `0.0.1234@1710000000.000000001`.
 *     responses:
 *       200:
 *         description: Transaction and local proof details
 *       400:
 *         description: Invalid transaction ID
 */
router.get("/transactions/:transactionId", async (req, res, next) => {
  try {
    const transactionId = requireString(req.params.transactionId, "transactionId", {
      min: 6,
      max: 160,
    });
    const [proof, mirror] = await Promise.all([
      findProofByTransactionId(transactionId),
      fetchMirrorTransaction(transactionId),
    ]);

    return res.json({
      transactionId,
      explorerUrl: getHederaExplorerUrl(transactionId, "transaction"),
      mirror,
      proof: proof
        ? {
            id: proof.id,
            agentId: proof.agent_id,
            type: proof.proof_type,
            proofHash: proof.proof_hash,
            payload: proof.proof_payload,
            createdAt: proof.created_at,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }

    next(error);
  }
});

module.exports = router;
