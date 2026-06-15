import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../layouts/AppLayouts.jsx";
import { Play, TestTube } from "lucide-react";
import SimulationCard from "../components/Card/SimulationCard.jsx";
import { authentication } from "../store/zustant/useZustandHook.js";
import SimulationTable from "../components/table/SimulationTable.jsx";
import SimulationState from "../components/SimulationState/SimulationState.jsx";

function SimulationPage() {
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [scenarioType, setScenarioType] = useState("Token Swap");
  const [amount, setAmount] = useState(10);
  const [tokenIn, setTokenIn] = useState("USDC");
  const [tokenOut, setTokenOut] = useState("USD");
  const {
    getSimulations,
    getSimulationScenarios,
    runSimulation,
    simulations,
    simulationScenarios,
    agents,
    loading,
    runSimulationData,
  } = authentication();
  const [isRunning, setIsrunning] = useState(false);
  useEffect(() => {
    const loadUserAgents = async () => {
      try {
        await Promise.all([getSimulations(), getSimulationScenarios()]);
      } catch (err) {
        console.error("Failed to load user agents:", err);
      }
    };

    loadUserAgents();
  }, [getSimulations, getSimulationScenarios]);



  const handleAgentChange = (e) => {
    setSelectedAgentId(e.target.value);
  };

  const handleRunSimulation = async (e) => {
    e.preventDefault();
    if (!selectedAgentId) return;

    const payload = {
      agentId: selectedAgentId,
      scenarioType,
      parameters: {
        amount: Number(amount),
        tokenIn,
        tokenOut,
      },
    };

    try {
      setIsrunning(true);
      await runSimulation(payload);
      await getSimulations(); // Refresh simulations after running
      setIsrunning(false);
    } catch (err) {
      console.error("Simulation failed:", err);
      setIsrunning(false);
    }
  };

  const selectedAgent = agents?.find(
    (agent) => String(agent.id) === String(selectedAgentId)
  );
  return (
    <AppLayout>
      <div className="mb-6 rounded-lg p-4">
        <h1 className="mb-1 text-3xl font-bold">Simulation Sandbox</h1>
        <p className="text-sm text-white-400 text-base-content/60">
          Test AI agents in containerized scenarios
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card border border-[#514c4c] bg-[#0f0f0f] rounded-lg py-4 px-4 xl:col-span-1">
          <div className="card-body flex gap-2">
            <TestTube className="my-2 mr-2 h-5 w-5 text-[#0d59a5]" />
            <h2 className="card-title my-2">Configure Simulation</h2>
          </div>

          <form className="card-body space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="card-body pt-0">
              <select
                className="select mt-2 mb-4 w-full text-white bg-[#1c1b24] py-2 focus:outline-none"
                onChange={handleAgentChange}
                value={selectedAgentId}
              >
                <option value="" disabled>
                  Select agent
                </option>
                {agents?.map((agent) => (
                  <option className="text-white" key={agent.id} value={agent.id}>
                    {agent.agentName}
                  </option>
                ))}
              </select>
              {!agents?.length && (
                <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-gray-300">
                  <p>No agents are available for simulation yet.</p>
                  <Link
                    to="/agents"
                    className="mt-3 inline-flex rounded-md bg-[#1087e7] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0d78c9]"
                  >
                    Create an agent
                  </Link>
                </div>
              )}
            </div>

            <div className="card-body pt-0">
              <select
                className="select mt-2 mb-4 w-full bg-[#1c1b24] py-2 focus:outline-none"
                onChange={(e) => setScenarioType(e.target.value)}
                value={scenarioType}
              >
                {(simulationScenarios.length
                  ? simulationScenarios
                  : ["Token Swap", "NFT Mint", "Liquidity Pool", "Contract Deployment", "Multi-Sig Transaction"]
                ).map((scenario) => (
                  <option key={scenario}>{scenario}</option>
                ))}
              </select>
            </div>

            <div className="card-body pt-0">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <label className="label">
                    <span className="label-text text-xs">Amount</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input input-bordered w-full bg-[#0f0f0f]"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text text-xs">Token In</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full bg-[#0f0f0f]"
                    value={tokenIn}
                    onChange={(e) => setTokenIn(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text text-xs">Token Out</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full bg-[#0f0f0f]"
                    value={tokenOut}
                    onChange={(e) => setTokenOut(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <SimulationCard
                action={scenarioType}
                status={selectedAgent?.status}
              />
            </div>

            <div>
              <button
                type="button"
                className="btn btn-primary mt-4 flex w-full items-center justify-center bg-[#1087e7] px-2 py-1 hover:bg-[#0d78c9]"
                onClick={handleRunSimulation}
                disabled={loading || !selectedAgentId || isRunning}
              >
                <Play className="mr-2 h-6 w-6" />
                <span>Run Simulation</span>
              </button>
            </div>
          </form>
        </div>

        <div className="card rounded-lg border border-[#514c4c] bg-[#0f0f0f] xl:col-span-2">
          <div className="card-body">
           <SimulationState run={isRunning ? "running" : runSimulationData  ? "final" : "noActive"} />
          </div>
        </div>

        <div className="mt-8 overflow-x-auto rounded-lg border border-[#514c4c] bg-[#0f0f0f] p-4 xl:col-span-3">
    <table className="table-auto mt-1 min-w-[720px] w-full">
      <thead>
        <tr className="text-left text-xs font-semibold text-gray-400" >
          <th className=" px-3 py-2 text-left">Agent Name</th>
          <th className=" px-3 py-2 text-left">Scenario</th>
          <th className=" px-3 py-2 text-left">Risk Score</th>
          <th className=" px-3 py-2 text-left">Vulnerabilities</th>
          <th className=" px-3 py-2 text-left">Status</th>
        </tr>
      </thead>
      <tbody>
          { simulations.map((sim) => (
              <SimulationTable key={sim.id} agent={sim} />
            ))}
     </tbody>
    </table>
</div>
      </div>
    </AppLayout>
  );
}

export default SimulationPage;
