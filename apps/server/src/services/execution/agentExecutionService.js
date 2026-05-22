const crypto = require("crypto");

function hashPayload(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value || {}))
    .digest("hex");
}

async function executeAgentWorkflow(agent, simulationResult = {}) {
  const riskScore = Number(
    simulationResult?.riskScore ?? simulationResult?.risk_score ?? 0,
  );
  const approved = riskScore < 70;
  const executionHash = hashPayload({
    agentId: agent.id,
    fingerprint: agent.fingerprint,
    simulationResult,
    approved,
  });

  return {
    status: approved ? "executed" : "requires_review",
    approved,
    agentId: agent.id,
    fingerprint: agent.fingerprint,
    executionHash,
    trustLayer: "hedera",
    policy: {
      maxAutomatedRiskScore: 69,
      riskScore,
      decision: approved ? "allow" : "manual_review",
    },
    executedAt: new Date().toISOString(),
  };
}

module.exports = {
  executeAgentWorkflow,
};
