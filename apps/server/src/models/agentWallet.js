const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AgentWallet = sequelize.define(
  "AgentWallet",
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
    hedera_account_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    hedera_public_key: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    network: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "testnet",
    },
    wallet_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "agent",
    },
    kms_key_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("linked", "inactive"),
      allowNull: false,
      defaultValue: "linked",
    },
  },
  {
    tableName: "agent_wallets",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["agent_id"] },
      { fields: ["hedera_account_id"] },
      { fields: ["network"] },
    ],
  },
);

module.exports = AgentWallet;
