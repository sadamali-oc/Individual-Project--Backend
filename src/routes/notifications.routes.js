// src/controllers/admin/admin.routes.js
const express = require("express");
const router = express.Router();
const pool = require("../../db");
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

  if (status === "rejected") status = "inactive"; // map rejected to inactive
  if (!["active", "inactive"].includes(status))
    return res.status(400).json({ error: "Invalid status" });

  try {
    const result = await pool.query(
      "UPDATE users SET status=$1 WHERE user_id=$2 RETURNING *",
      [status, userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = result.rows[0];

    // Send notification about status update
    await notifyUserStatus(user.user_id, status);

    res
      .status(200)
      .json({ message: "User status updated", user: result.rows[0] });
  } catch (err) {
    console.error("Error updating user status:", err);
    res.status(500).json({ error: "Failed to update user status" });
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
  try {
    const notifications = await getUserNotifications(userId);
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark a notification as read
router.put("/notifications/:id/read", async (req, res) => {
  const { id } = req.params;
  try {
    const notif = await markNotificationRead(id);
    res.json(notif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

module.exports = router;
