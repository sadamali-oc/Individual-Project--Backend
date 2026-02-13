const pool = require("../../db");
const logger = require("./logger");
const nodemailer = require('nodemailer');
require('dotenv').config();

// --- Data Integrity Checks ---
const validateNotificationData = (user_id, message, event_id = null) => {
  if (!user_id || typeof user_id !== 'number' || user_id <= 0) {
    const error = 'Invalid user_id: must be a positive number';
    logger.logValidationError('user_id', user_id, error);
    throw new Error(error);
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    const error = 'Invalid message: must be non-empty string';
    logger.logValidationError('message', message, error);
    throw new Error(error);
  }
  if (message.length > 1000) {
    const error = 'Message too long: maximum 1000 characters allowed';
    logger.logValidationError('message', message.length, error);
    throw new Error(error);
  }
  if (event_id !== null && (typeof event_id !== 'number' || event_id <= 0)) {
    const error = 'Invalid event_id: must be null or positive number';
    logger.logValidationError('event_id', event_id, error);
    throw new Error(error);
  }
  return true;
};

const validateUserExists = async (user_id) => {
  try {
    const result = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [user_id]);
    if (result.rows.length === 0) {
      throw new Error(`User with id ${user_id} does not exist`);
    }
    return true;
  } catch (error) {
    throw new Error(`User validation failed: ${error.message}`);
  }
};

// --- Send a notification ---
const createNotification = async (user_id, message, event_id = null) => {
  // Validate input data
  validateNotificationData(user_id, message, event_id);

  // Validate user exists
  await validateUserExists(user_id);

  try {
    logger.info('Creating notification', { user_id, message_length: message.length, event_id });

    // Insert into notifications table (match current schema: user_id, title?, message, is_read, created_at)
    const result = await pool.query(
      "INSERT INTO notifications (user_id, message) VALUES ($1, $2) RETURNING *",
      [user_id, message]
    );

    const notification = result.rows[0];
    logger.logDatabaseOperation('INSERT', 'notifications', 'SUCCESS', {
      user_id,
      notification_id: notification.notification_id,
      message_length: message.length
    });

    return notification;
  } catch (err) {
    logger.error('Notification creation error', {
      user_id,
      error_message: err.message,
      error_code: err.code
    });
    throw new Error(`Failed to create notification: ${err.message}`);
  }
};

// --- Send email via SMTP ---
const sendEmailNotification = async (user_id, subject, text) => {
  try {
    const userRes = await pool.query('SELECT email FROM users WHERE user_id=$1', [user_id]);
    if (userRes.rows.length === 0) {
      logger.warn('sendEmailNotification: user has no email', { user_id });
      return null;
    }
    const to = userRes.rows[0].email;
    if (!to) {
      logger.warn('sendEmailNotification: user email empty', { user_id });
      return null;
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logger.warn('sendEmailNotification: email credentials not set');
      return null;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent', { user_id, to, messageId: info.messageId });
    return info;
  } catch (err) {
    logger.error('sendEmailNotification error', { user_id, error: err.message });
    return null;
  }
};

// --- Redundant send: in-app + optional email ---
const sendNotification = async (user_id, message, options = {}) => {
  const { sendEmail = false, emailSubject = 'Notification' } = options;
  const result = { notification: null, email: null };
  try {
    result.notification = await createNotification(user_id, message, options.event_id || null);
  } catch (err) {
    logger.error('sendNotification: in-app notification failed', { user_id, error: err.message });
  }

  if (sendEmail) {
    try {
      result.email = await sendEmailNotification(user_id, emailSubject, message);
    } catch (err) {
      logger.error('sendNotification: email send failed', { user_id, error: err.message });
    }
  }

  return result;
};

// --- Get all notifications for a user ---
const getUserNotifications = async (user_id) => {
  // Validate user_id
  if (!user_id || typeof user_id !== 'number' || user_id <= 0) {
    logger.logValidationError('user_id', user_id, 'Invalid user_id');
    throw new Error('Invalid user_id: must be a positive number');
  }

  // Validate user exists
  await validateUserExists(user_id);

  try {
    logger.info('Fetching notifications for user', { user_id });

    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC",
      [user_id]
    );

    logger.logDatabaseOperation('SELECT', 'notifications', 'SUCCESS', {
      user_id,
      count: result.rows.length
    });

    return result.rows;
  } catch (err) {
    logger.error('Get notifications error', {
      user_id,
      error_message: err.message
    });
    throw new Error(`Failed to get notifications: ${err.message}`);
  }
};

// --- Mark a notification as read ---
const markNotificationRead = async (notification_id) => {
  // Validate notification_id
  if (!notification_id || typeof notification_id !== 'number' || notification_id <= 0) {
    logger.logValidationError('notification_id', notification_id, 'Invalid notification_id');
    throw new Error('Invalid notification_id: must be a positive number');
  }

  try {
    logger.info('Marking notification as read', { notification_id });

    const result = await pool.query(
      "UPDATE notifications SET is_read=TRUE WHERE notification_id=$1 RETURNING *",
      [notification_id]
    );

    if (result.rows.length === 0) {
      logger.warn('Notification not found', { notification_id });
      throw new Error(`Notification with id ${notification_id} not found`);
    }

    logger.logDatabaseOperation('UPDATE', 'notifications', 'SUCCESS', {
      notification_id,
      is_read: true
    });

    return result.rows[0];
  } catch (err) {
    logger.error('Mark as read error', {
      notification_id,
      error_message: err.message
    });
    throw new Error(`Failed to mark notification as read: ${err.message}`);
  }
};

// --- Optional helper: notify user about approval/rejection ---
const notifyUserStatus = async (user_id, status) => {
  // Validate status
  if (!status || typeof status !== 'string') {
    logger.logValidationError('status', status, 'Invalid status: must be a string');
    throw new Error('Invalid status: must be a string');
  }

  if (!['active', 'inactive', 'rejected'].includes(status)) {
    logger.logValidationError('status', status, 'Invalid status value');
    throw new Error('Invalid status: must be active, inactive, or rejected');
  }

  try {
    logger.info('Notifying user of status change', { user_id, status });

    const message =
      status === "active"
        ? "Your account has been approved. Welcome aboard!"
        : "Your account has been rejected. Please contact admin for details.";

    const result = await createNotification(user_id, message);

    logger.info('User status notification sent successfully', { user_id, status });

    return result;
  } catch (err) {
    logger.error('Notify user status error', {
      user_id,
      status,
      error_message: err.message
    });
    throw new Error(`Failed to notify user status: ${err.message}`);
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationRead,
  notifyUserStatus, // added helper for approvals/rejections
  sendNotification,
  sendEmailNotification
};
