const test = require("node:test");
const assert = require("node:assert/strict");

const ENV_KEYS = [
  "HEDERA_NETWORK",
  "HEDERA_CLUSTER",
  "HEDERA_MIRROR_NODE_URL",
  "HEDERA_OPERATOR_ACCOUNT_ID",
  "HEDERA_OPERATOR_PRIVATE_KEY",
  "HEDERA_OPERATOR_KEY",
  "HEDERA_OPERATOR_KEY_PATH",
  "HEDERA_OPERATOR_PRIVATE_KEY_PATH",
  "HEDERA_CONSENSUS_TOPIC_ID",
  "HEDERA_DEFAULT_TOKEN_ID",
  "HEDERA_TESTNET_MIRROR_NODE_URL",
  "HEDERA_TESTNET_OPERATOR_ACCOUNT_ID",
  "HEDERA_TESTNET_OPERATOR_PRIVATE_KEY",
  "HEDERA_TESTNET_OPERATOR_KEY",
  "HEDERA_TESTNET_OPERATOR_KEY_PATH",
  "HEDERA_TESTNET_OPERATOR_PRIVATE_KEY_PATH",
  "HEDERA_TESTNET_CONSENSUS_TOPIC_ID",
  "HEDERA_TESTNET_DEFAULT_TOKEN_ID",
  "HEDERA_MAINNET_MIRROR_NODE_URL",
  "HEDERA_MAINNET_OPERATOR_ACCOUNT_ID",
  "HEDERA_MAINNET_OPERATOR_PRIVATE_KEY",
  "HEDERA_MAINNET_OPERATOR_KEY",
  "HEDERA_MAINNET_OPERATOR_KEY_PATH",
  "HEDERA_MAINNET_OPERATOR_PRIVATE_KEY_PATH",
  "HEDERA_MAINNET_CONSENSUS_TOPIC_ID",
  "HEDERA_MAINNET_DEFAULT_TOKEN_ID",
];

function loadFreshClient(env = {}) {
  const original = {};

  for (const key of ENV_KEYS) {
    original[key] = process.env[key];
    if (Object.hasOwn(env, key)) {
      process.env[key] = env[key];
    } else {
      delete process.env[key];
    }
  }

  delete require.cache[require.resolve("../src/config/hedera")];
  delete require.cache[require.resolve("../src/services/hedera/client")];

  const client = require("../src/services/hedera/client");

  return {
    client,
    restore() {
      for (const key of ENV_KEYS) {
        if (original[key] == null) {
          delete process.env[key];
        } else {
          process.env[key] = original[key];
        }
      }
      delete require.cache[require.resolve("../src/config/hedera")];
      delete require.cache[require.resolve("../src/services/hedera/client")];
    },
  };
}

test("buildHederaRuntimeStatus reports invalid Hedera env without throwing", () => {
  const { client, restore } = loadFreshClient({
    HEDERA_OPERATOR_ACCOUNT_ID: "not-an-account",
    HEDERA_CONSENSUS_TOPIC_ID: "not-a-topic",
  });

  try {
    const status = client.buildHederaRuntimeStatus();

    assert.equal(status.status, "degraded");
    assert.equal(status.operatorAccountId, null);
    assert.equal(status.consensusTopicId, null);
    assert.equal(status.operatorCanSubmit, false);
    assert.ok(
      status.configErrors.some((message) =>
        message.includes("Invalid HEDERA_OPERATOR_ACCOUNT_ID"),
      ),
    );
    assert.ok(
      status.configErrors.some((message) =>
        message.includes("Invalid HEDERA_CONSENSUS_TOPIC_ID"),
      ),
    );
  } finally {
    restore();
  }
});

test("buildHederaRuntimeStatus does not mix profile operator values with generic keys", () => {
  const { client, restore } = loadFreshClient({
    HEDERA_NETWORK: "testnet",
    HEDERA_OPERATOR_PRIVATE_KEY: "this is a generic recovery phrase",
    HEDERA_TESTNET_OPERATOR_ACCOUNT_ID: "0.0.2001",
    HEDERA_TESTNET_CONSENSUS_TOPIC_ID: "0.0.2002",
  });

  try {
    const status = client.buildHederaRuntimeStatus();

    assert.equal(status.status, "ready");
    assert.equal(status.operatorAccountId, "0.0.2001");
    assert.equal(status.operatorCanSubmit, false);
    assert.deepEqual(status.configErrors, []);
  } finally {
    restore();
  }
});

test("buildHederaRuntimeStatus uses active network profile before generic fallback", () => {
  const { client, restore } = loadFreshClient({
    HEDERA_NETWORK: "testnet",
    HEDERA_OPERATOR_ACCOUNT_ID: "0.0.1001",
    HEDERA_CONSENSUS_TOPIC_ID: "0.0.1002",
    HEDERA_TESTNET_OPERATOR_ACCOUNT_ID: "0.0.2001",
    HEDERA_TESTNET_CONSENSUS_TOPIC_ID: "0.0.2002",
    HEDERA_TESTNET_MIRROR_NODE_URL: "https://custom-testnet.example",
    HEDERA_MAINNET_OPERATOR_ACCOUNT_ID: "0.0.3001",
    HEDERA_MAINNET_CONSENSUS_TOPIC_ID: "0.0.3002",
  });

  try {
    const status = client.buildHederaRuntimeStatus();

    assert.equal(status.status, "ready");
    assert.equal(status.network, "testnet");
    assert.equal(status.envPrefix, "HEDERA_TESTNET");
    assert.equal(status.operatorAccountId, "0.0.2001");
    assert.equal(status.consensusTopicId, "0.0.2002");
    assert.equal(status.mirrorNodeUrl, "https://custom-testnet.example");
  } finally {
    restore();
  }
});
