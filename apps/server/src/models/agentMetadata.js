const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Agent = require("./agent");

const AgentMetadata = sequelize.define("AgentMetadata", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  model_name: DataTypes.STRING,
  version: DataTypes.STRING,
  execution_environment: DataTypes.STRING,
}, {
  timestamps: true,
});

Agent.hasOne(AgentMetadata, { foreignKey: "agent_id" });
AgentMetadata.belongsTo(Agent, { foreignKey: "agent_id" });

module.exports = AgentMetadata;
