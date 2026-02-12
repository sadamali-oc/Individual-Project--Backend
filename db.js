const Pool = require("pg").Pool;
require("dotenv").config();
 const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "event_db",
  password: "2001",
  port: 5432,
});

module.exports = pool;
