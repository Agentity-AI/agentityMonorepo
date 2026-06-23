require("dotenv").config();

const { TopicCreateTransaction } = require("@hashgraph/sdk");

const {
  getHederaClient,
  getHederaOperatorCredentials,
} = require("../src/services/hedera/client");
const { getHederaNetwork } = require("../src/config/hedera");

function describePrivateKeyShape() {
  const raw =
    process.env.HEDERA_OPERATOR_PRIVATE_KEY ||
    process.env.HEDERA_OPERATOR_KEY ||
    "";
  const value = String(raw).trim();

  return {
    present: Boolean(value),
    length: value.length,
    startsWith0x: value.startsWith("0x"),
    looksLikeEvmAddress: /^0x[0-9a-fA-F]{40}$/.test(value),
    looksLikeRawPrivateKey: /^(0x)?[0-9a-fA-F]{64}$/.test(value),
    looksLikeDerPrivateKey: /^(302e|3030)[0-9a-fA-F]+$/.test(value),
    hasWhitespace: /\s/.test(value),
  };
}

async function main() {
  const network = getHederaNetwork();

  if (network !== "mainnet") {
    console.warn(`[HEDERA] Creating topic on ${network}, not mainnet.`);
  }

  getHederaOperatorCredentials({ required: true });
  const client = getHederaClient({ required: true });

  const tx = await new TopicCreateTransaction()
    .setTopicMemo("Agentity Trust Runtime Proofs")
    .execute(client);

  const receipt = await tx.getReceipt(client);
  console.log(`HEDERA_CONSENSUS_TOPIC_ID=${receipt.topicId.toString()}`);

  client.close();
}

main().catch((error) => {
  console.error("[HEDERA] Failed to create topic.");
  console.error(error.message);
  console.error("[HEDERA] Private key shape:", describePrivateKeyShape());
  console.error(
    "[HEDERA] Use the operator account private key, not the account ID, public key, EVM address, or recovery phrase.",
  );
  process.exit(1);
});
