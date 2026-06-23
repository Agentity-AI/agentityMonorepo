const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const logger = require("./config/logger");

const app = express();

app.locals.databaseStatus = {
  status: "not_started",
  checkedAt: null,
  error: null,
  syncOnStart: false,
  syncStatus: "skipped",
};

function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

const configuredOrigins = [
  ...parseOrigins(process.env.CORS_ORIGINS),
  ...parseOrigins(process.env.CLIENT_URL),
  ...parseOrigins(process.env.PUBLIC_CLIENT_URL),
  ...parseOrigins(process.env.FRONTEND_URL),
];

const localOrigins =
  process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:3000", "http://localhost:5173"];

const allowedOrigins = [...new Set([...configuredOrigins, ...localOrigins])];
const allowUnconfiguredOrigins =
  process.env.NODE_ENV !== "production" &&
  process.env.CORS_ALLOW_UNCONFIGURED === "true";

function lazyMiddleware(loadMiddleware) {
  let middleware;

  return (req, res, next) => {
    try {
      middleware ||= loadMiddleware();
      return middleware(req, res, next);
    } catch (error) {
      return next(error);
    }
  };
}

function lazyRoute(loadRoute) {
  return lazyMiddleware(loadRoute);
}

app.use(
  cors({
    origin(origin, cb) {
      // Non-browser clients often send no Origin header.
      if (!origin) {
        return cb(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      if (allowUnconfiguredOrigins) {
        return cb(null, true);
      }

      return cb(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

app.use(cookieParser());

app.get("/health", async (req, res) => {
  const databaseStatus = req.app.locals.databaseStatus || {
    status: "unknown",
    checkedAt: null,
    error: null,
  };
  const databaseReady = databaseStatus.status === "connected";

  return res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "healthy" : "starting",
    database: databaseStatus.status,
    databaseCheckedAt: databaseStatus.checkedAt,
    databaseSyncStatus: databaseStatus.syncStatus,
    databaseSyncOnStart: databaseStatus.syncOnStart,
    databaseError: databaseStatus.error,
    uptime: process.uptime(),
  });
});

app.use(
  lazyMiddleware(() => require("./middleware/auth").optionalAuth),
);

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    logger.info({
      message: "HTTP request completed",
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      userId: req.user?.id || null,
    });
  });

  next();
});

app.use("/auth", lazyRoute(() => require("./routes/auth")));
app.use("/agents", lazyRoute(() => require("./routes/agents")));
app.use("/simulation", lazyRoute(() => require("./routes/simulation")));
app.use("/execute", lazyRoute(() => require("./routes/execution")));
app.use("/dashboard", lazyRoute(() => require("./routes/dashboard")));
app.use("/docs", lazyRoute(() => require("./routes/docs")));
app.use("/audits", lazyRoute(() => require("./routes/audits")));
app.use("/wallets", lazyRoute(() => require("./routes/wallets")));
app.use("/tasks", lazyRoute(() => require("./routes/tasks")));
app.use("/payments", lazyRoute(() => require("./routes/payments")));
app.use("/workflow", lazyRoute(() => require("./routes/workflow")));
app.use("/alerts", lazyRoute(() => require("./routes/alerts")));
app.use("/transactions", lazyRoute(() => require("./routes/transactions")));
app.use("/system", lazyRoute(() => require("./routes/system")));
app.use("/settings", lazyRoute(() => require("./routes/settings")));
app.use("/integrations", lazyRoute(() => require("./routes/integrations")));
app.use("/hedera", lazyRoute(() => require("./routes/hedera")));

/**
 * 404 handler.
 */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/**
 * Global error handler.
 */
app.use((err, req, res, next) => {
  logger.error({
    message: "Unhandled application error",
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id || null,
    },
  });

  res.status(500).json({ message: "Internal Server Error" });
});

module.exports = app;
