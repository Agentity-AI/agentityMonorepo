const crypto = require("crypto");
const { TopicMessageSubmitTransaction } = require("@hashgraph/sdk");

const logger = require("../../config/logger");
const AgentBehaviorLog = require("../../models/agentBehaviorLog");
const AgentReputation = require("../../models/agentReputation");
const AgentHederaProof = require("../../models/agentHederaProof");
const AgentHederaRegistry = require("../../models/agentHederaRegistry");
const {
  getConsensusTopicId,
  getConsensusTopicIdString,
  getHederaExplorerUrl,
  getHederaNetwork,
} = require("../../config/hedera");
const {
  getHederaClient,
  isHederaOperatorConfigured,
} = require("./client");

const HEALTHY_THRESHOLD = Number.parseInt(
  process.env.HEDERA_HEALTHY_THRESHOLD || "60",
  10,
);

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;

  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortObject(value[key]);
      return acc;
    }, {});
}

function stableJson(value) {
  return JSON.stringify(sortObject(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function buildProofPayload({ type, agent, extra = {} }) {
  const body = {
    type,
    agentId: agent.id,
    agentName: agent.agent_name,
    fingerprint: agent.fingerprint,
    publicKey: agent.public_key,
    platform: "Agentity",
    network: getHederaNetwork(),
    consensusTopicId: getConsensusTopicIdString(),
    timestamp: new Date().toISOString(),
    ...extra,
  };

  const canonical = stableJson(body);
  const hash = sha256(canonical);

  return {
    body,
    hash,
    memo: `AGENTITY:${type}:${agent.id}:${hash}`,
  };
}

async function submitConsensusProof({ memo, proof }) {
  const realProofsEnabled = process.env.HEDERA_ENABLE_REAL_PROOFS !== "false";
  const topicId = getConsensusTopicId();

  if (!realProofsEnabled || !topicId || !isHederaOperatorConfigured()) {
    return {
      transactionId: null,
      topicSequenceNumber: null,
      status: "simulated",
      simulated: true,
    };
  }

  const client = getHederaClient({ required: true });
  const message = stableJson({
    memo,
    proofHash: proof.hash,
    payload: proof.body,
  });

  const txResponse = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)
    .execute(client);
  const receipt = await txResponse.getReceipt(client);
  const transactionId = txResponse.transactionId.toString();

  const receiptStatus = receipt.status.toString().toLowerCase();

  return {
    transactionId,
    topicSequenceNumber: receipt.topicSequenceNumber
      ? String(receipt.topicSequenceNumber)
      : null,
    status: receiptStatus === "success" ? "confirmed" : receiptStatus,
    simulated: false,
  };
}

function riskLevel(score) {
  if (score >= 85) return "safe";
  if (score >= 70) return "low";
  if (score >= 50) return "medium";
  return "high";
}

async function persistAgentReputation(agentId, score, level) {
  const existing = await AgentReputation.findOne({
    where: { agent_id: agentId },
    order: [["updatedAt", "DESC"], ["createdAt", "DESC"]],
  });

  if (existing) {
    return existing.update({
      score,
      risk_level: level,
    });
  }

  return AgentReputation.create({
    agent_id: agentId,
    score,
    risk_level: level,
  });
}

async function calculateTrustScore(agentId, proofRows) {
  let score = 75;

  const verifications = proofRows.filter((row) =>
    ["VERIFIED", "REVERIFIED"].includes(row.proof_type),
  );
  const recentPasses = verifications.slice(-5).filter((row) => row.is_healthy)
    .length;
  score += recentPasses * 3;

  const flagCount = proofRows.filter((row) => row.proof_type === "AGENT_FLAGGED")
    .length;
  score -= flagCount * 15;

  const simLogs = await AgentBehaviorLog.findAll({
    where: { agent_id: agentId, event_type: "simulation" },
    order: [["createdAt", "DESC"]],
    limit: 10,
  });

  if (simLogs.length > 0) {
    const avgRisk =
      simLogs.reduce((sum, log) => {
        const raw = Number.parseFloat(log.risk_score) || 0;
        return sum + (raw <= 1 ? raw * 100 : raw);
      }, 0) / simLogs.length;

    score -= Math.floor(avgRisk * 0.3);
  }

  const reputation = await AgentReputation.findOne({ where: { agent_id: agentId } });
  if (reputation && Number(reputation.score) > 0) {
    score = Math.round(score * 0.7 + Number(reputation.score) * 0.3);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

async function createProofRow({ agentId, proof, submission, score, isHealthy, scoreDelta }) {
  return AgentHederaProof.create({
    agent_id: agentId,
    transaction_id: submission.transactionId,
    topic_sequence_number: submission.topicSequenceNumber,
    proof_type: proof.body.type,
    proof_hash: proof.hash,
    proof_payload: proof.body,
    memo: proof.memo,
    score,
    is_healthy: isHealthy,
    score_delta: scoreDelta,
    network: getHederaNetwork(),
    status: submission.status,
  });
}

async function ensureAgentRegistered(agent) {
  const existing = await AgentHederaRegistry.findOne({
    where: { agent_id: agent.id },
  });
  if (existing) return existing;

  const proof = buildProofPayload({
    type: "AGENT_REGISTERED",
    agent,
  });
  const submission = await submitConsensusProof({ memo: proof.memo, proof });

  const registry = await AgentHederaRegistry.create({
    agent_id: agent.id,
    registry_topic_id: getConsensusTopicIdString(),
    registration_transaction_id: submission.transactionId,
    registration_topic_sequence_number: submission.topicSequenceNumber,
    proof_hash: proof.hash,
    status: "registered",
    network: getHederaNetwork(),
    metadata: {
      proofMode: getConsensusTopicIdString() ? "hcs-topic" : "local-hash",
      simulated: submission.simulated,
      explorerUrl: submission.transactionId
        ? getHederaExplorerUrl(submission.transactionId, "transaction")
        : null,
    },
  });

  await createProofRow({
    agentId: agent.id,
    proof,
    submission,
    score: null,
    isHealthy: null,
    scoreDelta: null,
  });

  await agent.update({
    blockchain_tx_hash: submission.transactionId,
    blockchain_registered_at: new Date(),
    blockchain_sync_status: submission.simulated ? "pending" : "synced",
    blockchain_sync_error: null,
  });

  logger.info({
    message: `[hedera] Agent ${agent.id} registered proof ${submission.transactionId || "simulated"}`,
  });

  return registry;
}

async function runImmediateVerification(agent, registry) {
  const proofs = await AgentHederaProof.findAll({
    where: { agent_id: agent.id },
    order: [["created_at", "ASC"]],
  });
  const score = await calculateTrustScore(agent.id, proofs);
  const level = riskLevel(score);
  const isHealthy = score >= HEALTHY_THRESHOLD;
  const previousScore = Number(registry.current_score || 0);
  const scoreDelta = score - previousScore;
  const proof = buildProofPayload({
    type: isHealthy ? "VERIFIED" : "AGENT_FLAGGED",
    agent,
    extra: {
      score,
      riskLevel: level,
      healthyThreshold: HEALTHY_THRESHOLD,
      isHealthy,
    },
  });

  const submission = await submitConsensusProof({ memo: proof.memo, proof });
  const proofRow = await createProofRow({
    agentId: agent.id,
    proof,
    submission,
    score,
    isHealthy,
    scoreDelta,
  });

  await registry.update({
    current_score: score,
    current_risk_level: level,
    last_verified_at: new Date(),
    verification_count: (registry.verification_count || 0) + 1,
    status: isHealthy ? "verified" : "flagged",
    metadata: {
      ...(registry.metadata || {}),
      latestProofId: proofRow.id,
      latestTransactionId: submission.transactionId,
      latestExplorerUrl: submission.transactionId
        ? getHederaExplorerUrl(submission.transactionId, "transaction")
        : null,
      simulated: submission.simulated,
    },
  });

  await persistAgentReputation(agent.id, score, level);

  await agent.update({
    blockchain_tx_hash: submission.transactionId || agent.blockchain_tx_hash,
    blockchain_sync_status: submission.simulated ? "pending" : "synced",
    blockchain_sync_error: null,
  });

  return {
    transactionId: submission.transactionId,
    topicSequenceNumber: submission.topicSequenceNumber,
    proofHash: proof.hash,
    score,
    isHealthy,
    riskLevel: level,
    verificationCount: (registry.verification_count || 0) + 1,
    explorerUrl: submission.transactionId
      ? getHederaExplorerUrl(submission.transactionId, "transaction")
      : null,
    simulated: submission.simulated,
  };
}

async function createExecutionProof({ agent, task, executionResult, riskScore }) {
  const proof = buildProofPayload({
    type: "TASK_EXECUTED",
    agent,
    extra: {
      taskId: task.id,
      taskType: task.task_type,
      riskScore,
      executionHash: sha256(stableJson(executionResult || {})),
    },
  });
  const submission = await submitConsensusProof({ memo: proof.memo, proof });
  const proofRow = await createProofRow({
    agentId: agent.id,
    proof,
    submission,
    score: null,
    isHealthy: null,
    scoreDelta: null,
  });

  return {
    id: proofRow.id,
    transactionId: submission.transactionId,
    topicSequenceNumber: submission.topicSequenceNumber,
    proofHash: proof.hash,
    explorerUrl: submission.transactionId
      ? getHederaExplorerUrl(submission.transactionId, "transaction")
      : null,
    simulated: submission.simulated,
  };
}

async function getAgentHistory(agentId) {
  return AgentHederaProof.findAll({
    where: { agent_id: agentId },
    order: [["created_at", "ASC"]],
  });
}

async function findProofByTransactionId(transactionId) {
  return AgentHederaProof.findOne({
    where: { transaction_id: transactionId },
  });
}

module.exports = {
  createExecutionProof,
  ensureAgentRegistered,
  findProofByTransactionId,
  getAgentHistory,
  runImmediateVerification,
};
