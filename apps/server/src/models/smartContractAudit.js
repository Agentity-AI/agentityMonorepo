const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SmartContractAudit = sequelize.define(
  "SmartContractAudit",
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
    contract_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    source_type: {
      type: DataTypes.ENUM("paste", "github"),
      allowNull: false,
    },
    source_code: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    github_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    risk_level: {
      type: DataTypes.ENUM("safe", "low", "medium", "high"),
      allowNull: false,
      defaultValue: "low",
    },
    consensus_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 80,
    },
    status: {
      type: DataTypes.ENUM("pending", "completed", "failed"),
      allowNull: false,
      defaultValue: "completed",
    },
    findings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    result_payload: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "smart_contract_audits",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id"] },
      { fields: ["contract_name"] },
      { fields: ["status"] },
      { fields: ["created_at"] },
    ],
  },
);

module.exports = SmartContractAudit;
