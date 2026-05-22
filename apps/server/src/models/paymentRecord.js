const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PaymentRecord = sequelize.define(
  "PaymentRecord",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    from_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    to_agent_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    task_execution_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(30, 9),
      allowNull: false,
    },
    amount_atomic: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "HBAR",
    },
    token_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    token_decimals: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 8,
    },
    hedera_transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    payment_reference: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("quoted", "pending", "paid", "failed"),
      allowNull: false,
      defaultValue: "quoted",
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "payment_records",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["from_user_id"] },
      { fields: ["to_agent_id"] },
      { fields: ["task_execution_id"] },
      { fields: ["status"] },
      { fields: ["currency"] },
      { fields: ["hedera_transaction_id"] },
      { fields: ["created_at"] },
    ],
  }
);

module.exports = PaymentRecord;
