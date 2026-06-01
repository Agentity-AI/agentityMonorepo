const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

require("dotenv").config({ quiet: true });

const migrationPath = path.join(
  __dirname,
  "..",
  "db",
  "migrations",
  "001_hedera_schema_migration.sql",
);

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to apply the Hedera schema migration.");
  }

  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await client.query(sql);
    console.log("Hedera schema migration applied.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
