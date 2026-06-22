import { useEffect, useState } from "react";
import { authentication } from "../../store/zustant/useZustandHook";
import { Loading } from "../loading/Loading";
import toast from "react-hot-toast";
function NewAgentPopUp({ onClose, onSubmit }) {
  const {
    registerAgent,
    linkWalletToAgent,
    getAgentTypes,
    agentTypes,
    loading,
  } = authentication();

  const [form, setForm] = useState({
    agentName: "",
    publicKey: "",
    description: "",
    agentType: "Risk Monitoring Agent",
    apiEndpoint: "",
    metadata: {
      strategy: "",
    },
  });

  useEffect(() => {
    getAgentTypes({ silent: true });
  }, [getAgentTypes]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleMetadataChange = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: e.target.value,
      },
    }));
  };

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      agentName: form.agentName,
      publicKey: form.publicKey,
      description: form.description,
      agentType: form.agentType,
      apiEndpoint: form.apiEndpoint,
      metadata: form.metadata,
    };
    if (!payload.agentName || !payload.publicKey || !payload.agentType
      || payload.agentName.trim() === "" || !payload.publicKey.trim() || payload.agentType.trim() === ""
    ) {
      toast.error("Please fill in all required fields", {
        id: "register-agent",
      });
      return;
    }

    const agent = await registerAgent(payload);
    if (!agent?.id) return;

    await linkWalletToAgent({
      agentId: agent.id,
      hederaAccountId: payload.publicKey,
      hederaPublicKey: payload.publicKey,
    });

    onClose?.(true);
    onSubmit?.(payload);
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f0f0f] p-4 text-sm text-gray-200 shadow-2xl sm:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Register New Agent</h2>
          <p className="text-xs text-gray-400">
            Define capabilities, identity, and settlement details for your agent.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-white/5 px-2 py-1 text-sm text-gray-300 hover:bg-white/10"
          onClick={() => onClose?.()}
        >
          X
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* Identity section */}
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Identity
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Agent Name */}
            <div className="form-control">
              <label className="mb-1 block text-xs text-gray-400">
                Agent name
              </label>
              <input
                type="text"
                className="input px-2 input-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="Treasury Risk Monitor"
                value={form.agentName}
                onChange={handleChange("agentName")}
              />
            </div>

            {/* Agent Type */}
            <div className="form-control">
              <label className="mb-1 block text-xs text-gray-400">
                Agent type
              </label>
              <select
                className="select px-2 select-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none"
                value={form.agentType}
                onChange={handleChange("agentType")}
              >
                {(agentTypes.length ? agentTypes : ["Risk Monitoring Agent", "Treasury Agent", "Trading Bot"]).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="mt-3 form-control">
            <label className="mb-1 block text-xs text-gray-400">
              Description
            </label>
            <textarea
              className="textarea px-2 textarea-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
              placeholder="Monitors treasury and payment risk for the DAO."
              value={form.description}
              onChange={handleChange("description")}
              rows={3}
            />
          </div>
        </section>

        {/* Connectivity section */}
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Connectivity
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Public Key */}
            <div className="form-control">
              <label className="mb-1 block text-xs text-gray-400">
                Agent account or public key
              </label>
              <input
                type="text"
                className="input px-2 input-bordered w-full border-white/10 bg-black/40 text-xs font-mono text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="0.0.1234567"
                value={form.publicKey}
                onChange={handleChange("publicKey")}
              />
            </div>

            {/* API Endpoint */}
            <div className="form-control">
              <label className="mb-1 block text-xs text-gray-400">
                API endpoint
              </label>
              <input
                type="text"
                className="input px-2 input-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="https://agent.example.com/api"
                value={form.apiEndpoint}
                onChange={handleChange("apiEndpoint")}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Metadata
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="form-control">
              <label className="mb-1 block text-xs text-gray-400">
                Strategy
              </label>
              <input
                type="text"
                className="input px-2 input-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
                placeholder="swing"
                value={form.metadata.strategy}
                onChange={handleMetadataChange("strategy")}
              />
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-gray-200 hover:bg-white/10"
            onClick={() => onClose?.()}
          >
            Cancel
          </button>
          {loading ? (
            <Loading />
          ) : (
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Register Agent
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default NewAgentPopUp;
