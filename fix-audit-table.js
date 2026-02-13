const pool = require("./db");

async function fixAuditLogsTable() {
  try {
    console.log("Fixing audit_logs table...\n");

    // Drop existing table if it exists
    console.log("Dropping existing audit_logs table...");
    await pool.query("DROP TABLE IF EXISTS audit_logs CASCADE;");
    console.log("✓ Table dropped\n");

    // Create the correct table
    console.log("Creating audit_logs table with correct schema...");
    await pool.query(`
      CREATE TABLE audit_logs (
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
    console.log("✓ audit_logs table created successfully\n");

    // Create indexes
    console.log("Creating indexes...");
    await pool.query(
      "CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id);"
    );
    await pool.query(
      "CREATE INDEX idx_audit_action ON audit_logs(action_type);"
    );
    await pool.query(
      "CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);"
    );
    await pool.query(
      "CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);"
    );
    console.log("✓ Indexes created successfully\n");

    // Verify the table
    console.log("Verifying table structure...");
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs' 
      ORDER BY ordinal_position;
    `);
    
    console.log("\n✓ Table structure:");
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log("\n✅ Audit logs table fixed successfully!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing audit_logs table:", error.message);
    process.exit(1);
  }
}

fixAuditLogsTable();
