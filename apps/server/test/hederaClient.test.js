const test = require("node:test");
const assert = require("node:assert/strict");

const ENV_KEYS = [
  "HEDERA_OPERATOR_ACCOUNT_ID",
  "HEDERA_OPERATOR_PRIVATE_KEY",
  "HEDERA_OPERATOR_KEY",
  "HEDERA_OPERATOR_KEY_PATH",
  "HEDERA_CONSENSUS_TOPIC_ID",
  "HEDERA_DEFAULT_TOKEN_ID",
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
