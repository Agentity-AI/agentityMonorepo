import { Box, ExternalLink, TestTube } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProgressBar from '../progessiveBar/ProgressiveBar'
import { authentication } from '../../store/zustant/useZustandHook';

function RegisteredAgent({ agent }) {
  const {verifyAgent,loading,getUserAgents} = authentication();
  const reputation = agent?.reputation?.score ?? 0;
  const riskLevel = agent?.reputation?.riskLevel || agent?.hedera?.currentRiskLevel || "low";
  const hederaStatus = agent?.hedera?.status || "not synced";
  const explorerUrl = agent?.hedera?.explorerUrl;
  const isVerified = agent?.status === "verified";

  async function handleVerify() {
   await verifyAgent(agent.id, {
      hederaAccountId: agent.publicKey,
      hederaPublicKey: agent.publicKey,
      network: agent.hedera?.network || "testnet",
    });
    await getUserAgents();
  }
  return (
   <tr className=" py-2 h-10 w-full border-b border-[#514c4c] px-4 grid grid-cols-6 hover:bg-[#2f2f2f]">
     <td className="text-left text-sm text-base-content/60">{agent.agentName}</td>
     <td className="ml-2 text-sm text-base-content/60">{agent.agentType || "Agent"}</td>
      <td className="ml-3 text-sm text-base-content/60 flex"><ProgressBar value={parseInt(reputation)}  /> <span className="ml-2">{reputation}</span></td>
     <td className={`ml-3.5 text-sm  flex gap-1 items-center ${isVerified ? 'text-green-500' : 'text-yellow-500'}`}
     ><Box className="w-4 h-4" /> <span>{agent.status}</span></td>
      <td className="ml-5.5 text-sm text-base-content/60">
        <span className="block capitalize">{riskLevel}</span>
        <span className="block text-xs text-gray-500">{hederaStatus}</span>
      </td>
      <td className="ml-6.5 text-sm text-base-content/60 text-[#0847bc]">
        <button className="btn btn-sm btn-outline" onClick={handleVerify}
          disabled={loading}>
          Verify
        </button>
        {explorerUrl && (
          <a className="btn btn-sm btn-outline ml-2" href={explorerUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        <button className="btn btn-sm btn-outline ml-2"><Link to="/simulations"><TestTube className="w-4 h-4" /></Link></button>
      </td>
    </tr>
  )
}

export default RegisteredAgent
