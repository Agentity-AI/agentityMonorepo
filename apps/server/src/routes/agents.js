const express = require("express");
const router = express.Router();

const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Agent = require("../models/agent");
const AgentMetadata = require("../models/agentMetadata");
const AgentReputation = require("../models/agentReputation");
const AgentBehaviorLog = require("../models/agentBehaviorLog");
const AgentHederaRegistry = require("../models/agentHederaRegistry");

const { requireAuth } = require("../middleware/auth");
const { generateFingerprint } = require("../services/fingerprint");
const { logEvent } = require("../services/audit/logEvent");
const {
  ensureAgentRegistered,
  runImmediateVerification,
  getAgentHistory,
} = require("../services/hedera/registryService");
const { linkWalletToAgent } = require("../services/hedera/walletService");
const {
  createAlert,
  createMonitoringAlert,
} = require("../services/alerts/alertService");
const { getHederaNetwork, getHederaExplorerUrl } = require("../config/hedera");
const {
  ValidationError,
  optionalObject,
  optionalString,
  optionalUrl,
  requireString,
  requireUuid,
} = require("../utils/validation");

const AGENT_TYPES = [
  "Governance Agent",
  "DeFi Agent",
  "NFT Agent",
  "Trading Bot",
  "Risk Monitoring Agent",
  "Treasury Agent",
];

