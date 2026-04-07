const { Pool } = require("pg");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://organote:organote@localhost:15432/organote";

const isLocalConnection = /localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: isLocalConnection ? false : { rejectUnauthorized: false },
});

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Database connected successfully");
  }
});

module.exports = pool;
