import Card from "../components/Card/Card";
import SecurityCheck from "../components/security-check/SecurityCheck";
import AppLayout from "../layouts/AppLayouts";
import TwoLineChart from "../components/chart/TwoLineChart";
import { authentication } from "../store/zustant/useZustandHook";
import HederaStatusPanel from "../components/hedera/HederaStatusPanel";

function DashboardPage() {
  const { dashBoard, hederaStatus
  } = authentication();

  const {
    Totalagent = 0,
    TotalvarifiedAgent = 0,
    TransactionsExecuted = 0,
    VulnerabilitiesDetected = 0,
    activeSimulation = 0,
    chart = {},
  } = dashBoard || {};

  const {
    Verification = [],
    Vulnerability = [],
    labels=[],

  } = chart || {};

  const verifiedAgentsRatio = `${TotalvarifiedAgent}/${Totalagent || 1}`;
const score =Math.ceil(
     TotalvarifiedAgent / (Totalagent || 1) * 100 );
const riskLabel =
  score >= 80 ? "Low Risk" : score >= 50 ? "Medium Risk" : "High Risk";
const systemHealth = `${score.toFixed(1)}%`;

  return (
    <AppLayout>
      {/* Header */}
      <div id="dashboard" className="-mt-5 p-4 rounded-lg">
        <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-sm text-base-content/60 text-gray-400">
          System overview and activity monitoring
        </p>
      </div>

      {/* Top metrics (example wiring to real values) */}
      <div className="grid gap-4 md:grid-cols-5 xl:grid-cols-5 mb-6">
        <Card
          label="Total Agents"
          value={Totalagent}
          deltaText="+0 today"
        />
        <Card
          label="Verified Agents"
          value={TotalvarifiedAgent}
          deltaText="+0 today"
        />
        <Card
          label="Transactions Executed"
          value={TransactionsExecuted}
          deltaText="+0 today"
        />
        <Card
          label="Vulnerabilities Detected"
          value={VulnerabilitiesDetected}
          deltaText="+0 today"
        />
        <Card
          label="Active Simulations"
          value={activeSimulation}
          deltaText=""
        />
      </div>

      <div className="mb-6">
        <HederaStatusPanel status={hederaStatus} />
      </div>

      <div className="grid gap-8 grid-cols-3">
        {/* Security Status card */}
        <SecurityCheck
        score={score}
         riskLabel={riskLabel}
         verifiedAgents={verifiedAgentsRatio}
          activeAlerts={activeSimulation}
          systemHealth={systemHealth}
/>    

        {/* Trends chart card */}
        <div className="card bg-[#0f0f0f] border border-[#514c4c] col-span-2">
          <div className="card-body">
            <div className="flex ml-4 mt-4">
              <h2 className="card-title">
                Verification &amp; Vulnerability Trends
              </h2>
            </div>
            <div className="mt-4 h-64 rounded-xl w-full bg-base-300 border-none flex items-center justify-center">
              <span className="ml-5 text-sm text-base-content/60 w-full h-full flex items-center justify-center">
              <TwoLineChart
              labels={labels}
  verification={Verification}
  vulnerability={Vulnerability}
/>
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {/* <div className="border-[#514c4c] pb-7 bg-[#0f0f0f] col-span-3 rounded-lg border">
          <div className="flex my-2 mx-8">
            <ChartArea className="mr-2 text-[#0d59a5]" size={30} />
            <h1 className="mt-2">Recent Activity</h1>
          </div>
          <div className=" overflow-y-auto grid gap-2 ">
            {recentActivities.map((activity) => (
              <Activity key={activity.id} {...activity} />
            ))}
          </div>
        </div> */}
      </div>
    </AppLayout>
  );
}

export default DashboardPage;
