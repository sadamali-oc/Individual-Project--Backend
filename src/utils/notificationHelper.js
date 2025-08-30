const pool = require("../../db");

// --- Send a notification ---
const createNotification = async (user_id, message, event_id = null) => {
  try {
    const result = await pool.query(
      "INSERT INTO notifications (user_id, message, event_id) VALUES ($1, $2, $3) RETURNING *",
      [user_id, message, event_id]
    );
    return result.rows[0];
  } catch (err) {
    console.error("Notification error:", err);
    throw err;
  }
};

// --- Get all notifications for a user ---
const getUserNotifications = async (user_id) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC",
      [user_id]
    );
    return result.rows;
  } catch (err) {
    console.error("Get notifications error:", err);
    throw err;
  }
};

// --- Mark a notification as read ---
const markNotificationRead = async (notification_id) => {
  try {
    const result = await pool.query(
      "UPDATE notifications SET is_read=TRUE WHERE notification_id=$1 RETURNING *",
      [notification_id]
    );
    return result.rows[0];
  } catch (err) {
    console.error("Mark as read error:", err);
    throw err;
  }
};

// --- Optional helper: notify user about approval/rejection ---
const notifyUserStatus = async (user_id, status) => {
  try {
    const message =
      status === "active"
        ? "Your account has been approved. Welcome aboard!"
        : "Your account has been rejected. Please contact admin for details.";

    return await createNotification(user_id, message);
  } catch (err) {
    console.error("Notify user status error:", err);
    throw err;
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationRead,
  notifyUserStatus, // added helper for approvals/rejections
};
