// src/controllers/admin/admin.routes.js
const express = require("express");
const router = express.Router();
const pool = require("../../db");
const logger = require("../utils/logger");
const {
  createNotification,
  getUserNotifications,
  markNotificationRead,
  notifyUserStatus,
} = require("../utils/notificationHelper");


// --- Admin: Update user/organizer status ---
router.put("/user/:userId/status", async (req, res) => {
  const { userId } = req.params;
  let { status } = req.body; // expected: "active" | "rejected"

  logger.info('API: Update user status request received', { userId, status });

  if (status === "rejected") status = "inactive"; // map rejected to inactive
  if (!["active", "inactive"].includes(status)) {
    logger.warn('API: Invalid status provided', { userId, status });
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const result = await pool.query(
      "UPDATE users SET status=$1 WHERE user_id=$2 RETURNING *",
      [status, userId]
    );

    if (result.rows.length === 0) {
      logger.warn('API: User not found for status update', { userId });
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    // Send notification about status update
    await notifyUserStatus(user.user_id, status);

    logger.info('API: User status updated successfully', { userId, status });

    res
      .status(200)
      .json({ message: "User status updated", user: result.rows[0] });
  } catch (err) {
    logger.error("API: Error updating user status", { userId, status, error: err.message });
    res.status(400).json({
      error: "Failed to update user status",
      details: err.message
    });
  }
});

// --- Admin: Delete user/organizer ---
router.delete("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM users WHERE user_id=$1 RETURNING *",
      [userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    res
      .status(200)
      .json({ message: "User deleted", deletedUser: result.rows[0] });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// --- Notification routes ---
// Get all notifications for a user
router.get("/notifications/user/:userId", async (req, res) => {
  const { userId } = req.params;

  logger.info('API: Get notifications request', { userId });

  try {
    const notifications = await getUserNotifications(parseInt(userId));
    logger.info('API: Notifications retrieved successfully', { userId, count: notifications.length });
    res.json(notifications);
  } catch (err) {
    logger.error("API: Error fetching notifications", { userId, error: err.message });
    res.status(400).json({
      error: "Failed to fetch notifications",
      details: err.message
    });
  }
});

// Mark a notification as read
router.put("/notifications/:id/read", async (req, res) => {
  const { id } = req.params;

  logger.info('API: Mark notification as read request', { notification_id: id });

  try {
    const notif = await markNotificationRead(parseInt(id));
    logger.info('API: Notification marked as read successfully', { notification_id: id });
    res.json(notif);
  } catch (err) {
    logger.error("API: Error updating notification", { notification_id: id, error: err.message });
    res.status(400).json({
      error: "Failed to update notification",
      details: err.message
    });
  }
});

// --- Monitoring endpoints ---
// Get all notification logs
router.get("/logs/notifications", async (req, res) => {
  try {
    const logs = logger.getAllLogs();
    logger.info('API: Logs retrieved', { count: logs.length });
    res.json({
      total_logs: logs.length,
      logs
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// Get logs for specific user
router.get("/logs/user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const logs = logger.getUserLogs(parseInt(userId));
    logger.info('API: User logs retrieved', { userId, count: logs.length });
    res.json({
      user_id: parseInt(userId),
      total_logs: logs.length,
      logs
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user logs" });
  }
});

module.exports = router;
