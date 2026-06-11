import { create } from "zustand";
import toast from "react-hot-toast";
import api, {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from "../axios/axiosInitaition";

const AUTH_USER_STORAGE_KEY = "agentity_auth_user";

function getStoredUser() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredUser(user) {
  if (typeof window === "undefined") return;

  if (user) {
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    return;
  }

  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

function buildSession(data, fallbackName = "") {
  const token = data?.jwt || data?.accessToken || data?.token || null;
  const user = data?.email
    ? {
        email: data.email,
        name: data.name || fallbackName || data.email,
      }
    : null;

  setAuthToken(token);
  saveStoredUser(user);

  return {
    token,
    user,
    dashboard: data?.dashboard || null,
  };
}

function clearSession() {
  clearAuthToken();
  saveStoredUser(null);
}

function itemsFrom(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function messageFrom(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function isUnauthorized(error) {
  return error?.response?.status === 401 || error?.response?.status === 403;
}

export const authentication = create((set, get) => ({
  dashBoard: null,
  loading: false,
  bootstrapping: false,
  initialized: false,
  error: null,
  alerts: [],
  alertSummary: null,
  agents: [],
  agentTypes: [],
  agentDetails: null,
  user: getStoredUser(),
  audits: [],
  auditDetails: null,
  tasksHistory: [],
  simulations: [],
  simulationScenarios: [],
  transactions: [],
  transactionDetails: null,
  policies: [],
  txTotal: 0,
  totalVolume: 0,
  highRisk: 0,
  runSimulationData: null,
  systemStatus: null,
  hederaStatus: null,
  verificationResult: null,
  token: getAuthToken(),

  bootstrapSession: async () => {
    if (get().bootstrapping) return;

    set({ bootstrapping: true, error: null });
    await get().getSystemStatus({ silent: true });

    try {
      const dashboard = await api.get("/dashboard/overview");
      set({
        dashBoard: dashboard.data,
        initialized: true,
        bootstrapping: false,
      });
      await Promise.all([
        get().getUserAgents({ silent: true }),
        get().getAgentTypes({ silent: true }),
        get().getSimulationScenarios({ silent: true }),
      ]);
    } catch (error) {
      if (isUnauthorized(error)) {
        clearSession();
        set({
          dashBoard: null,
          user: null,
          token: null,
          initialized: true,
          bootstrapping: false,
        });
        return;
      }

      set({
        initialized: true,
        bootstrapping: false,
        error: messageFrom(error, "Failed to initialize session"),
      });
    }
  },

  registerUser: async (payload) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post("/auth/register", payload);
      const session = buildSession(res.data, payload?.name);

      set({
        dashBoard: session.dashboard,
        user: session.user,
        token: session.token,
        loading: false,
      });

      await Promise.all([
        get().getUserAgents({ silent: true }),
        get().getAgentTypes({ silent: true }),
        get().getSimulationScenarios({ silent: true }),
      ]);
      toast.success("Registration successful", { id: "register" });
      return true;
    } catch (err) {
      const message = messageFrom(err, "Failed to register user");
      set({ loading: false, error: message });
      toast.error(message, { id: "register" });
      return false;
    }
  },

  loginUser: async (payload) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post("/auth/login", payload);
      const session = buildSession(res.data);

      set({
        dashBoard: session.dashboard,
        user: session.user,
        token: session.token,
        loading: false,
      });

      await Promise.all([
        get().getUserAgents({ silent: true }),
        get().getAgentTypes({ silent: true }),
        get().getSimulationScenarios({ silent: true }),
      ]);
      toast.success("Login successful", { id: "login" });
      return true;
    } catch (err) {
      const message = messageFrom(err, "Failed to login user");
      set({ loading: false, error: message });
      toast.error(message, { id: "login" });
      return false;
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null });
      await api.post("/auth/logout");
    } catch (err) {
      if (!isUnauthorized(err)) {
        toast.error(messageFrom(err, "Logout failed"), { id: "logout" });
      }
    } finally {
      clearSession();
      set({
        dashBoard: null,
        user: null,
        token: null,
        agents: [],
        alerts: [],
        transactions: [],
        policies: [],
        loading: false,
      });
      toast.success("Logged out", { id: "logout" });
    }
  },

  getDashboard: async ({ silent = false } = {}) => {
    try {
      if (!silent) set({ loading: true, error: null });
      const res = await api.get("/dashboard/overview");
      set({ dashBoard: res.data, loading: false });
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to get dashboard data");
      set({ loading: false, error: message });
      return null;
    }
  },

  getSystemStatus: async ({ silent = false } = {}) => {
    try {
      if (!silent) set({ loading: true, error: null });
      const res = await api.get("/system/status");
      set({
        systemStatus: res.data,
        hederaStatus: res.data?.hedera || null,
        loading: false,
      });
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to load system status");
      set({ loading: false, error: message });
      return null;
    }
  },

  getHederaStatus: async ({ silent = false } = {}) => {
    try {
      if (!silent) set({ loading: true, error: null });
      const res = await api.get("/hedera/status");
      set({ hederaStatus: res.data, loading: false });
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to load Hedera status");
      set({ loading: false, error: message });
      return null;
    }
  },

  getAgentTypes: async ({ silent = false } = {}) => {
    try {
      if (!silent) set({ loading: true, error: null });
      const res = await api.get("/agents/types");
      set({ agentTypes: itemsFrom(res), loading: false });
      return itemsFrom(res);
    } catch (err) {
      const message = messageFrom(err, "Failed to load agent types");
      set({ loading: false, error: message });
      return [];
    }
  },

  getUserAgents: async ({ silent = false } = {}) => {
    try {
      if (!silent) set({ loading: true, error: null });
      const res = await api.get("/agents/my");
      set({ agents: itemsFrom(res), loading: false });
      return itemsFrom(res);
    } catch (err) {
      const message = messageFrom(err, "Failed to get user agents");
      set({ loading: false, error: message });
      return [];
    }
  },

  getAgentDetails: async (agentId) => {
    try {
      set({ loading: true, error: null });
      const res = await api.get(`/agents/${agentId}`);
      set({ agentDetails: res.data, loading: false });
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to load agent details");
      set({ loading: false, error: message });
      return null;
    }
  },

  registerAgent: async (payload) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post("/agents/register", payload);
      toast.success("Agent registered", { id: "register-agent" });
      set({ loading: false });
      await get().getUserAgents({ silent: true });
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to register agent");
      set({ loading: false, error: message });
      toast.error(message, { id: "register-agent" });
      return null;
    }
  },

  linkWalletToAgent: async (payload) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post("/wallets/link", payload);
      toast.success("Hedera wallet linked", { id: "link-wallet" });
      set({ loading: false });
      await get().getUserAgents({ silent: true });
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to link Hedera wallet");
      set({ loading: false, error: message });
      toast.error(message, { id: "link-wallet" });
      return null;
    }
  },

  verifyAgent: async (agentId, payload = {}) => {
    try {
      set({ loading: true, error: null, verificationResult: null });
      const res = await api.post(`/agents/${agentId}/verify`, payload);
      set({ verificationResult: res.data, loading: false });
      const syncStatus = res.data?.hederaSyncStatus;
      toast.success(
        syncStatus === "synced"
          ? "Agent verified and synced to Hedera"
          : syncStatus === "failed"
            ? "Agent verified locally; Hedera sync needs attention"
            : "Agent verified with simulated Hedera proof",
        { id: "verify-agent" },
      );
      await get().getUserAgents({ silent: true });
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to verify agent");
      set({ loading: false, error: message });
      toast.error(message, { id: "verify-agent" });
      return null;
    }
  },

  getHederaProofHistory: async (agentId) => {
    try {
      set({ loading: true, error: null });
      const res = await api.get(`/agents/${agentId}/hedera-history`);
      set({ loading: false });
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to load Hedera proof history");
      set({ loading: false, error: message });
      return null;
    }
  },

  getAudit: async () => get().getAuditHistory(),

  getAuditHistory: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/audits/history");
      set({ loading: false, audits: itemsFrom(res) });
      return itemsFrom(res);
    } catch (err) {
      const message = messageFrom(err, "Failed to load audit history");
      set({ loading: false, error: message });
      return [];
    }
  },

  registerAudit: async (payload) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post("/audits", payload);
      toast.success("Audit registered", { id: "register-audit" });
      set({ loading: false });
      await get().getAuditHistory();
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to register audit");
      set({ loading: false, error: message });
      toast.error(message, { id: "register-audit" });
      return null;
    }
  },

  getAuditDetails: async (auditId) => {
    try {
      set({ loading: true, error: null, auditDetails: null });
      const res = await api.get(`/audits/${auditId}`);
      set({ loading: false, auditDetails: res.data });
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to load audit details");
      set({ loading: false, error: message });
      toast.error(message, { id: "audit-details" });
      return null;
    }
  },

  getTasksHistory: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/tasks/history");
      set({ loading: false, tasksHistory: itemsFrom(res) });
      return itemsFrom(res);
    } catch (err) {
      const message = messageFrom(err, "Failed to load tasks history");
      set({ loading: false, error: message });
      return [];
    }
  },

  registerTask: async (payload) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post("/tasks/request", payload);
      toast.success("Task registered", { id: "register-task" });
      set({ loading: false });
      await get().getTasksHistory();
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to register task");
      set({ loading: false, error: message });
      toast.error(message, { id: "register-task" });
      return null;
    }
  },

  payTask: async (id, payload = { currency: "HBAR" }) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post(`/tasks/${id}/pay`, payload);
      toast.success(
        res.data?.simulated ? "Simulated HBAR payment recorded" : "HBAR payment settled",
        { id: "pay-task" },
      );
      set({ loading: false });
      await get().getTransactionHistory();
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to pay for task");
      set({ loading: false, error: message });
      toast.error(message, { id: "pay-task" });
      return null;
    }
  },

  executeTask: async (id) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post(`/tasks/${id}/execute`);
      toast.success("Task executed with Hedera proof", { id: "execute-task" });
      set({ loading: false });
      await get().getTransactionHistory();
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to execute task");
      set({ loading: false, error: message });
      toast.error(message, { id: "execute-task" });
      return null;
    }
  },

  getSimulationScenarios: async ({ silent = false } = {}) => {
    try {
      if (!silent) set({ loading: true, error: null });
      const res = await api.get("/simulation/scenarios");
      set({ simulationScenarios: itemsFrom(res), loading: false });
      return itemsFrom(res);
    } catch (err) {
      const message = messageFrom(err, "Failed to load simulation scenarios");
      set({ loading: false, error: message });
      return [];
    }
  },

  runSimulation: async (payload) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post("/simulation/run", payload);
      toast.success("Simulation completed", { id: "run-simulation" });
      set({ loading: false, runSimulationData: res.data });
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to run simulation");
      set({ loading: false, error: message });
      toast.error(message, { id: "run-simulation" });
      return null;
    }
  },

  getSimulations: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/simulation/history");
      set({ loading: false, simulations: itemsFrom(res) });
      return itemsFrom(res);
    } catch (err) {
      const message = messageFrom(err, "Failed to load simulations");
      set({ loading: false, error: message });
      return [];
    }
  },

  registerTransaction: async (payload) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post("/transactions/policies", payload);
      toast.success("Transaction policy created", {
        id: "register-transaction",
      });
      set({ loading: false });
      await get().getTransactionsPolicies();
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to register transaction policy");
      set({ loading: false, error: message });
      toast.error(message, { id: "register-transaction" });
      return null;
    }
  },

  getTransactionsPolicies: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/transactions/policies");
      set({ loading: false, policies: itemsFrom(res) });
      return itemsFrom(res);
    } catch (err) {
      const message = messageFrom(err, "Failed to load transaction policies");
      set({ loading: false, error: message });
      return [];
    }
  },

  getTransactionHistory: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/transactions/history");
      const data = res.data || {};
      set({
        loading: false,
        transactions: data.items || [],
        txTotal: data.total || 0,
        highRisk: data.highRisk || 0,
        totalVolume: data.totalVolume || 0,
      });
      return data;
    } catch (err) {
      const message = messageFrom(err, "Failed to load transaction history");
      set({ loading: false, error: message });
      return null;
    }
  },

  getTransactionById: async (id) => {
    try {
      set({ loading: true, error: null });
      const res = await api.get(`/transactions/${id}`);
      set({ loading: false, transactionDetails: res.data });
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to load transaction details");
      set({ loading: false, error: message });
      return null;
    }
  },

  getAlert: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/alerts");
      set({ loading: false, alerts: itemsFrom(res) });
      return itemsFrom(res);
    } catch (err) {
      const message = messageFrom(err, "Failed to load alerts");
      set({ loading: false, error: message });
      return [];
    }
  },

  getAlertSummary: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/alerts/summary");
      set({ loading: false, alertSummary: res.data });
      return res.data;
    } catch (err) {
      const message = messageFrom(err, "Failed to load alert summary");
      set({ loading: false, error: message });
      return null;
    }
  },
}));
