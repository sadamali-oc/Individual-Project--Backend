/**
 * RBAC (Role-Based Access Control) Middleware Factory
 * Enforces role-based restrictions
 * Requires verifyJWT to have run first (expects req.user.role to be set)
 * 
 * Usage:
 * router.post('/create-event', verifyJWT, requireRole(['organizer', 'admin']), controller.createEvent)
 * 
 * Returns:
 * - 403 Forbidden: User lacks required role
 */
const auditLogger = require("../utils/auditLogger");

const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Verify user object exists (verifyJWT should have set it)
      if (!req.user) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "User information not found. Please authenticate first.",
        });
      }

      // Get user role and normalize to lowercase for comparison
      const userRole = req.user.role?.toLowerCase();

      // Normalize allowed roles to lowercase for case-insensitive comparison
      const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

      // Check if user role is in allowed roles
      if (!normalizedAllowedRoles.includes(userRole)) {
        // ✅ LOG RBAC DENIAL
        await auditLogger.log({
          actor_user_id: req.user.id,
          actor_role: req.user.role,
          action_type: "RBAC_DENIED",
          resource_type: "event",
          status: "denied",
          denial_reason: `Required roles: ${allowedRoles.join(", ")}. User role: ${req.user.role}`,
          ip_address: req.ip,
          details: `Attempted access: ${req.originalUrl}`,
        });

        return res.status(403).json({
          error: "Forbidden",
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Error checking user role",
      });
    }
  };
};

module.exports = {
  requireRole,
};
