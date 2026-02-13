// const Pool = require("pg").Pool;
// require("dotenv").config();
//  const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "event_db",
//   password: "2001",
//   port: 5432,
// });

// module.exports = pool;


const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,


});

module.exports = pool;

