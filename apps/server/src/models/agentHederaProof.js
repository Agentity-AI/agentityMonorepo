const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AgentHederaProof = sequelize.define(
  "AgentHederaProof",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    agent_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    topic_sequence_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    proof_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    proof_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    proof_payload: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    memo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    is_healthy: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    score_delta: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    network: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "mainnet",
    },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "simulated", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    tableName: "agent_hedera_proofs",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["agent_id"] },
      { fields: ["transaction_id"] },
      { fields: ["proof_type"] },
      { fields: ["proof_hash"] },
      { fields: ["created_at"] },
    ],
  },
);

module.exports = AgentHederaProof;
