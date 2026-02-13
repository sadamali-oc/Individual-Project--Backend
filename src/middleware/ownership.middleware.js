const pool = require("../../db");
const auditLogger = require("../utils/auditLogger");

/**
 * Ownership Validation Middleware
 * Ensures user can only modify/delete their own events
 * Admins can bypass this check and modify any event
 * 
 * Requires:
 * - verifyJWT to have run first (expects req.user to be set)
 * - Event ID to be in req.params.eventId
 * 
 * Returns:
 * - 404 Not Found: Event doesn't exist
 * - 403 Forbidden: User is not the event owner (unless admin)
 * 
 * Usage:
 * router.put('/events/:eventId/progress', verifyJWT, requireRole(['organizer', 'admin']), checkEventOwnership, controller.updateEventProgress)
 */
const checkEventOwnership = async (req, res, next) => {
  try {
    // Verify user object exists (verifyJWT should have set it)
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User information not found. Please authenticate first.",
      });
    }

    const eventId = req.params.eventId;
    if (!eventId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Event ID is required in request parameters",
      });
    }

    // Fetch the event from database
    const eventResult = await pool.query(
      "SELECT event_id, user_id, event_name FROM events WHERE event_id = $1",
      [eventId]
    );

    // Check if event exists
    if (eventResult.rows.length === 0) {
      console.log(`[OWNERSHIP] Event ${eventId} not found`);
      return res.status(404).json({
        error: "Not Found",
        message: `Event with ID ${eventId} does not exist`,
      });
    }

    const event = eventResult.rows[0];
    const eventOwnerId = event.user_id;
    const requestUserId = req.user.id;
    const userRole = req.user.role?.toLowerCase();

    console.log(
      `[OWNERSHIP] Event: ${event.event_name} (ID: ${event.event_id}), Owner: ${eventOwnerId}, Requester: ${requestUserId}, Role: ${userRole}`
    );

    // ✅ Admin bypass: Admins can modify any event
    if (userRole === "admin") {
      console.log(`[OWNERSHIP] Admin ${requestUserId} granted access to event ${eventId}`);
      req.eventOwner = eventOwnerId; // Attach event owner info for audit logging
      return next();
    }

    // ✅ Ownership check: Organizer can only modify their own events
    if (eventOwnerId !== requestUserId) {
      console.log(
        `[OWNERSHIP] DENIED: User ${requestUserId} tried to modify event ${eventId} owned by ${eventOwnerId}`
      );

      // ✅ LOG OWNERSHIP DENIAL
      await auditLogger.log({
        actor_user_id: requestUserId,
        actor_role: userRole,
        action_type: "OWNERSHIP_DENIED",
        resource_type: "event",
        resource_id: eventId,
        resource_name: event.event_name,
        status: "denied",
        denial_reason: `User ${requestUserId} is not the event owner (owned by ${eventOwnerId})`,
        ip_address: req.ip,
        details: `Attempted to modify event owned by another organizer`,
      });

      return res.status(403).json({
        error: "Forbidden",
        message: `You do not have permission to modify this event. This event belongs to user ${eventOwnerId}.`,
      });
    }

    console.log(`[OWNERSHIP] Owner ${requestUserId} granted access to event ${eventId}`);
    req.eventOwner = eventOwnerId; // Attach event owner info for audit logging
    next();
  } catch (error) {
    console.error("[OWNERSHIP] Error checking event ownership:", error.message);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Error verifying event ownership",
      details: error.message,
    });
  }
};

module.exports = {
  checkEventOwnership,
};
