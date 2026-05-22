function scoreFromFindings(findings) {
  let score = 100;

  for (const finding of findings) {
    if (finding.severity === "high") score -= 30;
    if (finding.severity === "medium") score -= 15;
    if (finding.severity === "low") score -= 7;
  }

  return Math.max(0, score);
}

function riskLevelFromScore(score) {
  if (score >= 90) return "safe";
  if (score >= 75) return "low";
  if (score >= 50) return "medium";
  return "high";
}

function analyzeSourceCode(sourceCode = "", contractName = "UnknownContract") {
  const findings = [];
  const code = String(sourceCode || "");

  if (!code.trim()) {
    findings.push({
      title: "Missing source code",
      severity: "high",
      description: "No Solidity source code was provided for analysis.",
    });
  }

  if (/tx\.origin/.test(code)) {
    findings.push({
      title: "Use of tx.origin",
      severity: "high",
      description: "Using tx.origin for authorization is unsafe.",
    });
  }

  if (/delegatecall/.test(code)) {
    findings.push({
      title: "Use of delegatecall",
      severity: "high",
      description:
        "delegatecall can introduce severe execution and upgradeability risks.",
    });
  }

  if (/call\{.*value:.*\}/s.test(code) && !/nonReentrant/.test(code)) {
    findings.push({
      title: "Possible reentrancy surface",
      severity: "high",
      description:
        "External value transfer detected without an obvious reentrancy guard.",
    });
  }

  if (/block\.timestamp/.test(code)) {
    findings.push({
      title: "Timestamp dependence",
      severity: "medium",
      description:
        "block.timestamp can be manipulated within validator tolerance.",
    });
  }

  if (/pragma solidity \^0\.8\.0;|pragma solidity \^0\.8\.[0-5];/.test(code)) {
    findings.push({
      title: "Broad compiler range",
      severity: "low",
      description:
        "Consider pinning compiler version more tightly for deterministic builds.",
    });
  }

  if (!/SPDX-License-Identifier/i.test(code)) {
    findings.push({
      title: "Missing SPDX identifier",
      severity: "low",
      description: "Source file should include an SPDX license identifier.",
    });
  }

  if (!/emit\s+/.test(code)) {
    findings.push({
      title: "Limited event instrumentation",
      severity: "low",
      description:
        "No event emissions detected; monitoring and auditability may be reduced.",
    });
  }

  const consensusScore = scoreFromFindings(findings);
  const riskLevel = riskLevelFromScore(consensusScore);

  const summary =
    findings.length === 0
      ? `${contractName} appears safe based on basic static heuristics.`
      : `${contractName} completed audit with ${findings.length} finding(s). Overall risk is ${riskLevel}.`;

  return {
    riskLevel,
    consensusScore,
    findings,
    summary,
    resultPayload: {
      contractName,
      findingCount: findings.length,
      completedAt: new Date().toISOString(),
    },
  };
}

module.exports = { analyzeSourceCode };
