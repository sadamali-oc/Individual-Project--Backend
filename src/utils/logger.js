const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'notifications.log');

/**
 * Logger utility for notification system
 * Logs all attempts with timestamps, status, and details
 */
const logger = {
  // Core logging function
  log: (level, message, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...data
    };

    // Log to file only
    try {
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n', 'utf8');
    } catch (err) {
      // Silent fail
    }
  },

  // Convenience methods
  info: (message, data) => logger.log('info', message, data),
  error: (message, data) => logger.log('error', message, data),
  warn: (message, data) => logger.log('warn', message, data),

  // Specific logging for notification operations
  logNotificationAttempt: (user_id, status, attempt = 1, error = null) => {
    const message = error
      ? `Notification attempt ${attempt} failed for user ${user_id}`
      : `Notification attempt ${attempt} succeeded for user ${user_id}`;

    logger.log(error ? 'error' : 'info', message, {
      user_id,
      status,
      attempt,
      error: error ? error.message : null
    });
  },

  logValidationError: (field, value, reason) => {
    logger.error(`Validation failed for ${field}`, {
      field,
      provided_value: value,
      reason
    });
  },

  logDatabaseOperation: (operation, table, status, details = {}) => {
    logger.info(`Database ${operation} on ${table}: ${status}`, {
      operation,
      table,
      status,
      ...details
    });
  },

  // Get all logs (useful for monitoring)
  getAllLogs: () => {
    try {
      if (fs.existsSync(logFile)) {
        return fs
          .readFileSync(logFile, 'utf8')
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch (e) {
              return null;
            }
          })
          .filter(log => log !== null);
      }
      return [];
    } catch (err) {
      console.error('Failed to read logs:', err.message);
      return [];
    }
  },

  // Get logs for specific user
  getUserLogs: (user_id) => {
    return logger.getAllLogs().filter(log => log.user_id === user_id);
  },

  // Clear logs (cleanup)
  clearLogs: () => {
    try {
      fs.writeFileSync(logFile, '', 'utf8');
      logger.info('Log file cleared');
    } catch (err) {
      console.error('Failed to clear logs:', err.message);
    }
  }
};

module.exports = logger;
