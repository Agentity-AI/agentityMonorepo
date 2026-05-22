const agentId = process.argv[2] || "unknown";

function simulateBehavior() {
  const riskScore = Math.random(); // simulate risk scoring
  return {
    agentId,
    riskScore,
    status: riskScore > 0.7 ? "high_risk" : "safe",
  };
}

const result = simulateBehavior();
console.log(JSON.stringify(result));