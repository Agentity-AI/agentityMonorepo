const UserAgentEvent = require("../../models/userAgentEvent");

async function logUserAgentEvent({ req, action, agentId = null, payload = null }) {
  if (!req.user?.id) return null; // only log if user is authenticated

  return UserAgentEvent.create({
    user_id: req.user.id,
    agent_id: agentId,
    action,
    payload,
    ip: req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip,
    user_agent: req.headers["user-agent"] || null,
  });
}

module.exports = { logUserAgentEvent };