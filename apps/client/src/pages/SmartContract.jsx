import React, { useEffect } from 'react'
import AppLayout from '../layouts/AppLayouts'
import { authentication } from '../store/zustant/useZustandHook';
import { Bot, Plus } from 'lucide-react';
import Modal from '../components/model/Modal';
import NewAuditForm from '../components/popups/NewAuditForm';
import AuditTable from '../components/table/AuditTable';
import PageHeader from '../components/layouts/PageHeader';

function SmartContract() {
    const [open, setOpen] = React.useState(false);
    const [detailsOpen, setDetailsOpen] = React.useState(false);
    const {getAuditHistory,getAuditDetails,audits,auditDetails}=authentication();

    useEffect(() => {
        const loadAuditHistory = async () => {
          try {          
            await getAuditHistory();
          } catch (err) {
            console.error("Failed to load audit history:", err);
          }
        };

        loadAuditHistory();
    }, [getAuditHistory]);

    const handleViewAudit = async (auditId) => {
      const details = await getAuditDetails(auditId);
      if (details) setDetailsOpen(true);
    };

  return (
    <AppLayout>
      <PageHeader
        title="Smart Contracts Audits"
        description="Automated security analysis for smart contracts"
        actions={
          <button
            className="btn-sm flex w-full items-center justify-center rounded-lg border-none bg-[#06b0ff] px-4 py-2 text-white hover:bg-[#06b0ff]/90 sm:w-auto"
            onClick={() => setOpen(true)}
          >
            <Plus className="mr-2 h-5 w-5" />
            <span>New Audit</span>
          </button>
        }
      />

      <div className="border-[#514c4c] bg-[#0f0f0f] rounded-lg border">
        <div className="items-center gap-4 border-b border-[#514c4c] p-4">
          <div className="flex items-center gap-2">
            <Bot className="text-primary " size={24} />
            <h2 className="text-xl font-semibold">Contract Audits</h2>
            <span className="text-xl text-[#f5f8f9]">
              ({audits?.length ?? 0})
            </span>
          </div>

          <div className="mt-5 space-y-3 lg:hidden">
            {audits?.length ? (
              audits.map((audit) => (
                <article
                  key={audit.id}
                  className="rounded-lg border border-[#514c4c] bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-white">
                        {audit.contractName}
                      </h3>
                      <p className="mt-1 text-xs capitalize text-gray-400">
                        {audit.status}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-xs uppercase text-gray-300">
                      {audit.riskLevel}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-gray-300 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-500">Consensus score</p>
                      <p className="mt-1 font-semibold text-white">
                        {audit.consensusScore}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Risk level</p>
                      <p className="mt-1 capitalize text-white">{audit.riskLevel}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline mt-4 w-full sm:w-auto"
                    onClick={() => handleViewAudit(audit.id)}
                  >
                    View details
                  </button>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                No smart contract audits yet.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="mt-5 w-full min-w-[720px] table-auto">
              <thead className="relative left-4 grid">
                <tr className=" py-2 h-10 w-full grid grid-cols-5 hover:bg-[#2f2f2f]">
                  <td className="text-left text-sm text-base-content/60">
                    Contract Name
                  </td>
                  <td className="text-left text-sm text-base-content/60">
                    Risk Level
                  </td>
                  <td className="text-left text-sm text-base-content/60">
                    Consensus Score
                  </td>
                  <td className="text-left text-sm text-base-content/60">
                    Status
                  </td>
                  <td className="text-left text-sm text-base-content/60">
                    Actions
                  </td>
                </tr>
              </thead>
              <tbody >
                {audits&&(audits.map((audit) => (
                  <AuditTable key={audit.id} 
                   contractname={audit.contractName} risklevel={audit.riskLevel} consensusScore={audit.consensusScore}
                   status={audit.status} onView={() => handleViewAudit(audit.id)} />
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        <NewAuditForm onClose={() => setOpen(false)} />
      </Modal>

      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        {auditDetails && (
          <div className="space-y-5 rounded-2xl border border-white/10 bg-[#0f0f0f] p-4 text-sm text-gray-200 sm:p-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {auditDetails.contractName}
              </h2>
              <p className="mt-1 text-gray-400">{auditDetails.summary}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-xs text-gray-400">Risk</p>
                <p className="text-lg font-semibold capitalize">{auditDetails.riskLevel}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-xs text-gray-400">Score</p>
                <p className="text-lg font-semibold">{auditDetails.consensusScore}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-xs text-gray-400">Status</p>
                <p className="text-lg font-semibold capitalize">{auditDetails.status}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-base font-semibold text-white">Findings</h3>
              <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
                {auditDetails.findings?.length ? (
                  auditDetails.findings.map((finding) => (
                    <div
                      key={`${finding.title}-${finding.severity}`}
                      className="rounded-lg border border-white/10 bg-black/30 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-white">{finding.title}</p>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs uppercase text-gray-300">
                          {finding.severity}
                        </span>
                      </div>
                      <p className="mt-2 text-gray-400">{finding.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-white/10 bg-black/30 p-3 text-gray-400">
                    No findings were detected for this audit.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
   
  )
}

export default SmartContract
