import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

import DashboardPage from "./pages/DashboardPage.jsx";
import AiAgent from "./pages/AiAgentPage.jsx";
import SimulationPage from "./pages/SimulationPage.jsx";
import LandingPag from "./pages/LandingPage.jsx";
import { authentication } from "./store/zustant/useZustandHook.js";
import Transaction from "./pages/Transaction.jsx";
import SmartContract from "./pages/SmartContract.jsx";
import AlertPage from "./pages/AlertPage.jsx";
import Documentation from "./pages/Documentation.jsx";

function App() {
  const { dashBoard, bootstrapSession, initialized, bootstrapping } = authentication();

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  if (!initialized) {
    return (
      <>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
          }}
        />
        <div className="flex min-h-screen items-center justify-center bg-base-300 text-base-content">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#14f195] border-t-transparent" />
            <p className="text-sm text-base-content/70">Restoring your session...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
        }}
      />

      {bootstrapping && (
        <div className="fixed inset-x-0 top-0 z-50 h-1 bg-[#14f195]" />
      )}

      <Routes>
        <Route path="/" element={dashBoard ? <DashboardPage /> : <LandingPag />} />
        <Route
          path="/dashboard"
          element={dashBoard ? <DashboardPage /> : <LandingPag />}
        />
        <Route
          path="/agents"
          element={dashBoard ? <AiAgent /> : <LandingPag />}
        />
        <Route
          path="/simulations"
          element={dashBoard ? <SimulationPage /> : <LandingPag />}
        />
        <Route
          path="/transactions"
          element={dashBoard ? <Transaction /> : <LandingPag />}
        />
        <Route
        path="/smart-contracts"
        element={dashBoard ? <SmartContract /> : <LandingPag />}
      />
      <Route
        path="/alerts"
        element={dashBoard ? <AlertPage /> : <LandingPag />}
      />
      <Route
        path="/documentation"
        element={dashBoard ? <Documentation /> : <LandingPag />}
      />
      </Routes>
    </>
  );
}

export default App;
