const fs = require("fs");
const path = require("path");
const {
  AccountId,
  PrivateKey,
  TokenId,
  TopicId,
} = require("@hashgraph/sdk");

const SUPPORTED_NETWORKS = new Set([
  "mainnet",
  "testnet",
  "previewnet",
  "localnet",
]);

let cachedOperatorKey = undefined;

function getHederaNetwork() {
  const network = process.env.HEDERA_NETWORK || process.env.HEDERA_CLUSTER || "mainnet";
  return SUPPORTED_NETWORKS.has(network) ? network : "mainnet";
}

function getHederaMirrorNodeUrl() {
  if (process.env.HEDERA_MIRROR_NODE_URL) {
    return process.env.HEDERA_MIRROR_NODE_URL;
  }

  const network = getHederaNetwork();

  if (network === "mainnet") {
    return "https://mainnet-public.mirrornode.hedera.com";
  }

  if (network === "previewnet") {
    return "https://previewnet.mirrornode.hedera.com";
  }

  if (network === "localnet") {
    return "http://127.0.0.1:5551";
  }

  return "https://testnet.mirrornode.hedera.com";
}

function getHederaExplorerUrl(value, type = "transaction") {
  if (!value) return null;

  const network = getHederaNetwork();
  if (network === "localnet") return null;

  return `https://hashscan.io/${network}/${type}/${value}`;
}

function resolvePrivateKeyPath() {
  const configuredPath =
    process.env.HEDERA_OPERATOR_KEY_PATH ||
    process.env.HEDERA_OPERATOR_PRIVATE_KEY_PATH;

  return configuredPath ? path.resolve(configuredPath) : null;
}

function readPrivateKeyPath() {
  const privateKeyPath = resolvePrivateKeyPath();
  if (!privateKeyPath) return null;

  try {
    return fs.readFileSync(privateKeyPath, "utf8");
  } catch (error) {
    throw new Error(
      `Failed to read Hedera operator private key file at "${privateKeyPath}": ${error.message}`,
    );
  }
}

function parsePrivateKey(rawKey) {
  if (!rawKey || typeof rawKey !== "string") return null;

  const value = rawKey.trim();
  if (!value) return null;

  try {
    return PrivateKey.fromString(value);
  } catch (error) {
    throw new Error(`Invalid Hedera private key format: ${error.message}`);
  }
}

function loadOperatorPrivateKey() {
  if (cachedOperatorKey !== undefined) {
    return cachedOperatorKey;
  }

  const keySource =
    process.env.HEDERA_OPERATOR_PRIVATE_KEY ||
    process.env.HEDERA_OPERATOR_KEY ||
    readPrivateKeyPath();

  if (!keySource) {
    cachedOperatorKey = null;
    return cachedOperatorKey;
  }

  cachedOperatorKey = parsePrivateKey(keySource);
  return cachedOperatorKey;
}

function getOperatorAccountId() {
  const accountId = process.env.HEDERA_OPERATOR_ACCOUNT_ID;
  if (!accountId) return null;

  try {
    return AccountId.fromString(accountId);
  } catch (error) {
    throw new Error(`Invalid HEDERA_OPERATOR_ACCOUNT_ID: ${error.message}`);
  }
}

function getOperatorAccountIdString() {
  const accountId = getOperatorAccountId();
  return accountId ? accountId.toString() : null;
}

function hasOperatorSigner() {
  return Boolean(getOperatorAccountId() && loadOperatorPrivateKey());
}

function getConsensusTopicId() {
  const value =
    process.env.HEDERA_CONSENSUS_TOPIC_ID ||
    process.env.HEDERA_TOPIC_ID ||
    process.env.HEDERA_REGISTRY_TOPIC_ID;

  if (!value) return null;

  try {
    return TopicId.fromString(value);
  } catch (error) {
    throw new Error(`Invalid HEDERA_CONSENSUS_TOPIC_ID: ${error.message}`);
  }
}

function getConsensusTopicIdString() {
  const topicId = getConsensusTopicId();
  return topicId ? topicId.toString() : null;
}

function getDefaultTokenId() {
  const value = process.env.HEDERA_DEFAULT_TOKEN_ID;
  if (!value) return null;

  try {
    return TokenId.fromString(value).toString();
  } catch (error) {
    throw new Error(`Invalid HEDERA_DEFAULT_TOKEN_ID: ${error.message}`);
  }
}

module.exports = {
  getConsensusTopicId,
  getConsensusTopicIdString,
  getDefaultTokenId,
  getHederaExplorerUrl,
  getHederaMirrorNodeUrl,
  getHederaNetwork,
  getOperatorAccountId,
  getOperatorAccountIdString,
  hasOperatorSigner,
  loadOperatorPrivateKey,
};
