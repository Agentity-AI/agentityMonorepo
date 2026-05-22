const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Agent = require("./agent");

const AgentReputation = sequelize.define("AgentReputation", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  score: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
  },
  risk_level: {
    type: DataTypes.STRING,
    defaultValue: "low",
  },
}, {
  timestamps: true,
});

Agent.hasOne(AgentReputation, { foreignKey: "agent_id" });
AgentReputation.belongsTo(Agent, { foreignKey: "agent_id" });

module.exports = AgentReputation;
