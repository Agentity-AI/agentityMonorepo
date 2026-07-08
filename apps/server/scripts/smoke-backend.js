require("dotenv").config();

const {
  getConsensusTopicIdString,
  getHederaNetwork,
  getNetworkEnvPrefix,
  hasOperatorSigner,
} = require("../src/config/hedera");

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:5000";
const REAL_PROOFS_ENABLED = process.env.HEDERA_ENABLE_REAL_PROOFS !== "false";
const REAL_TRANSFERS_ENABLED = process.env.HEDERA_ENABLE_REAL_TRANSFERS === "true";
const SMOKE_ACCOUNT_CONFIGURED = Boolean(process.env.SMOKE_HEDERA_ACCOUNT_ID);

function safelyReadConfig(reader, fallback) {
  try {
    return reader();
  } catch {
    return fallback;
  }
}

const HEDERA_NETWORK = safelyReadConfig(getHederaNetwork, "mainnet");
const HEDERA_ENV_PREFIX = safelyReadConfig(getNetworkEnvPrefix, "HEDERA_MAINNET");
const HEDERA_OPERATOR_CONFIGURED = safelyReadConfig(hasOperatorSigner, false);
const HEDERA_TOPIC_CONFIGURED = safelyReadConfig(
  () => Boolean(getConsensusTopicIdString()),
  false,
);

function createRunner() {
  let authToken = null;

  async function request(method, path, body, options = {}) {
    const headers = {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    };

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let payload = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }

    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  }

  return {
    async step(label, method, path, body, options) {
      process.stdout.write(`\n[SMOKE] ${label}\n`);
      const result = await request(method, path, body, options);

      if (!result.ok) {
        throw new Error(
          `${label} failed (${result.status}): ${JSON.stringify(result.payload)}`,
        );
      }

      console.log(`[OK] ${method} ${path} -> ${result.status}`);
      return result.payload;
    },
    setAuthToken(token) {
      authToken = token;
    },
  };
}

function makeAuditSource() {
  return `pragma solidity ^0.8.0;

contract SmokeVault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        require(tx.origin == msg.sender, "bad auth");
        (bool ok,) = msg.sender.call{value: balances[msg.sender]}("");
        require(ok, "transfer failed");
        balances[msg.sender] = 0;
    }
}`;
}

function makeSmokeHederaAccount(nonce) {
  const suffix = String(nonce).slice(-6);
  return `0.0.${Number(suffix) + 100000}`;
}

