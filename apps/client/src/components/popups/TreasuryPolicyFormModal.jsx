import { useState } from "react";
import { authentication } from "../../store/zustant/useZustandHook";

const INITIAL_FORM = {
  name: "",
  description: "",
  agentId: "",
  maxTransactionAmount: "",
  dailyLimit: "",
  requireManualApproval: true,
  autoRejectHighRisk: true,
  policyEnabled: true,
  status: "active",
  rules: {
    maxAmount: "",
    allowedTypes: ["payment", "execution"],
  },
};

function TreasuryPolicyFormModal({ isOpen, onClose }) {
  const { registerTransaction, agents } = authentication();
  const [form, setForm] = useState(INITIAL_FORM);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;

    if (
      name === "requireManualApproval" ||
      name === "autoRejectHighRisk" ||
      name === "policyEnabled"
    ) {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === "maxTransactionAmount" || name === "dailyLimit") {
      setForm((prev) => ({
        ...prev,
        [name]: value === "" ? "" : Number(value),
      }));
      return;
    }

    if (name === "rules.maxAmount") {
      setForm((prev) => ({
        ...prev,
        rules: {
          ...prev.rules,
          maxAmount: value === "" ? "" : Number(value),
        },
      }));
      return;
    }

    if (name === "rules.allowedTypes") {
      const types = value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      setForm((prev) => ({
        ...prev,
        rules: {
          ...prev.rules,
          allowedTypes: types,
        },
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name,
      description: form.description,
      agentId: form.agentId,
      maxTransactionAmount:
        form.maxTransactionAmount === "" ? 0 : form.maxTransactionAmount,
      dailyLimit: form.dailyLimit === "" ? 0 : form.dailyLimit,
      requireManualApproval: form.requireManualApproval,
      autoRejectHighRisk: form.autoRejectHighRisk,
      policyEnabled: form.policyEnabled,
      status: form.status,
      rules: {
        maxAmount: form.rules.maxAmount === "" ? 0 : form.rules.maxAmount,
        allowedTypes: form.rules.allowedTypes,
      },
    };

    try {
      await registerTransaction(payload);
      setForm(INITIAL_FORM);
      onClose?.();
    } catch (err) {
      console.error("Failed to register treasury policy:", err);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-3 py-4 sm:px-6 sm:py-8"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f0f0f] p-4 shadow-2xl sm:p-6"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Treasury Policy Settings
            </h2>
            <p className="text-xs text-gray-400">
              Configure guardrails for treasury transactions and execution.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full bg-white/5 px-2 py-1 text-sm text-gray-300 hover:bg-white/10"
            onClick={onClose}
          >
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-sm text-gray-200">
          {/* Policy details */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Policy Details
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-control">
                <label className="mb-1 block text-xs text-gray-400">
                  Policy name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input px-2 input-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="Default Treasury Policy"
                  required
                />
              </div>

              <div className="form-control">
                <label className="mb-1 block text-xs text-gray-400">
                  Agent
                </label>
                <select
                  name="agentId"
                  value={form.agentId}
                  onChange={handleChange}
                  className="select select-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none"
                  required
                >
                  <option value="" disabled>
                    Select agent
                  </option>
                  {agents?.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.agent_name ?? agent.agentName ?? agent.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 form-control">
              <label className="mb-1 block text-xs text-gray-400">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="textarea px-2 textarea-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="Policy used for standard payment and execution validation."
                rows={3}
                required
              />
            </div>
          </section>

          {/* Limits */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Limits
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-control">
                <label className="mb-1 block text-xs text-gray-400">
                  Max transaction amount
                </label>
                <input
                  type="number"
                  name="maxTransactionAmount"
                  value={form.maxTransactionAmount}
                  onChange={handleChange}
                  className="input px-2 input-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="1000"
                  min={0}
                />
              </div>

              <div className="form-control">
                <label className="mb-1 block text-xs text-gray-400">
                  Daily limit
                </label>
                <input
                  type="number"
                  name="dailyLimit"
                  value={form.dailyLimit}
                  onChange={handleChange}
                  className="input px-2 input-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="10000"
                  min={0}
                />
              </div>
            </div>
          </section>

          {/* Toggles and status */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Controls
            </h3>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  name="requireManualApproval"
                  checked={form.requireManualApproval}
                  onChange={handleChange}
                  className="checkbox checkbox-xs border-white/30 bg-black/40"
                />
                <span>Require manual approval</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  name="autoRejectHighRisk"
                  checked={form.autoRejectHighRisk}
                  onChange={handleChange}
                  className="checkbox checkbox-xs border-white/30 bg-black/40"
                />
                <span>Auto-reject high-risk</span>
              </label>
            </div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  name="policyEnabled"
                  checked={form.policyEnabled}
                  onChange={handleChange}
                  className="checkbox checkbox-xs border-white/30 bg-black/40"
                />
                <span>Policy enabled</span>
              </label>

              <div className="form-control w-full sm:w-40">
                <label className="mb-1 block text-xs text-gray-400">
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="select select-bordered w-full border-white/10 bg-black/40 text-xs text-gray-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
              </div>
            </div>
          </section>

          {/* Rules */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Rules
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-control">
                <label className="mb-1 block text-xs text-gray-400">
                  Rule max amount
                </label>
                <input
                  type="number"
                  name="rules.maxAmount"
                  value={form.rules.maxAmount}
                  onChange={handleChange}
                  className="input px-2 input-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="100"
                  min={0}
                />
              </div>

              <div className="form-control">
                <label className="mb-1 block text-xs text-gray-400">
                  Allowed types (comma separated)
                </label>
                <input
                  type="text"
                  name="rules.allowedTypes"
                  value={form.rules.allowedTypes.join(", ")}
                  onChange={handleChange}
                  className="input px-2 input-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="payment, execution"
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-gray-200 hover:bg-white/10"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Save Policy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TreasuryPolicyFormModal;
