const UserAgentEvent = require("../../models/userAgentEvent");

async function logEvent(
  req,
  { action, agentId = null, payload = null, transaction = null } = {},
) {
  if (!req?.user?.id || !action) return null;

  return UserAgentEvent.create(
    {
      user_id: req.user.id,
      agent_id: agentId,
      action,
      payload,
      ip: req.ip || null,
      user_agent: req.get("user-agent") || null,
      created_at: new Date(),
    },
    transaction ? { transaction } : {},
  );
}

module.exports = { logEvent };
