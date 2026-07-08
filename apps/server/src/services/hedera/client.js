const { Client } = require("@hashgraph/sdk");
const {
  getConsensusTopicIdString,
  getDefaultTokenId,
  getHederaExplorerUrl,
  getHederaMirrorNodeUrl,
  getHederaNetwork,
  getNetworkEnvPrefix,
  getOperatorAccountId,
  getOperatorAccountIdString,
  hasOperatorSigner,
  loadOperatorPrivateKey,
} = require("../../config/hedera");

let cachedClient = null;

function createClientForNetwork(network) {
  if (network === "mainnet") return Client.forMainnet();
  if (network === "previewnet") return Client.forPreviewnet();
  return Client.forTestnet();
}

function getHederaClient({ required = false } = {}) {
  if (!cachedClient) {
    const network = getHederaNetwork();
    const client = createClientForNetwork(network);
    const operatorAccountId = getOperatorAccountId();
    const operatorPrivateKey = loadOperatorPrivateKey();

    if (operatorAccountId && operatorPrivateKey) {
      client.setOperator(operatorAccountId, operatorPrivateKey);
    }

    cachedClient = client;
  }

  if (required && !isHederaOperatorConfigured()) {
    const envPrefix = getNetworkEnvPrefix();
    throw new Error(
      `Missing Trust Runtime operator credentials. Set ${envPrefix}_OPERATOR_ACCOUNT_ID and ${envPrefix}_OPERATOR_PRIVATE_KEY, or use the generic HEDERA_OPERATOR_ACCOUNT_ID and HEDERA_OPERATOR_PRIVATE_KEY fallback.`,
    );
  }

  return cachedClient;
}

function getHederaOperatorCredentials({ required = false } = {}) {
  const accountId = getOperatorAccountId();
  const privateKey = loadOperatorPrivateKey();

  if (required && (!accountId || !privateKey)) {
    const envPrefix = getNetworkEnvPrefix();
    throw new Error(
      `Missing Trust Runtime operator credentials. Set ${envPrefix}_OPERATOR_ACCOUNT_ID and ${envPrefix}_OPERATOR_PRIVATE_KEY, or use the generic HEDERA_OPERATOR_ACCOUNT_ID and HEDERA_OPERATOR_PRIVATE_KEY fallback.`,
    );
  }

  return {
    accountId,
    privateKey,
  };
}

function isHederaOperatorConfigured() {
  return hasOperatorSigner();
}

function readHederaConfig(label, reader, fallback, errors) {
  try {
    return reader();
  } catch (error) {
    errors.push(`${label}: ${error.message}`);
    return fallback;
  }
}

function buildHederaRuntimeStatus() {
  const configErrors = [];
  const network = readHederaConfig(
    "HEDERA_NETWORK",
    getHederaNetwork,
    "mainnet",
    configErrors,
  );
  const mirrorNodeUrl = readHederaConfig(
    "HEDERA_MIRROR_NODE_URL",
    getHederaMirrorNodeUrl,
    null,
    configErrors,
  );
  const operatorAccountId = readHederaConfig(
    "HEDERA_OPERATOR_ACCOUNT_ID",
    getOperatorAccountIdString,
    null,
    configErrors,
  );
  const operatorCanSubmit = readHederaConfig(
    "HEDERA_OPERATOR_PRIVATE_KEY",
    isHederaOperatorConfigured,
    false,
    configErrors,
  );
  const consensusTopicId = readHederaConfig(
    "HEDERA_CONSENSUS_TOPIC_ID",
    getConsensusTopicIdString,
    null,
    configErrors,
  );
  const defaultTokenId = readHederaConfig(
    "HEDERA_DEFAULT_TOKEN_ID",
    getDefaultTokenId,
    null,
    configErrors,
  );

  return {
    status: configErrors.length > 0 ? "degraded" : "ready",
    network,
    envPrefix: getNetworkEnvPrefix(),
    mirrorNodeUrl,
    operatorAccountId,
    operatorConfigured: operatorCanSubmit,
    operatorCanSubmit,
    consensusTopicId,
    defaultTokenId,
    realPaymentsEnabled: process.env.HEDERA_ENABLE_REAL_TRANSFERS === "true",
    realProofsEnabled: process.env.HEDERA_ENABLE_REAL_PROOFS !== "false",
    proofMode: consensusTopicId ? "hcs-topic" : "local-hash",
    explorerBaseUrl:
      network === "localnet" ? null : `https://hashscan.io/${network}`,
    configErrors,
  };
}

module.exports = {
  buildHederaRuntimeStatus,
  getHederaClient,
  getHederaExplorerUrl,
  getHederaOperatorCredentials,
  isHederaOperatorConfigured,
};
