require("dotenv").config({ quiet: true });

const app = require("./app");
const logger = require("./config/logger");

const PORT = process.env.PORT || 5000;
const DB_SYNC_ON_START = process.env.DB_SYNC_ON_START === "true";
let sequelize;

function getDatabase() {
  if (!sequelize) {
    sequelize = require("./config/database");
    require("./models");
  }

  return sequelize;
}

function setDatabaseStatus(status, details = {}) {
  app.locals.databaseStatus = {
    ...(app.locals.databaseStatus || {}),
    status,
    checkedAt: new Date().toISOString(),
    syncOnStart: DB_SYNC_ON_START,
    ...details,
  };
}

async function connectDatabase() {
  try {
    const sequelize = getDatabase();

    await sequelize.authenticate();
    logger.info({ message: "Database connected successfully." });

    if (DB_SYNC_ON_START) {
      setDatabaseStatus("syncing", { error: null, syncStatus: "running" });
      await sequelize.sync();
      logger.info({ message: "Database synced." });
    }

    setDatabaseStatus("connected", {
      error: null,
      syncStatus: DB_SYNC_ON_START ? "completed" : "skipped",
    });
  } catch (error) {
    const dbError = {
      name: error.name,
      message: error.message,
      code: error.code,
    };

    setDatabaseStatus("disconnected", {
      error: dbError,
      syncStatus: DB_SYNC_ON_START ? "failed" : "skipped",
    });
    logger.error({ message: "Database initialization failed", error: dbError });
  }
}

function startServer() {
  setDatabaseStatus("initializing", {
    error: null,
    syncStatus: DB_SYNC_ON_START ? "pending" : "skipped",
  });

  const server = app.listen(PORT, () => {
    logger.info({ message: `Server running on port ${PORT}` });
  });

  server.on("error", (error) => {
    logger.error({ message: "HTTP server failed", error });
    process.exit(1);
  });

  void connectDatabase();
}

startServer();