function parseJsonMaybe(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeRegisterPayload(body) {
  const metadataValue = parseJsonMaybe(
    body.metadata || body.metadata_json || body.metadataJson,
  );
  const agent_name = requireString(
    body.agent_name || body.agentName || body.name,
    "agentName",
    { min: 2, max: 120 },
  );
  const description = optionalString(body.description, "description", {
    max: 1000,
  });
  const agent_type = optionalString(body.agent_type || body.agentType, "agentType", {
    max: 80,
  });
  const public_key = requireString(
    body.public_key ||
      body.publicKey ||
      body.wallet_address ||
      body.walletAddress,
    "publicKey",
    { min: 6, max: 255 },
  );
  const api_endpoint = optionalUrl(
    body.api_endpoint || body.apiEndpoint,
    "apiEndpoint",
  );
  const model_name = optionalString(body.model_name || body.modelName, "modelName", {
    max: 120,
  }) || agent_type || "unknown";
  const version = optionalString(body.version, "version", {
    max: 32,
  }) || "unknown";
  const execution_environment =
    optionalString(
      body.execution_environment || body.executionEnvironment,
      "executionEnvironment",
      { max: 80 },
    ) || (api_endpoint ? "api" : "unknown");
  const metadata_json = metadataValue == null ? null : optionalObject(metadataValue, "metadata");

  return {
    agent_name,
    public_key,
    description,
    agent_type,
    api_endpoint,
    model_name,
    version,
    execution_environment,
    metadata_json,
  };
}

function formatAgentResponse(agent, options = {}) {
  const data = typeof agent.toJSON === "function" ? agent.toJSON() : agent;
  const lastActivity = options.lastActivity || null;

  return {
    id: data.id,
    creatorId: data.creator_id,
    agentName: data.agent_name,
    publicKey: data.public_key,
    fingerprint: data.fingerprint,
    status: data.status,
    agentType: data.metadata?.model_name || null,
    description: data.description || null,
    apiEndpoint: data.api_endpoint || null,
    metadata: data.metadata
      ? {
          modelName: data.metadata.model_name,
          version: data.metadata.version,
          executionEnvironment: data.metadata.execution_environment,
        }
      : null,
    reputation: data.reputation
      ? {
          score: data.reputation.score,
          riskLevel: data.reputation.risk_level,
        }
      : null,
    hedera: data.hederaRegistry
      ? {
          registrationTransactionId: data.hederaRegistry.registration_transaction_id,
          registrationTopicSequenceNumber: data.hederaRegistry.registration_topic_sequence_number,
          proofHash: data.hederaRegistry.proof_hash,
          currentScore: data.hederaRegistry.current_score,
          currentRiskLevel: data.hederaRegistry.current_risk_level,
          verificationCount: data.hederaRegistry.verification_count,
          lastVerifiedAt: data.hederaRegistry.last_verified_at,
          status: data.hederaRegistry.status,
          network: data.hederaRegistry.network,
          explorerUrl: data.hederaRegistry.registration_transaction_id
            ? getHederaExplorerUrl(data.hederaRegistry.registration_transaction_id, "transaction")
            : null,
        }
      : null,
    lastActivityAt: lastActivity?.createdAt || null,
    lastActivityType: lastActivity?.type || null,
    createdAt: data.createdAt,
  };
}

function buildLatestByAgentId(items) {
  const map = new Map();

  for (const item of items) {
    const key = item.agent_id;
    if (!key || map.has(key)) continue;
    map.set(key, item);
  }

  return map;
}

async function hydrateAgentRelations(agents) {
  const agentIds = agents.map((agent) => agent.id);
  if (agentIds.length === 0) return [];

  const [metadataRows, reputationRows, hederaRows] = await Promise.all([
    AgentMetadata.findAll({
      where: { agent_id: { [Op.in]: agentIds } },
      order: [["updatedAt", "DESC"], ["createdAt", "DESC"]],
    }),
    AgentReputation.findAll({
      where: { agent_id: { [Op.in]: agentIds } },
      order: [["updatedAt", "DESC"], ["createdAt", "DESC"]],
    }),
    AgentHederaRegistry.findAll({
      where: { agent_id: { [Op.in]: agentIds } },
      order: [["updated_at", "DESC"], ["created_at", "DESC"]],
    }),
  ]);

  const metadataMap = buildLatestByAgentId(metadataRows);
  const reputationMap = buildLatestByAgentId(reputationRows);
  const hederaMap = buildLatestByAgentId(hederaRows);

  return agents.map((agent) => {
    const json = typeof agent.toJSON === "function" ? agent.toJSON() : { ...agent };

    return {
      ...json,
      metadata: metadataMap.get(agent.id) || null,
      reputation: reputationMap.get(agent.id) || null,
      hederaRegistry: hederaMap.get(agent.id) || null,
    };
  });
}

async function getLatestAgentActivity(agentId) {
  const item = await AgentBehaviorLog.findOne({
    where: { agent_id: agentId },
    order: [["createdAt", "DESC"]],
  });

  if (!item) {
    return null;
  }

  return {
    type: item.event_type,
    createdAt: item.createdAt,
  };
}

/**
 * @openapi
 * /agents/register:
 *   post:
 *     tags: [Agents]
 *     summary: Register agent and tie it to the authenticated user
 *     description: |
 *       Registers a new agent for the authenticated user.
 *       This is the starting point for the full agent lifecycle in Swagger:
 *       register -> verify -> simulate -> pay -> execute.
 *
 *       Frontend contract:
 *       - the current registration modal should primarily send `agentName`, `agentType`,
 *         `publicKey` (wallet address), `description`, `apiEndpoint`, and `metadata`
 *       - `modelName`, `version`, and `executionEnvironment` are still accepted, but they are
 *         advanced optional fields and are no longer required by the UI
 *       - snake_case aliases are still accepted for backward compatibility, but frontend clients
 *         should prefer camelCase going forward
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [agentName, publicKey]
 *             properties:
 *               agentName:
 *                 type: string
 *                 example: "Alpha Trading Bot"
 *                 description: Display name shown in the Agents list and detail views.
 *               agentType:
 *                 type: string
 *                 example: "Trading Bot"
 *                 description: Recommended frontend field. Use one of the labels returned by `GET /agents/types`.
 *               publicKey:
 *                 type: string
 *                 example: "0.0.1234567"
 *                 description: Wallet or public identity key. The backend still requires this for uniqueness and fingerprinting.
 *               description:
 *                 type: string
 *                 example: "Executes monitored trading strategies across supported protocols."
 *               apiEndpoint:
 *                 type: string
 *                 example: "https://agent.example.com/api/trading-bot"
 *                 description: Optional callback or control endpoint for the agent.
 *               metadata:
 *                 type: object
 *                 additionalProperties: true
 *                 example:
 *                   strategy: "swing"
 *                   network: "hedera-testnet"
 *                 description: Optional JSON field from the modal's Metadata input. Strings that contain valid JSON are also accepted by the backend.
 *               modelName:
 *                 type: string
 *                 example: "gpt-4.1"
 *                 description: Advanced optional backend field. If omitted, the backend falls back to `agentType` or `unknown`.
 *               version:
 *                 type: string
 *                 example: "1.0.0"
 *                 description: Advanced optional backend field. Defaults to `unknown` when not provided.
 *               executionEnvironment:
 *                 type: string
 *                 example: "api"
 *                 description: Advanced optional backend field. Defaults to `api` when `apiEndpoint` is supplied, otherwise `unknown`.
 *               agent_name:
 *                 type: string
 *                 deprecated: true
 *               public_key:
 *                 type: string
 *                 deprecated: true
 *               agent_type:
 *                 type: string
 *                 deprecated: true
 *               api_endpoint:
 *                 type: string
 *                 deprecated: true
 *               model_name:
 *                 type: string
 *                 deprecated: true
 *               execution_environment:
 *                 type: string
 *                 deprecated: true
 *           examples:
 *             frontendModalPayload:
 *               summary: Recommended frontend payload
 *               value:
 *                 agentName: "Alpha Trading Bot"
 *                 agentType: "Trading Bot"
 *                 publicKey: "0.0.1234567"
 *                 description: "Executes monitored trading strategies across supported protocols."
 *                 apiEndpoint: "https://agent.example.com/api/trading-bot"
 *                 metadata:
 *                   strategy: "swing"
 *                   network: "hedera-testnet"
 *             advancedPayload:
 *               summary: Optional advanced backend payload
 *               value:
 *                 agentName: "Treasury Risk Monitor"
 *                 agentType: "Risk Monitoring Agent"
 *                 publicKey: "0.0.1234567"
 *                 description: "Monitors treasury and payment risk for the DAO."
 *                 apiEndpoint: "https://agent.example.com/api"
 *                 modelName: "gpt-4.1"
 *                 version: "1.0.0"
 *                 executionEnvironment: "api"
 *                 metadata:
 *                   provider: "openai"
 *                   tier: "production"
 *     responses:
 *       201:
 *         description: Agent registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "ac0d21d5-bb02-4d52-8004-4725488cf007"
 *                 creatorId:
 *                   type: string
 *                   example: "e88a0b64-5cf9-4c13-b095-f5667c2745ff"
 *                 agentName:
 *                   type: string
 *                   example: "Treasury Risk Monitor"
 *                 publicKey:
 *                   type: string
 *                   example: "0.0.1234567"
 *                 fingerprint:
 *                   type: string
 *                   example: "b9e3f7d1a2c4"
 *                 status:
 *                   type: string
 *                   example: "pending"
 *                 agentType:
 *                   nullable: true
 *                   type: string
 *                   example: "risk-monitor"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Missing required registration fields or invalid payload values
 *       401:
 *         description: Missing or invalid authentication token
 *       409:
 *         description: Agent already exists for the given public key
 */
router.post("/register", requireAuth, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const p = normalizeRegisterPayload(req.body || {});

    const existing = await Agent.findOne({
      where: { public_key: p.public_key },
      transaction,
    });

    if (existing) {
      await transaction.rollback();
      return res
        .status(409)
        .json({ message: "Agent already exists", agentId: existing.id });
    }

    const fingerprint = generateFingerprint(p.public_key);

    const agent = await Agent.create(
      {
        creator_id: req.user.id,
        agent_name: p.agent_name,
        public_key: p.public_key,
        fingerprint,
      },
      { transaction },
    );

    await AgentMetadata.create(
      {
        agent_id: agent.id,
        model_name: p.model_name,
        version: p.version,
        execution_environment: p.execution_environment,
      },
      { transaction },
    );

    await AgentReputation.create(
      {
        agent_id: agent.id,
        score: 0.0,
        risk_level: "low",
      },
      { transaction },
    );

    await AgentBehaviorLog.create(
      {
        agent_id: agent.id,
        event_type: "registration",
        event_payload: {
          description: p.description,
          agentType: p.agent_type,
          walletAddress: p.public_key,
          apiEndpoint: p.api_endpoint,
          metadata: p.metadata_json,
          creator_id: req.user.id,
        },
        risk_score: 0.0,
      },
      { transaction },
    );

    await logEvent(req, {
      action: "agent_register",
      agentId: agent.id,
      payload: {
        description: p.description,
        agentType: p.agent_type,
        walletAddress: p.public_key,
        apiEndpoint: p.api_endpoint,
      },
      transaction,
    });

    await transaction.commit();

    await createMonitoringAlert({
      userId: req.user.id,
      agentId: agent.id,
      sourceId: agent.id,
      sourceType: "agent",
      title: "Agent registered",
      severity: "low",
      type: "agent_registered",
      message: `${agent.agent_name} was registered and is ready for verification.`,
      metadata: {
        agentType: p.agent_type,
        fingerprint: agent.fingerprint,
      },
    });

    return res.status(201).json({
      id: agent.id,
      creatorId: agent.creator_id,
      agentName: agent.agent_name,
      publicKey: agent.public_key,
      fingerprint: agent.fingerprint,
      status: agent.status,
      agentType: p.agent_type,
      createdAt: agent.createdAt,
    });
  } catch (error) {
    await transaction.rollback();
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }

    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * @openapi
 * /agents/types:
 *   get:
 *     tags: [Agents]
 *     summary: Get supported agent types for registration forms
 *     description: Returns the preset agent categories the frontend can show in registration dropdowns.
 *     responses:
 *       200:
 *         description: Agent type list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - "Governance Agent"
 *                     - "DeFi Agent"
 *                     - "NFT Agent"
 *                     - "Trading Bot"
 */
router.get("/types", (req, res) => {
  return res.json({ items: AGENT_TYPES });
});

/**
 * @openapi
 * /agents/my:
 *   get:
 *     tags: [Agents]
 *     summary: Get agents registered by the authenticated user
 *     description: Returns the current user's agents in a frontend-friendly normalized shape.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of current user's agents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 1
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "ac0d21d5-bb02-4d52-8004-4725488cf007"
 *                       creatorId:
 *                         type: string
 *                         example: "e88a0b64-5cf9-4c13-b095-f5667c2745ff"
 *                       agentName:
 *                         type: string
 *                         example: "Treasury Risk Monitor"
 *                       publicKey:
 *                         type: string
 *                         example: "0.0.1234567"
 *                       fingerprint:
 *                         type: string
 *                         example: "b9e3f7d1a2c4"
 *                       status:
 *                         type: string
 *                         example: "verified"
 *                       agentType:
 *                         type: string
 *                         example: "Risk Monitoring Agent"
 *                       description:
 *                         nullable: true
 *                         type: string
 *                         example: null
 *                       apiEndpoint:
 *                         nullable: true
 *                         type: string
 *                         example: null
 *                       metadata:
 *                         nullable: true
 *                         type: object
 *                         properties:
 *                           modelName:
 *                             type: string
 *                             example: "Risk Monitoring Agent"
 *                           version:
 *                             type: string
 *                             example: "1.0.0"
 *                           executionEnvironment:
 *                             type: string
 *                             example: "api"
 *                       reputation:
 *                         nullable: true
 *                         type: object
 *                         properties:
 *                           score:
 *                             type: number
 *                             example: 75
 *                           riskLevel:
 *                             type: string
 *                             example: "low"
 *                       hedera:
 *                         nullable: true
 *                         type: object
 *                         properties:
 *                           registrationTransactionId:
 *                             type: string
 *                             example: "5h6wZrR6s5eYbR5m9yQ6s8zM7sLx..."
 *                           currentScore:
 *                             type: integer
 *                             example: 75
 *                           currentRiskLevel:
 *                             type: string
 *                             example: "low"
 *                           verificationCount:
 *                             type: integer
 *                             example: 1
 *                           lastVerifiedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-03-16T15:26:29.803Z"
 *                           status:
 *                             type: string
 *                             example: "verified"
 *                           explorerUrl:
 *                             type: string
 *                             example: "https://hashscan.io/testnet/transaction/..."
 *                       lastActivityAt:
 *                         nullable: true
 *                         type: string
 *                         format: date-time
 *                         example: "2026-03-16T16:28:29.803Z"
 *                       lastActivityType:
 *                         nullable: true
 *                         type: string
 *                         example: "verification"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-03-16T15:00:00.000Z"
 *       401:
 *         description: Unauthorized
 */
router.get("/my", requireAuth, async (req, res) => {
  try {
    const agents = await Agent.findAll({
      where: { creator_id: req.user.id },
      order: [["createdAt", "DESC"]],
    });

    const hydratedAgents = await hydrateAgentRelations(agents);

    const items = await Promise.all(
      hydratedAgents.map(async (agent) =>
        formatAgentResponse(agent, {
          lastActivity: await getLatestAgentActivity(agent.id),
        }),
      ),
    );

    return res.json({
      total: hydratedAgents.length,
      items,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * @openapi
 * /agents/{id}:
 *   get:
 *     tags: [Agents]
 *     summary: Get a single agent owned by the authenticated user
 *     description: Returns one normalized agent object including metadata, reputation, and Hedera proof details when available.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent UUID
 *     responses:
 *       200:
 *         description: Agent details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "ac0d21d5-bb02-4d52-8004-4725488cf007"
 *                 creatorId:
 *                   type: string
 *                   example: "e88a0b64-5cf9-4c13-b095-f5667c2745ff"
 *                 agentName:
 *                   type: string
 *                   example: "Treasury Risk Monitor"
 *                 publicKey:
 *                   type: string
 *                   example: "0.0.1234567"
 *                 fingerprint:
 *                   type: string
 *                   example: "b9e3f7d1a2c4"
 *                 status:
 *                   type: string
 *                   example: "verified"
 *                 agentType:
 *                   type: string
 *                   example: "Risk Monitoring Agent"
 *                 description:
 *                   nullable: true
 *                   type: string
 *                   example: null
 *                 apiEndpoint:
 *                   nullable: true
 *                   type: string
 *                   example: null
 *                 metadata:
 *                   nullable: true
 *                   type: object
 *                   properties:
 *                     modelName:
 *                       type: string
 *                       example: "Risk Monitoring Agent"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     executionEnvironment:
 *                       type: string
 *                       example: "api"
 *                 reputation:
 *                   nullable: true
 *                   type: object
 *                   properties:
 *                     score:
 *                       type: number
 *                       example: 75
 *                     riskLevel:
 *                       type: string
 *                       example: "low"
 *                 hedera:
 *                   nullable: true
 *                   type: object
 *                   properties:
 *                     registrationTransactionId:
 *                       type: string
 *                       example: "5h6wZrR6s5eYbR5m9yQ6s8zM7sLx..."
 *                     currentScore:
 *                       type: integer
 *                       example: 75
 *                     currentRiskLevel:
 *                       type: string
 *                       example: "low"
 *                     verificationCount:
 *                       type: integer
 *                       example: 1
 *                     lastVerifiedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-03-16T15:26:29.803Z"
 *                     status:
 *                       type: string
 *                       example: "verified"
 *                     explorerUrl:
 *                       type: string
 *                       example: "https://hashscan.io/testnet/transaction/..."
 *                 lastActivityAt:
 *                   nullable: true
 *                   type: string
 *                   format: date-time
 *                   example: "2026-03-16T16:28:29.803Z"
 *                 lastActivityType:
 *                   nullable: true
 *                   type: string
 *                   example: "verification"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-03-16T15:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const agentId = requireUuid(req.params.id, "id");
    const agent = await Agent.findOne({
      where: {
        id: agentId,
        creator_id: req.user.id,
      },
    });

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    const [hydratedAgent] = await hydrateAgentRelations([agent]);

    await logEvent(req, {
      action: "agent_fetch",
      agentId: agent.id,
    });

    return res.json(
      formatAgentResponse(hydratedAgent, {
        lastActivity: await getLatestAgentActivity(agent.id),
      }),
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }

    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * @openapi
 * /agents/{id}/verify:
 *   post:
 *     tags: [Agents]
 *     summary: Verify agent and optionally link Hedera wallet details
 *     description: |
 *       Verifies the agent locally first, calculates its trust score, and writes
 *       a Hedera proof memo transaction when an operator keypair is configured.
 *
 *       Frontend can optionally send Hedera wallet details here instead of calling a separate wallet endpoint.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent UUID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hederaAccountId:
 *                 type: string
 *                 example: "0.0.1234567"
 *               hederaPublicKey:
 *                 type: string
 *                 example: "302a300506032b6570032100..."
 *               network:
 *                 type: string
 *                 example: "testnet"
 *               kmsKeyId:
 *                 type: string
 *                 example: "demo-kms-key"
 *     responses:
 *       200:
 *         description: Agent verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Agent verified successfully"
 *                 verificationStatus:
 *                   type: string
 *                   example: "verified"
 *                 hederaSyncStatus:
 *                   type: string
 *                   enum: [synced, simulated, failed, disabled]
 *                   example: "synced"
 *                 agent:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "ac0d21d5-bb02-4d52-8004-4725488cf007"
 *                     status:
 *                       type: string
 *                       example: "verified"
 *                 hedera:
 *                   nullable: true
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                       example: "0.0.123456@1710000000.000000001"
 *                     topicSequenceNumber:
 *                       type: integer
 *                       example: 371818202
 *                     proofHash:
 *                       type: string
 *                     trustScore:
 *                       type: integer
 *                       example: 75
 *                     isHealthy:
 *                       type: boolean
 *                       example: true
 *                     riskLevel:
 *                       type: string
 *                       example: "low"
 *                     verificationCount:
 *                       type: integer
 *                       example: 1
 *                     explorerUrl:
 *                       type: string
 *                       example: "https://hashscan.io/testnet/transaction/..."
 *                     error:
 *                       type: string
 *                       example: "Agent verification succeeded locally, but Hedera proof sync failed."
 *                     note:
 *                       type: string
 *                       example: "Agent verification succeeded locally, but Hedera proof sync failed."
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid wallet-link payload or verification precondition failure
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.post("/:id/verify", requireAuth, async (req, res) => {
  try {
    const agentId = requireUuid(req.params.id, "id");
    const agent = await Agent.findOne({
      where: {
        id: agentId,
        creator_id: req.user.id,
      },
    });

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    const {
      hederaAccountId,
      hederaPublicKey,
      walletAddress,
      network,
      kmsKeyId,
    } = req.body || {};

    if (hederaAccountId || walletAddress) {
      await linkWalletToAgent({
        agentId: agent.id,
        hederaAccountId: hederaAccountId || walletAddress,
        hederaPublicKey,
        network,
        kmsKeyId,
      });
    }

    agent.status = "verified";
    await agent.save();

    let hederaSyncStatus = "disabled";
    let hedera = null;

    try {
      const registry = await ensureAgentRegistered(agent);
      const proofResult = await runImmediateVerification(agent, registry);

      hederaSyncStatus = proofResult.simulated ? "simulated" : "synced";
      hedera = {
        transactionId: proofResult.transactionId,
        topicSequenceNumber: proofResult.topicSequenceNumber,
        proofHash: proofResult.proofHash,
        trustScore: proofResult.score,
        isHealthy: proofResult.isHealthy,
        riskLevel: proofResult.riskLevel,
        verificationCount: proofResult.verificationCount,
        explorerUrl: proofResult.explorerUrl,
        network: getHederaNetwork(),
        simulated: proofResult.simulated,
      };
    } catch (proofErr) {
      hederaSyncStatus = "failed";
      hedera = {
        error: proofErr.message,
        note: "Agent verification succeeded locally, but Hedera proof sync failed.",
      };
      await createAlert({
        userId: req.user.id,
        agentId: agent.id,
        sourceId: agent.id,
        sourceType: "agent",
        title: "Hedera verification proof failed",
        severity: "high",
        type: "hedera_sync_failure",
        message: proofErr.message,
      });
      console.error("[verify] Hedera proof error (non-fatal):", proofErr.message);
    }

    await AgentBehaviorLog.create({
      agent_id: agent.id,
      event_type: "verification",
      event_payload: {
        verified_at: new Date(),
        hedera_sync_status: hederaSyncStatus,
        hedera,
      },
      risk_score: 0.0,
    });

    await logEvent(req, {
      action: "agent_verify",
      agentId: agent.id,
      payload: {
        hederaSyncStatus,
      },
    });

    await createMonitoringAlert({
      userId: req.user.id,
      agentId: agent.id,
      sourceId: agent.id,
      sourceType: "agent",
      title: "Agent verified",
      severity: hederaSyncStatus === "failed" ? "high" : "low",
      type: "agent_verified",
      message:
        hederaSyncStatus === "synced"
          ? `${agent.agent_name} was verified and synced to Hedera.`
          : hederaSyncStatus === "simulated"
            ? `${agent.agent_name} was verified with a simulated Hedera proof.`
            : `${agent.agent_name} was verified locally, but Hedera sync needs attention.`,
      metadata: {
        hederaSyncStatus,
        hedera,
      },
    });

    return res.json({
      success: true,
      message: "Agent verified successfully",
      verificationStatus: "verified",
      hederaSyncStatus,
      agent: {
        id: agent.id,
        status: agent.status,
      },
      hedera,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }

    console.error("[verify] Fatal error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * @openapi
 * /agents/{id}/hedera-history:
 *   get:
 *     tags: [Agents]
 *     summary: Get Hedera proof history for an agent
 *     description: Returns normalized Hedera proof history for the authenticated user's agent.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent UUID
 *     responses:
 *       200:
 *         description: Hedera proof history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agentId:
 *                   type: string
 *                   example: "ac0d21d5-bb02-4d52-8004-4725488cf007"
 *                 proofCount:
 *                   type: integer
 *                   example: 2
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       transactionId:
 *                         type: string
 *                       topicSequenceNumber:
 *                         nullable: true
 *                         type: integer
 *                       type:
 *                         nullable: true
 *                         type: string
 *                         example: "AGENT_REGISTERED"
 *                       payload:
 *                         type: object
 *                         additionalProperties: true
 *                         example:
 *                           type: "AGENT_REGISTERED"
 *                           agentId: "ac0d21d5-bb02-4d52-8004-4725488cf007"
 *                           agentName: "Treasury Risk Monitor"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found or not yet registered on Hedera
 */
router.get("/:id/hedera-history", requireAuth, async (req, res) => {
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

    const registry = await AgentHederaRegistry.findOne({
      where: { agent_id: agent.id },
    });

    if (!registry) {
      return res.status(404).json({
        message:
          "Agent does not have Hedera proofs yet. Call POST /agents/:id/verify first.",
      });
    }

    const history = await getAgentHistory(agent.id);

    return res.json({
      agentId: agent.id,
      registrationTransactionId: registry.registration_transaction_id,
      registrationExplorerUrl: registry.registration_transaction_id
        ? getHederaExplorerUrl(registry.registration_transaction_id, "transaction")
        : null,
      proofCount: history.length,
      items: history.map((item) => ({
        id: item.id,
        transactionId: item.transaction_id,
        topicSequenceNumber: item.topic_sequence_number,
        type: item.proof_type,
        proofHash: item.proof_hash,
        payload: item.proof_payload || {},
        explorerUrl: item.transaction_id
          ? getHederaExplorerUrl(item.transaction_id, "transaction")
          : null,
        status: item.status,
        createdAt: item.created_at,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
