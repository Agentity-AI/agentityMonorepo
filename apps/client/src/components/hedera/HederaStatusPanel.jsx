import { ExternalLink, ShieldCheck, WalletCards } from "lucide-react";

function Value({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-gray-100">{value || "Not configured"}</p>
    </div>
  );
}

function HederaStatusPanel({ status }) {
  const network = status?.network || "testnet";
  const realPayments = Boolean(status?.realPaymentsEnabled);
  const realProofs = status?.realProofsEnabled !== false;
  const hashscanUrl = network === "localnet" ? null : `https://hashscan.io/${network}`;

  return (
    <section className="rounded-lg border border-[#21473a] bg-[#07110d] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Hedera Runtime</h2>
          <p className="text-sm text-gray-400">
            {network} - {status?.proofMode || "local-hash"} - {status?.operatorCanSubmit ? "live operator" : "simulated operator"}
          </p>
        </div>
        <ShieldCheck className="h-6 w-6 text-[#14f195]" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Value label="Mirror node" value={status?.mirrorNodeUrl} />
        <Value label="Operator" value={status?.operatorAccountId} />
        <Value label="HCS topic" value={status?.consensusTopicId} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-[#14f195]/30 bg-[#14f195]/10 px-3 py-1 text-[#14f195]">
          Proofs {realProofs ? "enabled" : "disabled"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-200">
          Payments {realPayments ? "real" : "simulated"}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-200">
          <WalletCards className="h-3.5 w-3.5" />
          HBAR/HTS ready
        </span>
        {hashscanUrl && (
          <a
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-200 hover:text-[#14f195]"
            href={hashscanUrl}
            target="_blank"
            rel="noreferrer"
          >
            HashScan <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </section>
  );
}

export default HederaStatusPanel;
