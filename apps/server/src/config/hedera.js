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

const OPERATOR_ENV_NAMES = [
  "OPERATOR_ACCOUNT_ID",
  "OPERATOR_PRIVATE_KEY",
  "OPERATOR_KEY",
  "OPERATOR_KEY_PATH",
  "OPERATOR_PRIVATE_KEY_PATH",
];
const TOPIC_ENV_NAMES = [
  "CONSENSUS_TOPIC_ID",
  "TOPIC_ID",
  "REGISTRY_TOPIC_ID",
];
const TOKEN_ENV_NAMES = ["DEFAULT_TOKEN_ID"];
const MIRROR_ENV_NAMES = ["MIRROR_NODE_URL"];

let cachedOperatorKey = undefined;

function getHederaNetwork() {
  const network = String(
    process.env.HEDERA_NETWORK || process.env.HEDERA_CLUSTER || "mainnet",
  )
    .trim()
    .toLowerCase();

  return SUPPORTED_NETWORKS.has(network) ? network : "mainnet";
}

function getNetworkEnvPrefix() {
  return `HEDERA_${getHederaNetwork().toUpperCase()}`;
}

function hasNetworkSpecificEnv(names) {
  const normalizedNames = Array.isArray(names) ? names : [names];
  return normalizedNames.some((name) => {
    const value = process.env[`${getNetworkEnvPrefix()}_${name}`];
    return value != null && String(value).trim() !== "";
  });
}

function resolveHederaEnv(names, { allowGenericFallback = true } = {}) {
  const normalizedNames = Array.isArray(names) ? names : [names];
  const prefixedNames = normalizedNames.map(
    (name) => `${getNetworkEnvPrefix()}_${name}`,
  );
  const genericNames = normalizedNames.map((name) => `HEDERA_${name}`);

  const candidateNames = allowGenericFallback
    ? [...prefixedNames, ...genericNames]
    : prefixedNames;

  for (const key of candidateNames) {
    const value = process.env[key];
    if (value != null && String(value).trim() !== "") {
      return { key, value };
    }
  }

  return { key: genericNames[0], value: null };
}

function getHederaMirrorNodeUrl() {
  const configured = resolveHederaEnv("MIRROR_NODE_URL", {
    allowGenericFallback: !hasNetworkSpecificEnv(MIRROR_ENV_NAMES),
  });
  if (configured.value) {
    return configured.value;
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
  const configuredPath = resolveHederaEnv(
    ["OPERATOR_KEY_PATH", "OPERATOR_PRIVATE_KEY_PATH"],
    {
      allowGenericFallback: !hasNetworkSpecificEnv(OPERATOR_ENV_NAMES),
    },
  );

  return configuredPath.value ? path.resolve(configuredPath.value) : null;
}

function readPrivateKeyPath() {
  const privateKeyPath = resolvePrivateKeyPath();
  if (!privateKeyPath) return null;

  try {
    return fs.readFileSync(privateKeyPath, "utf8");
  } catch (error) {
    throw new Error(
      `Failed to read Trust Runtime operator private key file at "${privateKeyPath}": ${error.message}`,
    );
  }
}

function parsePrivateKey(rawKey) {
  if (!rawKey || typeof rawKey !== "string") return null;

  const value = rawKey.trim();
  if (!value) return null;

  if (/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(
      "Invalid Trust Runtime private key format: value looks like an EVM address. Use the account private key, not the public/EVM address.",
    );
  }

  if (value.split(/\s+/).length > 1) {
    throw new Error(
      "Invalid Trust Runtime private key format: value looks like a recovery phrase or spaced export. Use the raw private key only.",
    );
  }

  try {
    return PrivateKey.fromString(value);
  } catch (error) {
    throw new Error(`Invalid Trust Runtime private key format: ${error.message}`);
  }
}

function loadOperatorPrivateKey() {
  if (cachedOperatorKey !== undefined) {
    return cachedOperatorKey;
  }

  const rawKeySource = resolveHederaEnv(
    ["OPERATOR_PRIVATE_KEY", "OPERATOR_KEY"],
    {
      allowGenericFallback: !hasNetworkSpecificEnv(OPERATOR_ENV_NAMES),
    },
  );
  const keySource = rawKeySource.value || readPrivateKeyPath();

  if (!keySource) {
    cachedOperatorKey = null;
    return cachedOperatorKey;
  }

  cachedOperatorKey = parsePrivateKey(keySource);
  return cachedOperatorKey;
}

function getOperatorAccountId() {
  const account = resolveHederaEnv("OPERATOR_ACCOUNT_ID", {
    allowGenericFallback: !hasNetworkSpecificEnv(OPERATOR_ENV_NAMES),
  });
  const accountId = account.value;
  if (!accountId) return null;

  try {
    return AccountId.fromString(accountId);
  } catch (error) {
    throw new Error(`Invalid ${account.key}: ${error.message}`);
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
  const topic = resolveHederaEnv(
    ["CONSENSUS_TOPIC_ID", "TOPIC_ID", "REGISTRY_TOPIC_ID"],
    {
      allowGenericFallback: !hasNetworkSpecificEnv(TOPIC_ENV_NAMES),
    },
  );
  const value = topic.value;

  if (!value) return null;

  try {
    return TopicId.fromString(value);
  } catch (error) {
    throw new Error(`Invalid ${topic.key}: ${error.message}`);
  }
}

function getConsensusTopicIdString() {
  const topicId = getConsensusTopicId();
  return topicId ? topicId.toString() : null;
}

function getDefaultTokenId() {
  const token = resolveHederaEnv("DEFAULT_TOKEN_ID", {
    allowGenericFallback: !hasNetworkSpecificEnv(TOKEN_ENV_NAMES),
  });
  const value = token.value;
  if (!value) return null;

  try {
    return TokenId.fromString(value).toString();
  } catch (error) {
    throw new Error(`Invalid ${token.key}: ${error.message}`);
  }
}

module.exports = {
  getConsensusTopicId,
  getConsensusTopicIdString,
  getDefaultTokenId,
  getNetworkEnvPrefix,
  getHederaExplorerUrl,
  getHederaMirrorNodeUrl,
  getHederaNetwork,
  getOperatorAccountId,
  getOperatorAccountIdString,
  hasOperatorSigner,
  loadOperatorPrivateKey,
};