async function main() {
  const runner = createRunner();
  const nonce = Date.now();
  const email = process.env.SMOKE_EMAIL || `smoke.${nonce}@example.com`;
  const password =
    process.env.SMOKE_PASSWORD || `SmokeTest!${String(nonce).slice(-6)}`;
  const name = process.env.SMOKE_NAME || `Smoke Tester ${String(nonce).slice(-4)}`;
  const hederaAccountId =
    process.env.SMOKE_HEDERA_ACCOUNT_ID || makeSmokeHederaAccount(nonce);
  const hederaPublicKey =
    process.env.SMOKE_HEDERA_PUBLIC_KEY || process.env.SMOKE_HEDERA_ACCOUNT_ID || hederaAccountId;
  const walletDetails = {
    hederaAccountId,
    hederaPublicKey,
    kmsKeyId: process.env.SMOKE_KMS_KEY_ID || process.env.AWS_KMS_KEY_ID || null,
  };

  console.log("[SMOKE] Backend smoke test starting");
  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        hederaNetwork: HEDERA_NETWORK,
        hederaEnvPrefix: HEDERA_ENV_PREFIX,
        realProofsEnabled: REAL_PROOFS_ENABLED,
        realTransfersEnabled: REAL_TRANSFERS_ENABLED,
        hederaOperatorConfigured: HEDERA_OPERATOR_CONFIGURED,
        hederaTopicConfigured: HEDERA_TOPIC_CONFIGURED,
        smokeAccountConfigured: SMOKE_ACCOUNT_CONFIGURED,
        kmsConfigured: Boolean(process.env.AWS_REGION && process.env.AWS_KMS_KEY_ID),
      },
      null,
      2,
    ),
  );

  const health = await runner.step("Health check", "GET", "/health");
  const system = await runner.step("System status", "GET", "/system/status");
  const hederaStatus = await runner.step("Hedera runtime status", "GET", "/hedera/status");

  if (hederaStatus.configErrors?.length) {
    throw new Error(
      `Hedera runtime config is degraded: ${hederaStatus.configErrors.join("; ")}`,
    );
  }

  if (health.status !== "healthy") {
    throw new Error("Health endpoint did not return healthy status");
  }

  if (system.database !== "connected") {
    throw new Error("System status did not report a connected database");
  }

  let authPayload;

  if (process.env.SMOKE_EMAIL && process.env.SMOKE_PASSWORD) {
    try {
      authPayload = await runner.step("Login smoke user", "POST", "/auth/login", {
        email,
        password,
      });
    } catch {
      authPayload = await runner.step("Register smoke user", "POST", "/auth/register", {
        email,
        password,
        name,
      });
    }
  } else {
    authPayload = await runner.step("Register auth user", "POST", "/auth/register", {
      email,
      password,
      name,
    });
  }

  runner.setAuthToken(authPayload.jwt);

  await runner.step("Fetch dashboard overview", "GET", "/dashboard/overview");

  const agent = await runner.step("Register agent", "POST", "/agents/register", {
    agentName: `Smoke Agent ${String(nonce).slice(-4)}`,
    publicKey: hederaAccountId,
    description: "Automated backend smoke test agent",
    agentType: "workflow-test-agent",
    metadata: {
      network: HEDERA_NETWORK,
      trustLayer: "hedera",
    },
  });

  await runner.step("Link Hedera account", "POST", "/wallets/link", {
    agentId: agent.id,
    ...walletDetails,
  });

  const verification = await runner.step(
    "Verify agent",
    "POST",
    `/agents/${agent.id}/verify`,
    walletDetails,
  );

  if (verification.hederaSyncStatus === "failed") {
    throw new Error(
      `Trust proof sync failed during verification: ${
        verification.hedera?.error || "unknown error"
      }`,
    );
  }

  await runner.step("Fetch Hedera proof history", "GET", `/agents/${agent.id}/hedera-history`);
  await runner.step("List my agents", "GET", "/agents/my");
  await runner.step("Fetch workflow summary", "GET", "/workflow/summary");

  const audit = await runner.step("Create smart contract audit", "POST", "/audits", {
    contractName: "SmokeVault",
    sourceType: "paste",
    sourceCode: makeAuditSource(),
  });

  await runner.step("Fetch audit history", "GET", "/audits/history");
  await runner.step("Fetch audit details", "GET", `/audits/${audit.id}`);
  await runner.step("Fetch alert list", "GET", "/alerts");
  await runner.step("Fetch alert summary", "GET", "/alerts/summary");

  const task = await runner.step("Create task request", "POST", "/tasks/request", {
    agentId: agent.id,
    taskType: "execution",
    inputPayload: {
      target: "settle-agent-workflow",
      amount: 1,
      network: HEDERA_NETWORK,
      settlementAsset: "HBAR",
    },
  });

  await runner.step("Simulate task", "POST", `/tasks/${task.id}/simulate`);
  const payment = await runner.step("Pay task", "POST", `/tasks/${task.id}/pay`, {
    currency: "HBAR",
  });
  const execution = await runner.step("Execute task", "POST", `/tasks/${task.id}/execute`);

  await runner.step("Fetch task history", "GET", "/tasks/history");
  await runner.step("Fetch payment history", "GET", "/payments/history");

  const policy = await runner.step("Create transaction policy", "POST", "/transactions/policies", {
    name: `Smoke Policy ${String(nonce).slice(-4)}`,
    description: "Generated during backend smoke testing",
    rules: {
      maxAmount: 10,
      allowedTypes: ["payment", "execution"],
    },
    status: "active",
  });

  await runner.step("Fetch transaction policies", "GET", "/transactions/policies");
  const transactions = await runner.step("Fetch transaction history", "GET", "/transactions/history");

  if (transactions.items && transactions.items.length > 0) {
    await runner.step(
      "Fetch transaction details",
      "GET",
      `/transactions/${transactions.items[0].id}`,
    );
  }

  console.log("\n[SMOKE] Completed successfully");
  console.log(
    JSON.stringify(
      {
        createdUser: email,
        createdAgentId: agent.id,
        createdAuditId: audit.id,
        createdTaskId: task.id,
        createdPolicyId: policy.id,
        hederaSyncStatus: verification.hederaSyncStatus,
        hederaPaymentSimulated: payment?.simulated ?? null,
        hederaProofSimulated: execution?.hederaProof?.simulated ?? null,
        kmsSignatureSimulated: execution?.kms?.simulated ?? null,
        kmsAuditId: execution?.kms?.auditId ?? null,
      },
      null,
      2,
    ),
  );

  if (!REAL_PROOFS_ENABLED) {
    console.log(
      `\n[SMOKE] ${HEDERA_NETWORK} simulated proof mode is active: app workflows are tested against ${HEDERA_NETWORK} configuration, while Trust Runtime proofs remain local/simulated.`,
    );
  } else if (!HEDERA_OPERATOR_CONFIGURED || !HEDERA_TOPIC_CONFIGURED) {
    console.log(
      `\n[SMOKE] Live Hedera proofs require ${HEDERA_ENV_PREFIX}_OPERATOR_ACCOUNT_ID, ${HEDERA_ENV_PREFIX}_OPERATOR_PRIVATE_KEY, and ${HEDERA_ENV_PREFIX}_CONSENSUS_TOPIC_ID. Real payments additionally require HEDERA_ENABLE_REAL_TRANSFERS=true and a funded operator account.`,
    );
  }
}

main().catch((error) => {
  console.error("\n[SMOKE] Failed");
  console.error(error.message);
  process.exit(1);
});
