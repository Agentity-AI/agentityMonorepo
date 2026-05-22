const {
  AccountId,
  Hbar,
  TokenId,
  TransferTransaction,
} = require("@hashgraph/sdk");

const PaymentRecord = require("../../models/paymentRecord");
const AgentWallet = require("../../models/agentWallet");
const {
  getHederaClient,
  getHederaExplorerUrl,
  getHederaOperatorCredentials,
} = require("./client");
const { getDefaultTokenId, getHederaNetwork } = require("../../config/hedera");

const DEFAULT_HBAR_PRICING = {
  simulation: "0.10",
  audit: "0.20",
  execution: "0.50",
  coordination: "0.15",
};

const DEFAULT_HTS_PRICING = {
  simulation: "1.00",
  audit: "2.50",
  execution: "5.00",
  coordination: "1.50",
};

function normalizeCurrency(currency) {
  return String(currency || "HBAR").trim().toUpperCase();
}

function getEnvPrice(prefix, taskType) {
  const key = `${prefix}_${String(taskType || "execution").toUpperCase()}`
    .replace(/[^A-Z0-9_]/g, "_");

  return process.env[key] || null;
}

function isHbarCurrency(currency) {
  return normalizeCurrency(currency) === "HBAR";
}

function computeQuoteAmount(taskType, currency = "HBAR") {
  const normalizedCurrency = normalizeCurrency(currency);
  const envPrefix = isHbarCurrency(normalizedCurrency)
    ? "HEDERA_PRICE_HBAR"
    : "HEDERA_PRICE_HTS";
  const defaultTable = isHbarCurrency(normalizedCurrency)
    ? DEFAULT_HBAR_PRICING
    : DEFAULT_HTS_PRICING;

  return (
    getEnvPrice(envPrefix, taskType) ||
    defaultTable[taskType] ||
    defaultTable.execution
  );
}

function decimalToAtomic(value, decimals) {
  const normalized = String(value).trim();
  const [wholePart, rawFraction = ""] = normalized.split(".");
  const whole = BigInt(wholePart || "0");
  const fraction = rawFraction.padEnd(decimals, "0").slice(0, decimals);
  const fractionValue = BigInt(fraction || "0");

  return whole * 10n ** BigInt(decimals) + fractionValue;
}

function resolveTokenDecimals({ currency, tokenDecimals }) {
  if (isHbarCurrency(currency)) return 8;
  return Number.isInteger(tokenDecimals) ? tokenDecimals : 6;
}

function resolveTokenId({ currency, tokenId }) {
  if (isHbarCurrency(currency)) return null;
  return tokenId || getDefaultTokenId();
}

async function createPaymentQuote({
  fromUserId,
  toAgentId,
  taskExecutionId = null,
  taskType,
  currency = "HBAR",
  tokenId = null,
  tokenDecimals = null,
  metadata = null,
}) {
  const normalizedCurrency = normalizeCurrency(currency);
  const resolvedTokenId = resolveTokenId({
    currency: normalizedCurrency,
    tokenId,
  });
  const decimals = resolveTokenDecimals({
    currency: normalizedCurrency,
    tokenDecimals,
  });
  const amount = computeQuoteAmount(taskType, normalizedCurrency);
  const amountAtomic = decimalToAtomic(amount, decimals);

  const payment = await PaymentRecord.create({
    from_user_id: fromUserId,
    to_agent_id: toAgentId,
    task_execution_id: taskExecutionId,
    amount,
    amount_atomic: amountAtomic.toString(),
    currency: normalizedCurrency,
    token_id: resolvedTokenId,
    token_decimals: decimals,
    status: "quoted",
    metadata: {
      taskType,
      network: getHederaNetwork(),
      ...metadata,
    },
  });

  return payment;
}

async function executeHbarTransfer({ client, operatorAccountId, wallet, amountAtomic }) {
  const destination = AccountId.fromString(wallet.hedera_account_id);
  const tinybars = Number(amountAtomic);

  const response = await new TransferTransaction()
    .addHbarTransfer(operatorAccountId, Hbar.fromTinybars(-tinybars))
    .addHbarTransfer(destination, Hbar.fromTinybars(tinybars))
    .execute(client);

  await response.getReceipt(client);
  return response.transactionId.toString();
}

async function executeTokenTransfer({
  client,
  operatorAccountId,
  wallet,
  amountAtomic,
  tokenId,
}) {
  if (!tokenId) {
    throw new Error("tokenId is required for HTS token payments");
  }

  const destination = AccountId.fromString(wallet.hedera_account_id);
  const token = TokenId.fromString(tokenId);
  const units = Number(amountAtomic);

  const response = await new TransferTransaction()
    .addTokenTransfer(token, operatorAccountId, -units)
    .addTokenTransfer(token, destination, units)
    .execute(client);

  await response.getReceipt(client);
  return response.transactionId.toString();
}

async function executeHederaPayment(paymentRecord) {
  const wallet = await AgentWallet.findOne({
    where: { agent_id: paymentRecord.to_agent_id, status: "linked" },
  });

  if (!wallet) {
    throw new Error("Agent Hedera account is not linked");
  }

  const { accountId: operatorAccountId, privateKey } =
    getHederaOperatorCredentials();
  const realTransfersEnabled = process.env.HEDERA_ENABLE_REAL_TRANSFERS === "true";

  if (!operatorAccountId || !privateKey || !realTransfersEnabled) {
    const updated = await paymentRecord.update({
      status: "paid",
      payment_reference: "simulated-hedera-payment",
      metadata: {
        ...(paymentRecord.metadata || {}),
        simulated: true,
        intendedRecipient: wallet.hedera_account_id,
        operatorConfigured: Boolean(operatorAccountId && privateKey),
      },
    });

    return {
      payment: updated,
      transactionId: null,
      explorerUrl: null,
      simulated: true,
    };
  }

  await paymentRecord.update({ status: "pending" });

  const client = getHederaClient({ required: true });
  const currency = normalizeCurrency(paymentRecord.currency);
  const transactionId = isHbarCurrency(currency)
    ? await executeHbarTransfer({
        client,
        operatorAccountId,
        wallet,
        amountAtomic: paymentRecord.amount_atomic,
      })
    : await executeTokenTransfer({
        client,
        operatorAccountId,
        wallet,
        amountAtomic: paymentRecord.amount_atomic,
        tokenId: paymentRecord.token_id,
      });

  const explorerUrl = getHederaExplorerUrl(transactionId, "transaction");
  const updated = await paymentRecord.update({
    status: "paid",
    hedera_transaction_id: transactionId,
    payment_reference: explorerUrl,
    metadata: {
      ...(paymentRecord.metadata || {}),
      simulated: false,
      recipient: wallet.hedera_account_id,
    },
  });

  return {
    payment: updated,
    transactionId,
    explorerUrl,
    simulated: false,
  };
}

async function listPaymentsForUser(userId) {
  return PaymentRecord.findAll({
    where: { from_user_id: userId },
    order: [["created_at", "DESC"]],
    limit: 100,
  });
}

module.exports = {
  computeQuoteAmount,
  createPaymentQuote,
  decimalToAtomic,
  executeHederaPayment,
  listPaymentsForUser,
};
