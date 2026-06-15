import { useEffect, useState } from "react";
import { Flower, Plus } from "lucide-react";
import AppLayout from "../layouts/AppLayouts";
import { authentication } from "../store/zustant/useZustandHook";
import TreasuryPolicyFormModal from "../components/popups/TreasuryPolicyFormModal";
import formatDate from "../helper/formatDate";
import TransactionTable from "../components/table/TransactionTable";
import PolicyCard from "../components/Card/PolicyCard";
import SideIcon from "../components/layouts/SideIcon";

function Transaction() {
  const [open, setOpen] = useState(false);
  const { transactions, txTotal,
     getTransactionHistory,totalVolume,highRisk ,
    policies, getTransactionsPolicies} = authentication();

  useEffect(() => {
    (async () => {
      try {
        await getTransactionHistory();
        await getTransactionsPolicies();
      } catch (e) {
        console.error("Failed to load transaction history", e);
      }
    })();
  }, [getTransactionHistory, getTransactionsPolicies]);

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col rounded-lg p-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="mb-1 text-3xl font-bold text-white">
            Payments & Transactions
          </h1>
          <p className="text-sm text-gray-400">
            Manage AI agent payments, proofs, and execution records.
          </p>
        </div>

        {/* Policies bar + cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {/* Policies header / New button */}
          <div className="col-span-1 border-[#514c4c] bg-[#0f0f0f] p-2">
            <div className="mt-1 flex items-center justify-between rounded-lg ">
              <div className="flex items-center gap-2 text-sm text-gray-200 py-3">
                <Flower color="#7862f8" className="w-4 h-4" />
                <span>Policies</span>
              </div>
              <button
                className="btn-sm flex items-center rounded-lg border-none bg-[#7862f8] px-2 py-1 text-xs font-medium text-white hover:bg-[#7862f8]/90"
                onClick={() => setOpen(true)}
              >
                <Plus className="mr-1" size={18} />
                <span>New</span>
              </button>
            </div>
            <div className="col-span-q">
            <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-1 rounded-2xl">
              {policies.map((policy, index) => (
                <PolicyCard
                  key={index}
                  policyName={policy.name}
                  max={policy.maxTransactionAmount}
                  daily={policy.dailyLimit}
                />
              ))}
            </div>
          </div>
          </div>
          <div className="col-span-1 flex rounded-2xl border-[#514c4c] gap-2 bg-[#0f0f0f] p-2">
            <div className="flex mt-5 items-center justify-center rounded-2xl p-2 bg-[#7862f8]/20 w-10.5 h-10.5">
             <SideIcon name={"Transactions"} color="#7862f8"/>
             
            </div>
            <div>
              <h2 className="text-sm text-gray-400 py-3">Total Transaction </h2>
              <p className="text-2xl font-bold text-white">{ txTotal}</p>
            </div>
             
          </div>
          <div className="col-span-1 flex rounded-2xl border-[#514c4c] gap-2 bg-[#0f0f0f] p-2">
            <div className="flex mt-5 items-center justify-center rounded-2xl p-2 bg-[#00ff00]/20 w-10.5 h-10.5">
             <SideIcon name={"Money"} color="#00ff00"/>
             
            </div>
            <div>
              <h2 className="text-sm text-gray-400 py-3">Total Volume </h2>
              <p className="text-2xl font-bold text-white">{ totalVolume}</p>
            </div>
             
          </div>
          <div className="col-span-1 flex rounded-2xl border-[#514c4c] gap-2 bg-[#0f0f0f] p-2">
            <div className="flex mt-5 items-center justify-center rounded-2xl p-2 bg-[#ff0000]/20 w-10.5 h-10.5">
             <SideIcon name={"Alerts"} color="#ff0000"/>
             
            </div>
            <div>
              <h2 className="text-sm text-gray-400 py-3">High Risk </h2>
              <p className="text-2xl font-bold text-white">{ highRisk}</p>
            </div>
             
          </div>
        </div>

        {/* Transactions table */}
        <div className="mt-8 rounded-lg border border-[#514c4c] bg-[#0f0f0f] p-4">
          <table className="table-auto mt-1 w-full">
            <thead className="relative left-4">
              <tr className="grid h-10 w-full grid-cols-8 py-2">
                <td className="text-left text-xs font-semibold text-gray-400">
                  Transaction ID
                </td>
                <td className="text-left text-xs font-semibold text-gray-400">
                  Agent Name
                </td>
                <td className="text-left text-xs font-semibold text-gray-400">
                  Type
                </td>
                <td className="text-left text-xs font-semibold text-gray-400">
                  Amount
                </td>
                <td className="text-left text-xs font-semibold text-gray-400">
                  Risk Rating
                </td>
                <td className="text-left text-xs font-semibold text-gray-400">
                  Status
                </td>
                <td className="text-left text-xs font-semibold text-gray-400">
                  Date
                </td>
                <td className="text-left text-xs font-semibold text-gray-400">
                  Actions
                </td>
              </tr>
            </thead>
            <tbody>
              {transactions?.map((tx) => (
                <TransactionTable
                  key={tx.id}
                  transactionId={tx.id}
                  agentName={tx.agentName || "Unassigned"}
                  type={tx.displayType}
                  amount={`${tx.amount ?? 0} ${tx.amountUnit || "units"}`}
                  riskRating={tx.riskRating}
                  status={tx.status}
                  date={formatDate(tx.createdAt)}
                  txHash={tx.txHash}
                  explorerUrl={tx.executionTrace?.explorerUrl || tx.executionTrace?.hederaProof?.explorerUrl}
                />
              ))}
            </tbody>
          </table>
        </div>

        <TreasuryPolicyFormModal
          isOpen={open}
          onClose={() => setOpen(false)}
        />
      </div>
    </AppLayout>
  );
}

export default Transaction;
