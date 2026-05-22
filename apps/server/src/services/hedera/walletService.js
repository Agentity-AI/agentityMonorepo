const AgentWallet = require("../../models/agentWallet");
const { getHederaNetwork } = require("../../config/hedera");
const { requireHederaAccountId, requireString } = require("../../utils/validation");

async function linkWalletToAgent({
  agentId,
  hederaAccountId,
  hederaPublicKey,
  kmsKeyId = null,
  network = null,
}) {
  const accountId = requireHederaAccountId(hederaAccountId, "hederaAccountId");
  const publicKey = hederaPublicKey
    ? requireString(hederaPublicKey, "hederaPublicKey", { min: 6, max: 255 })
    : accountId;

  const [wallet, created] = await AgentWallet.findOrCreate({
    where: { agent_id: agentId },
    defaults: {
      agent_id: agentId,
      hedera_account_id: accountId,
      hedera_public_key: publicKey,
      kms_key_id: kmsKeyId || null,
      network: network || getHederaNetwork(),
      status: "linked",
    },
  });

  if (!created) {
    await wallet.update({
      hedera_account_id: accountId,
      hedera_public_key: publicKey,
      kms_key_id: kmsKeyId || null,
      network: network || getHederaNetwork(),
      status: "linked",
    });
  }

  return wallet;
}

module.exports = {
  linkWalletToAgent,
};
