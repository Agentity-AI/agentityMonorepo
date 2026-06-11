const Alert = require("../../models/alert");
const { normalizeSeverity } = require("./alertUtils");

async function createAlert({
  userId,
  agentId = null,
  title,
  severity = "medium",
  type,
  status = "active",
  sourceId = null,
  sourceType = null,
  message,
  metadata = null,
}) {
  if (!userId || !title || !type || !message) {
    return null;
  }

  return Alert.create({
    user_id: userId,
    agent_id: agentId,
    title,
    severity: normalizeSeverity(severity),
    type,
    status,
    source_id: sourceId,
    source_type: sourceType,
    message,
    metadata,
  });
}

async function createMonitoringAlert(payload) {
  try {
    return await createAlert(payload);
  } catch (error) {
    console.error("[alerts] Failed to create monitoring alert:", error.message);
    return null;
  }
}

function formatAlert(alert) {
  return {
    id: alert.id,
    userId: alert.user_id,
    agentId: alert.agent_id,
    title: alert.title,
    severity: alert.severity,
    type: alert.type,
    status: alert.status,
    sourceId: alert.source_id,
    sourceType: alert.source_type,
    message: alert.message,
    metadata: alert.metadata,
    actionLinks: {
      resolve: `/alerts/${alert.id}/status`,
      dismiss: `/alerts/${alert.id}/status`,
    },
    createdAt: alert.created_at,
    updatedAt: alert.updated_at,
  };
}

module.exports = {
  createAlert,
  createMonitoringAlert,
  formatAlert,
};
