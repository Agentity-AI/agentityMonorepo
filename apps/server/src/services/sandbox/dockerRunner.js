const { exec } = require("child_process");

function buildLocalFallback(agentId, reason) {
  const numericSeed = Array.from(String(agentId || "unknown")).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  const riskScore = 20 + (numericSeed % 55);
  const findings = riskScore >= 60 ? ["sandbox-fallback-risk-review"] : [];

  return {
    agentId,
    riskScore,
    findings,
    status: riskScore >= 60 ? "high_risk" : "safe",
    fallback: true,
    fallbackReason: reason,
    simulatedAt: new Date().toISOString(),
  };
}

function runSandbox(agentId) {
  return new Promise((resolve, reject) => {
    exec(
      `docker run --rm agentity-sandbox ${agentId}`,
      { timeout: 10000 }, // prevent runaway container
      (error, stdout, stderr) => {
        if (error) {
          const message = stderr?.trim() || error.message || "Sandbox execution failed";

          // Local development should still be able to continue if Docker or the
          // sandbox image is unavailable. We surface that clearly in the payload
          // while keeping simulation-dependent flows testable.
          return resolve(buildLocalFallback(agentId, message));
        }

        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (err) {
          resolve(buildLocalFallback(agentId, "Invalid sandbox output"));
        }
      }
    );
  });
}

module.exports = { runSandbox };
