import { ShieldCheck, WalletCards } from "lucide-react";

function Value({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-gray-100">{value || "Not configured"}</p>
    </div>
  );
}

function TrustRuntimePanel({ status }) {
  const realPayments = Boolean(status?.realPaymentsEnabled);
  const realProofs = status?.realProofsEnabled !== false;

  return (
    <section className="rounded-lg border border-[#21473a] bg-[#07110d] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Trust Runtime</h2>
          <p className="text-sm text-gray-400">
            {status?.operatorCanSubmit ? "Live proof operator" : "Proof operator syncing"} - {status?.proofMode || "local proof mode"}
          </p>
        </div>
        <ShieldCheck className="h-6 w-6 text-[#14f195]" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Value label="Proof endpoint" value={status?.mirrorNodeUrl ? "Configured" : null} />
        <Value label="Operator" value={status?.operatorAccountId ? "Configured" : null} />
        <Value label="Proof topic" value={status?.consensusTopicId ? "Configured" : null} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-[#14f195]/30 bg-[#14f195]/10 px-3 py-1 text-[#14f195]">
          Proofs {realProofs ? "active" : "syncing"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-200">
          Settlement {realPayments ? "live" : "guarded"}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-200">
          <WalletCards className="h-3.5 w-3.5" />
          Settlement ready
        </span>
      </div>
    </section>
  );
}

export default TrustRuntimePanel;
