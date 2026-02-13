const pool = require("./db");

async function createAuditLogsTable() {
  try {
    console.log("Creating audit_logs table...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        log_id SERIAL PRIMARY KEY,
        actor_user_id INT,
        actor_role VARCHAR(50),
        action_type VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id INT,
        resource_name VARCHAR(255),
        status VARCHAR(20) NOT NULL,
        denial_reason VARCHAR(255),
        ip_address VARCHAR(45),
        old_values JSONB,
        new_values JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        details TEXT
      );
    `);

    console.log("✓ audit_logs table created successfully");

    // Create indexes for better query performance
    console.log("Creating indexes...");
    try {
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id);"
      );
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action_type);"
      );
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);"
      );
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);"
      );
      console.log("✓ Indexes created successfully");
    } catch (indexError) {
      console.log("⚠ Indexes may already exist:", indexError.message);
    }

    console.log("\n✅ Database migration complete!\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating audit_logs table:", error.message);
    process.exit(1);
  }
}

createAuditLogsTable();
