const express = require("express");
const router = express.Router();

const Agent = require("../models/agent");
const { requireAuth } = require("../middleware/auth");
const { simulateAgent } = require("../services/sandbox/sandboxService");
const { executeAgentWorkflow } = require("../services/execution/agentExecutionService");
const { logEvent } = require("../services/audit/logEvent");
const { createExecutionProof } = require("../services/hedera/registryService");
const { getConsensusTopicIdString } = require("../config/hedera");
const { createAlert } = require("../services/alerts/alertService");
const { createTransactionRecord } = require("../services/transactions/transactionService");

/**
 * @openapi
 * tags:
 *   - name: Execution
 *     description: Agent execution via sandbox, policy checks, and Trust Runtime proof logging
 */

/**
 * @openapi
 * /execute/{id}:
 *   post:
 *     tags: [Execution]
 *     summary: Execute a verified agent
 *     description: Runs sandbox simulation, executes the Agentity trust workflow, and writes a Trust Runtime proof.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Agent UUID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 example: "Manual execution triggered from Swagger"
 *                 description: Optional note for frontend/operator context. Currently ignored by the backend logic.
 *     responses:
 *       200:
 *         description: Simulation + execution + blockchain result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 simulation:
 *                   type: object
 *                   additionalProperties: true
 *                 execution:
 *                   type: object
 *                   additionalProperties: true
 *                 hederaProof:
 *                   nullable: true
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Agent must be verified
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Execution failed
 */
router.post("/:id", requireAuth, async (req, res, next) => {
  try {
    const agent = await Agent.findOne({
      where: {
        id: req.params.id,
        creator_id: req.user.id,
      },
    });

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    if (agent.status !== "verified") {
      return res.status(400).json({ message: "Agent must be verified" });
    }

    try {
      const simulationResult = await simulateAgent(agent.id);
      const executionResult = await executeAgentWorkflow(agent, simulationResult);
      const hederaProof = await createExecutionProof({
        agent,
        task: {
          id: agent.id,
          task_type: "manual_agent_execution",
        },
        executionResult,
        riskScore: simulationResult?.riskScore || simulationResult?.risk_score || 0,
      });

      await createTransactionRecord({
        userId: req.user.id,
        agentId: agent.id,
        transactionType: "execution",
        contractAddress: getConsensusTopicIdString(),
        status: "completed",
        riskRating:
          simulationResult?.riskScore >= 70
            ? "high"
            : simulationResult?.riskScore >= 40
              ? "medium"
              : "low",
        txHash: hederaProof.transactionId || executionResult?.txHash || null,
        validationSummary: {
          hederaProofHash: hederaProof.proofHash,
          simulatedProof: hederaProof.simulated,
        },
        executionTrace: {
          simulation: simulationResult,
          execution: executionResult,
          hederaProof,
        },
      });

      await logEvent(req, {
        action: "agent_execute",
        agentId: agent.id,
        payload: {
          executionResult,
          hederaProof,
        },
      });

      return res.json({
        simulation: simulationResult,
        execution: executionResult,
        hederaProof,
      });
    } catch (executionError) {
      await createAlert({
        userId: req.user.id,
        agentId: agent.id,
        sourceId: agent.id,
        sourceType: "agent",
        title: "Agent execution failed",
        severity: "critical",
        type: "execution_failure",
        message: executionError.message,
      });

      throw executionError;
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
