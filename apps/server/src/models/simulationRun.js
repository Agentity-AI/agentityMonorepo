const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SimulationRun = sequelize.define(
  "SimulationRun",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    agent_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    scenario_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    risk_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    vulnerabilities_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("pending", "completed", "failed"),
      allowNull: false,
      defaultValue: "completed",
    },
    result_payload: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "simulation_runs",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id"] },
      { fields: ["agent_id"] },
      { fields: ["scenario_type"] },
      { fields: ["created_at"] },
    ],
  }
);

module.exports = SimulationRun;