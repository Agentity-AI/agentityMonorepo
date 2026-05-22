const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AgentHederaRegistry = sequelize.define(
  "AgentHederaRegistry",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    agent_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    registry_topic_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Hedera Consensus Service topic used for agent proofs",
    },
    registration_transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    registration_topic_sequence_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    proof_hash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    current_score: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    current_risk_level: {
      type: DataTypes.STRING,
      defaultValue: "unknown",
    },
    last_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    verification_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("registered", "verified", "flagged", "suspended"),
      defaultValue: "registered",
    },
    network: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "testnet",
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "agent_hedera_registry",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["agent_id"] },
      { fields: ["registration_transaction_id"] },
      { fields: ["status"] },
      { fields: ["network"] },
    ],
  },
);

module.exports = AgentHederaRegistry;
