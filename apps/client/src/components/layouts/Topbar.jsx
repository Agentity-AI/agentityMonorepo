import { Mail, LogOut } from "lucide-react";
import { authentication } from "../../store/zustant/useZustandHook";
import { Loading } from "../loading/Loading";

function Topbar() {
  const { signOut, loading, hederaStatus, user } = authentication();
  const network = hederaStatus?.network || "testnet";
  const proofMode = hederaStatus?.operatorCanSubmit ? "proofs live" : "proofs simulated";

  async function handleLogout() {
    try {
      // If you have a separate logoutUser side-effect, call it here
      // logoutUser();
      await signOut();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  return (
    <div className="flex items-center justify-between h-15 w-full bg-[#0f0f0f] border-[#0f0f0f]
     border-b px-2">
      {/* Left side (optional breadcrumb / page title placeholder) */}
      <div className="hidden text-sm md:block text-base-content/60">
        {/* Breadcrumbs / page title */}
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-4">
        {/* Network badge */}
        <div className="flex gap-2 rounded-full border border-[#0cf33a] bg-[#19291c] px-3 py-2 text-[#0cf33a]">
          <div className="relative flex items-center justify-center">
            {/* animated ring */}
            <div className="absolute inline-flex h-4 w-4 rounded-full bg-[#0cf33a] opacity-75 animate-ping" />
            {/* solid center dot */}
            <div className="h-4 w-4 rounded-full bg-[#0cf33a]" />
          </div>

          <span className="text-xs font-mono">Hedera {network}</span>
          <span className="text-xs text-[#9fffc0]">{proofMode}</span>
        </div>

        {/* Notification icon */}
        <button
          className={`btn btn-ghost btn-circle bg-transparent text-base-content/60`}
        >
          <Mail
            className={`m-3 bg-transparent text-base-content/60`}
          />
        </button>

        {/* Wallet / profile */}
        <button className="btn btn-ghost h-9 min-h-0 rounded-full border border-base-300 px-3">
          <span className="text-xs font-mono">
            {user?.email || "Agentity user"}
          </span>
        </button>

      {
          loading ? <Loading /> : 
        <button
          onClick={handleLogout}
          className={`btn btn-ghost btn-circle bg-transparent text-base-content/60`}
        >
          <LogOut
            size={20}
            className={`m-3 bg-transparent text-base-content/60`}
          />
        </button>
      }
      </div>
    </div>
  );
}

export default Topbar;
