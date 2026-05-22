const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Agentity AI Trust Platform API",
      version: "1.0.0",
      description:
        "Agentity backend APIs for Hedera-backed AI agent identity, simulation, payment, execution, and audit proofs. Protected routes accept Supabase JWTs and the agentity_jwt cookie. Task endpoints also accept active agty_live integration API keys in the Bearer header.",
    },
    servers: [
      { url: "http://localhost:5000", description: "Local" },
      { url: "https://your-agentity-api.example.com", description: "Production" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        cookieAuth: { type: "apiKey", in: "cookie", name: "agentity_jwt" },
      },
    },
  },
  apis: ["./src/routes/*.js"], // reads JSDoc OpenAPI blocks from your route files
};

module.exports = swaggerJSDoc(options);
