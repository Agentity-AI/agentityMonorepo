require("dotenv").config();
const sequelize = require("./database");

async function syncDatabase() {
  try {
    await sequelize.sync({ alter: true });
    console.log("Database synced successfully.");
    process.exit();
  } catch (error) {
    console.error("Database sync failed:", error);
    process.exit(1);
  }
}

syncDatabase();
