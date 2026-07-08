const winston = require("winston");

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "apiKey",
  "accessToken",
  "refreshToken",
  "privateKey",
  "secretKey",
  "seedPhrase",
  "mnemonic",
  "DATABASE_URL",
  "HEDERA_OPERATOR_PRIVATE_KEY",
  "HEDERA_OPERATOR_KEY",
]);

function isSensitiveKey(key) {
  if (SENSITIVE_KEYS.has(key)) return true;

  return /^HEDERA_(MAINNET_|TESTNET_|PREVIEWNET_|LOCALNET_)?OPERATOR_(PRIVATE_)?KEY(_PATH)?$/.test(
    key,
  );
}

function redactValue(value) {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === "object") {
    for (const [key, innerValue] of Object.entries(value)) {
      value[key] = isSensitiveKey(key) ? "[REDACTED]" : redactValue(innerValue);
    }

    return value;
  }

  return value;
}

const redactSecrets = winston.format((info) => {
  redactValue(info);
  return info;
})();

const developmentFormat = winston.format.printf((info) => {
  const { level, message, timestamp, service, env, ...meta } = info;
  const details = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";

  return `${level}: ${message}${details}`;
});

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: {
    service: "agentity-server",
    env: process.env.NODE_ENV || "development",
  },
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    redactSecrets,
    process.env.NODE_ENV === "production" ? productionFormat : developmentFormat,
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
