import { Bot, Box, ExternalLink, Plus, TestTube } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "../layouts/AppLayouts";
import RegisteredAgent from "../components/agent/RegisteredAgent";
import Modal from "../components/model/Modal";
import NewAgentPopUp from "../components/popups/NewAgentPopUp";
import { useState } from "react";
import { authentication } from "../store/zustant/useZustandHook";
import ProgressBar from "../components/progessiveBar/ProgressiveBar";

function AiAgent() {
  const [open, setOpen] = useState(false);
  const { agents, verifyAgent, loading, getUserAgents } = authentication();

  async function handleVerifyAgent(agent) {
    await verifyAgent(agent.id, {
      hederaAccountId: agent.publicKey,
      hederaPublicKey: agent.publicKey,
    });
    await getUserAgents();
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div>
          <h1 className="mb-1 text-2xl font-bold sm:text-3xl">AI Agent</h1>
          <p className="text-sm text-base-content/60 text-gray-400">
            Register and manage AI agents
          </p>
        </div>

        <button
          className="btn-sm flex w-full items-center justify-center rounded-lg border-none bg-[#06b0ff] px-4 py-2 text-white hover:bg-[#06b0ff]/90 sm:w-auto"
          onClick={() => setOpen(true)}
        >
          <Plus className=" mr-2" size={30} />
          <span>Create New Agent</span>
        </button>
      </div>

      <div className="border-[#514c4c] bg-[#0f0f0f] rounded-lg border">
        <div className="items-center gap-4 border-b border-[#514c4c] p-4">
          <div className="flex items-center gap-2">
            <Bot className="text-primary " size={24} />
            <h2 className="text-xl font-semibold">Registered Agents</h2>
            <span className="text-xl text-[#f5f8f9]">
              ({agents?.length ?? 0})
            </span>
          </div>

          <div className="mt-5 space-y-3 lg:hidden">
            {agents?.length ? (
              agents.map((agent) => {
                const reputation = agent?.reputation?.score ?? 0;
                const riskLevel =
                  agent?.reputation?.riskLevel || agent?.hedera?.currentRiskLevel || "low";
                const proofStatus = agent?.hedera?.status || "not synced";
                const explorerUrl = agent?.hedera?.explorerUrl;
                const isVerified = agent?.status === "verified";

                return (
                  <article
                    key={agent.id}
                    className="rounded-lg border border-[#514c4c] bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-white">
                          {agent.agentName}
                        </h3>
                        <p className="mt-1 text-xs text-gray-400">
                          {agent.agentType || "Agent"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-xs ${
                          isVerified ? "text-green-500" : "text-yellow-500"
                        }`}
                      >
                        <Box className="h-3.5 w-3.5" />
                        {agent.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-gray-300 sm:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs text-gray-500">Reputation</p>
                        <div className="flex items-center gap-2">
                          <ProgressBar value={parseInt(reputation)} />
                          <span>{reputation}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Proof status</p>
                        <p className="mt-1 capitalize text-gray-200">{riskLevel}</p>
                        <p className="text-xs text-gray-500">{proofStatus}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleVerifyAgent(agent)}
                        disabled={loading}
                      >
                        Verify
                      </button>
                      {explorerUrl && (
                        <a
                          className="btn btn-sm btn-outline"
                          href={explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open proof for ${agent.agentName}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <Link className="btn btn-sm btn-outline" to="/simulations">
                        <TestTube className="h-4 w-4" />
                        Test
                      </Link>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                No agents registered yet.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="mt-5 w-full min-w-[820px] table-auto">
              <thead className="relative left-4">
                <tr className=" py-2 h-10 w-full grid grid-cols-6 hover:bg-[#2f2f2f]">
                  <td className="text-left text-sm text-base-content/60">
                    Agent Name
                  </td>
                  <td className="text-left text-sm text-base-content/60">
                    Type
                  </td>
                  <td className="text-left text-sm text-base-content/60">
                    Reputation
                  </td>
                  <td className="text-left text-sm text-base-content/60">
                    Status
                  </td>
                  <td className="text-left text-sm text-base-content/60">
                    Proof Status
                  </td>
                  <td className="text-left text-sm text-base-content/60">
                    Actions
                  </td>
                </tr>
              </thead>
              <tbody >
                {agents&&(agents.map((agent) => (
                  <RegisteredAgent key={agent.id} agent={agent} />
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        <NewAgentPopUp onClose={() => setOpen(false)} />
      </Modal>
    </AppLayout>
  );
}

export default AiAgent;
