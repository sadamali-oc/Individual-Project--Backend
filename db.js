import { Pool } from "pg";
// JWT_SECRET="yoursecretkey"


 const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "users",
  password: "2001",
  port: 5432,
});

export default pool;
