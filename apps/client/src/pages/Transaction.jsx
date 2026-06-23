import { useEffect, useState } from "react";
import { ExternalLink, Flower, Plus } from "lucide-react";
import AppLayout from "../layouts/AppLayouts";
import { authentication } from "../store/zustant/useZustandHook";
import TreasuryPolicyFormModal from "../components/popups/TreasuryPolicyFormModal";
import formatDate from "../helper/formatDate";
import TransactionTable from "../components/table/TransactionTable";
import PolicyCard from "../components/Card/PolicyCard";
import SideIcon from "../components/layouts/SideIcon";
import PageHeader from "../components/layouts/PageHeader";

function shortValue(value) {
  return value ? `${String(value).slice(0, 8)}...${String(value).slice(-4)}` : "N/A";
}

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
      <div className="flex flex-col">
        <PageHeader
          title="Payments & Transactions"
          description="Manage AI agent payments, proofs, and execution records."
        />
        {/* Policies bar + cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Policies header / New button */}
          <div className="rounded-2xl border-[#514c4c] bg-[#0f0f0f] p-2 sm:col-span-2 xl:col-span-1">
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
          <div className="flex rounded-2xl border-[#514c4c] gap-2 bg-[#0f0f0f] p-2">
            <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7862f8]/20 p-2">
             <SideIcon name={"Transactions"} color="#7862f8"/>
             
            </div>
            <div>
              <h2 className="text-sm text-gray-400 py-3">Total Transaction </h2>
              <p className="text-2xl font-bold text-white">{ txTotal}</p>
            </div>
             
          </div>
          <div className="flex rounded-2xl border-[#514c4c] gap-2 bg-[#0f0f0f] p-2">
            <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00ff00]/20 p-2">
             <SideIcon name={"Money"} color="#00ff00"/>
             
            </div>
            <div>
              <h2 className="text-sm text-gray-400 py-3">Total Volume </h2>
              <p className="text-2xl font-bold text-white">{ totalVolume}</p>
            </div>
             
          </div>
          <div className="flex rounded-2xl border-[#514c4c] gap-2 bg-[#0f0f0f] p-2">
            <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ff0000]/20 p-2">
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
          <div className="space-y-3 lg:hidden">
            {transactions?.length ? (
              transactions.map((tx) => {
                const explorerUrl =
                  tx.executionTrace?.explorerUrl || tx.executionTrace?.hederaProof?.explorerUrl;
                const amount = `${tx.amount ?? 0} ${tx.amountUnit || "units"}`;

                return (
                  <article
                    key={tx.id}
                    className="rounded-lg border border-[#514c4c] bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Transaction</p>
                        <h3 className="truncate font-mono text-sm font-semibold text-white">
                          {shortValue(tx.id)}
                        </h3>
                      </div>
                      <span className="rounded-full border border-white/10 px-2 py-1 text-xs capitalize text-gray-300">
                        {tx.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-gray-300 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-gray-500">Agent</p>
                        <p className="mt-1 truncate text-white">
                          {tx.agentName || "Unassigned"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="mt-1 text-white">{tx.displayType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="mt-1 text-white">{amount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Risk</p>
                        <p className="mt-1 capitalize text-white">{tx.riskRating}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-gray-500">
                      <span>{formatDate(tx.createdAt)}</span>
                      {explorerUrl ? (
                        <a
                          className="btn btn-sm btn-outline"
                          href={explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          title={tx.txHash}
                        >
                          <ExternalLink className="h-4 w-4" />
                          {tx.txHash ? shortValue(tx.txHash) : "View"}
                        </a>
                      ) : (
                        <span>local</span>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                No transactions yet.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto lg:block">
          <table className="mt-1 w-full min-w-[980px] table-auto">
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
