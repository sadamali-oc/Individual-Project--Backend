const pool = require("../../db");

/**
 * Audit Logger Utility
 * Logs all security-relevant operations:
 * - Successful event CREATE/UPDATE/DELETE
 * - Failed attempts (RBAC, ownership, auth denials)
 * 
 * Usage:
 * await auditLogger.log({
 *   actor_user_id: req.user.id,
 *   actor_role: req.user.role,
 *   action_type: 'CREATE_EVENT',
 *   resource_type: 'event',
 *   resource_id: event.event_id,
 *   resource_name: event.event_name,
 *   status: 'success',
 *   ip_address: req.ip,
 *   old_values: null,
 *   new_values: { event_name: 'Tech Meetup' }
 * })
 */
const auditLogger = {
  async log(logData) {
    try {
      const {
        actor_user_id,
        actor_role,
        action_type,
        resource_type,
        resource_id,
        resource_name,
        status,
        denial_reason,
        ip_address,
        old_values,
        new_values,
        details,
      } = logData;

      console.log(
        `[AUDIT] ${action_type} by user ${actor_user_id} - ${status}`
      );

      await pool.query(
        `INSERT INTO audit_logs 
        (actor_user_id, actor_role, action_type, resource_type, resource_id, 
         resource_name, status, denial_reason, ip_address, old_values, 
         new_values, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          actor_user_id,
          actor_role,
          action_type,
          resource_type,
          resource_id,
          resource_name,
          status,
          denial_reason || null,
          ip_address,
          old_values ? JSON.stringify(old_values) : null,
          new_values ? JSON.stringify(new_values) : null,
          details || null,
        ]
      );
    } catch (error) {
      console.error("[AUDIT] Error logging operation:", error.message);
    }
  },

  async getLogsForUser(userId) {
    try {
      const result = await pool.query(
        "SELECT * FROM audit_logs WHERE actor_user_id = $1 ORDER BY timestamp DESC LIMIT 100",
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error("[AUDIT] Error fetching logs:", error.message);
      return [];
    }
  },

  async getDeniedAttempts() {
    try {
      const result = await pool.query(
        "SELECT * FROM audit_logs WHERE status = 'denied' ORDER BY timestamp DESC LIMIT 50"
      );
      return result.rows;
    } catch (error) {
      console.error("[AUDIT] Error fetching denied attempts:", error.message);
      return [];
    }
  },
};

module.exports = auditLogger;
