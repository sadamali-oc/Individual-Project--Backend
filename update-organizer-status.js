const pool = require("./db");

async function updateOrganizerStatus() {
  try {
    console.log("Updating organizer status to 'active'...");
    
    // Update all organizers to active
    const updateResult = await pool.query(
      "UPDATE users SET status = 'active' WHERE role = 'organizer' RETURNING user_id, email, role, status"
    );
    
    console.log(`\n✓ Updated ${updateResult.rows.length} organizer(s) to active status:\n`);
    updateResult.rows.forEach(row => {
      console.log(`  - ${row.email} (ID: ${row.user_id}) - Role: ${row.role}, Status: ${row.status}`);
    });
    
    // Show all users for reference
    const allUsers = await pool.query(
      "SELECT user_id, email, role, status FROM users ORDER BY user_id"
    );
    
    console.log(`\n\nAll users in database:\n`);
    allUsers.rows.forEach(row => {
      console.log(`  - ${row.email} (ID: ${row.user_id}) - Role: ${row.role}, Status: ${row.status}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

updateOrganizerStatus();
