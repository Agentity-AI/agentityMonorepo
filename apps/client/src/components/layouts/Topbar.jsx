import { Mail, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
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
    <div className="flex h-16 w-full items-center justify-between border-b border-[#0f0f0f] bg-[#0f0f0f] px-3">
      <div className="hidden text-sm md:block text-base-content/60">
      </div>

      <div className="flex min-w-0 items-center gap-2 md:gap-4">
        <div className="flex max-w-[11rem] items-center gap-2 rounded-full border border-[#0cf33a] bg-[#19291c] px-3 py-2 text-[#0cf33a] md:max-w-none">
          <div className="relative flex items-center justify-center">
            <div className="absolute inline-flex h-4 w-4 rounded-full bg-[#0cf33a] opacity-75 animate-ping" />
            <div className="h-4 w-4 rounded-full bg-[#0cf33a]" />
          </div>

          <span className="truncate text-xs font-mono">Hedera {network}</span>
          <span className="hidden text-xs text-[#9fffc0] sm:inline">{proofMode}</span>
        </div>

        <Link
          to="/alerts"
          aria-label="Open alerts"
          className="btn btn-ghost btn-circle bg-transparent text-base-content/60"
        >
          <Mail className="m-3 bg-transparent text-base-content/60" />
        </Link>

        <button className="btn btn-ghost h-9 min-h-0 max-w-[9rem] rounded-full border border-base-300 px-3 md:max-w-xs">
          <span className="truncate text-xs font-mono">
            {user?.email || "Agentity user"}
          </span>
        </button>

      {
          loading ? <Loading /> : 
        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="btn btn-ghost btn-circle bg-transparent text-base-content/60"
        >
          <LogOut size={20} className="m-3 bg-transparent text-base-content/60" />
        </button>
      }
      </div>
    </div>
  );
}

export default Topbar;
