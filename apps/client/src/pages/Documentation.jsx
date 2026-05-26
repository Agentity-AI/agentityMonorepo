
import AppLayout from '../layouts/AppLayouts'

function Documentation() {
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    "https://agentitymonorepo.onrender.com";

  return (
    <AppLayout>
    <div>
         <div id="document" className="-mt-5 p-4 rounded-lg">
        <h1 className="text-3xl font-bold mb-1">SDK & Documentation</h1>
        <p className="text-sm text-base-content/60 text-gray-400">
          Integration guides and API reference for the Hedera backend.
        </p>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        <a
          className="rounded-lg border border-[#514c4c] bg-[#0f0f0f] p-4 hover:border-[#14f195]/70"
          href={`${apiBaseUrl.replace(/\/+$/, "")}/docs`}
          target="_blank"
          rel="noreferrer"
        >
          <h2 className="text-lg font-semibold text-white">Swagger API</h2>
          <p className="mt-2 text-sm text-gray-400">Live endpoint contract for auth, agents, simulations, tasks, payments, alerts, and Hedera proofs.</p>
        </a>
        <a
          className="rounded-lg border border-[#514c4c] bg-[#0f0f0f] p-4 hover:border-[#14f195]/70"
          href={`${apiBaseUrl.replace(/\/+$/, "")}/hedera/status`}
          target="_blank"
          rel="noreferrer"
        >
          <h2 className="text-lg font-semibold text-white">Hedera Status</h2>
          <p className="mt-2 text-sm text-gray-400">Runtime network, mirror node, proof mode, operator configuration, and payment mode.</p>
        </a>
      </div>
      
      </div>
    </AppLayout>

  )
}

export default Documentation
