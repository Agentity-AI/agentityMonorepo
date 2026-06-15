import { Shield, TestTube } from "lucide-react";

function SecurityCheck({
  score,
  riskLabel,
  verifiedAgents,
  activeAlerts,
  systemHealth,
}) {
  return (
    <div className="border rounded-lg border-[#514c4c] bg-[#0f0f0f]">
      <div className="mx-8 my-4">
        <div className="flex gap-2">
          <Shield className="mr-2 inline-block text-[#0d59a5]" size={24} />
          <h2 className="card-title">Security Status</h2>
        </div>

        <div className="mx-auto mt-4 flex aspect-square w-36 items-center justify-center rounded-full border border-[#eec612] bg-[#483e1c] text-center sm:w-40">
          <span className="text-3xl font-bold text-base-content">
            {score}
          </span>
        </div>

        <p className="text-center text-sm text-base-content/60 mt-4">
          Overall Trust Score
        </p>

        <button className="btn btn-sm mx-auto mt-6 flex w-40 rounded-xl border-[#eec612] bg-[#483e1c] px-4 py-2 text-[#eec612]">
          <TestTube className="inline-block mr-1" size={16} />
          <span>{riskLabel}</span>
        </button>
      </div>

      <hr className="border-[#514c4c] my-4" />

      <div className="mx-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-base-content/60">Verified Agents</span>
          <span className="text-xs badge badge-ghost text-white">
            {verifiedAgents}
          </span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-base-content/60">Active Alerts</span>
          <span className="text-xs badge badge-ghost text-[#f7b80a]">
            {activeAlerts}
          </span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-base-content/60">System Health</span>
          <span className="text-xs badge badge-ghost text-[#10c700]">
            {systemHealth}
          </span>
        </div>
      </div>
    </div>
  );
}

export default SecurityCheck;
