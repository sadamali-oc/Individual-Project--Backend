const bcrypt = require("bcrypt");
const pool = require("../../../db");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { notifyUserStatus } = require("../../utils/notificationHelper");

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send email helper
const sendEmail = async (email, subject, text) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      text,
    });
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Get all users (without passwords)
const getUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        user_id, 
        name, 
        email, 
        phone_number, 
        gender, 
        role, 
        status 
      FROM users 
      WHERE role = 'user'
    `;

    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching users:", error.message);
    res.status(500).json({ message: "Error fetching users" });
  }
};

// Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if email exists
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];
    if (!user)
      return res.status(404).json({ message: "No user with that email" });

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Save token and expiry to DB
    await pool.query(
      `UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE user_id = $3`,
      [resetToken, tokenExpires, user.user_id]
    );

    // Send reset email
    const resetLink = `http://localhost:4200/auth/reset-password?token=${resetToken}`;
    const subject = "Password Reset Request";
    const text = `Hello ${user.name},\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link expires in 15 minutes.`;

    await sendEmail(email, subject, text);

    res.status(200).json({ message: "Password reset link sent to email." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long" });
    }

    // Change from db.query to pool.query
    const result = await pool.query(
      `SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const userId = result.rows[0].user_id; // user_id, not id

    await pool.query(
      `UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE user_id = $2`,
      [hashedPassword, userId]
    );

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error during password reset" });
  }
};

// Get user by ID (without password)
const getUserById = async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      "SELECT user_id, name, email, phone_number, gender, role, status FROM users WHERE user_id = $1",
      [userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error fetching user" });
  }
};

// Get organizers with status = 'pending'
const getPendingOrganizers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, name, email, phone_number, gender, role, status 
       FROM users 
       WHERE role = $1 AND status = $2`,
      ["organizer", "pending"]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching pending organizers:", error);
    res.status(500).json({ message: "Error fetching pending organizers" });
  }
};

// ✅ Get all users with status = 'pending' (Admin only)
const getPendingUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, name, email, phone_number, gender, role, status 
       FROM users 
       WHERE status = $1`,
      ["pending"]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching pending users:", error);
    res.status(500).json({ message: "Error fetching pending users" });
  }
};

// Add a new user (status auto 'pending', admin always active)
const addUser = async (req, res) => {
  const { name, email, phone_number, password, gender, role, club_id } =
    req.body;

  if (!name || !email || !password || !gender || !role) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Check if email is already registered
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // If role is Organizer, ensure club doesn't already have one
    if (role.toLowerCase() === "organizer" && club_id) {
      const existingOrganizer = await pool.query(
        "SELECT * FROM users WHERE club_id = $1 AND LOWER(role) = 'organizer'",
        [club_id]
      );

      if (existingOrganizer.rows.length > 0) {
        return res
          .status(400)
          .json({ message: "This club already has an assigned Organizer" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Admin status forced to active, others pending
    const defaultStatus = role.toLowerCase() === "admin" ? "active" : "pending";

    const result = await pool.query(
      `INSERT INTO users (name, email, phone_number, password, gender, role, status, club_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING user_id, name, email, phone_number, gender, role, status, club_id`,
      [
        name,
        email,
        phone_number,
        hashedPassword,
        gender,
        role,
        defaultStatus,
        club_id || null,
      ]
    );

    const user = result.rows[0];

    const subject = "Welcome to Mora Fusion University Event Management System";
    const text = `Hello ${name},\n\nYour registration is successful and your account is ${
      defaultStatus === "active" ? "active" : "pending approval"
    }.`;

    await sendEmail(email, subject, text);

    res.status(201).json(user);
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ message: "Error adding user" });
  }
};

// Update user by ID (admin status forced active)
const updateUserById = async (req, res) => {
  const { userId } = req.params;
  const { name, email, phone_number, password, gender, role, status } =
    req.body;

  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );
    if (userResult.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    let hashedPassword = userResult.rows[0].password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Force admin status = active
    const isAdmin = userResult.rows[0].role.toLowerCase() === "admin";
    const finalStatus = isAdmin
      ? "active"
      : status || userResult.rows[0].status;

    // If role is changed to admin, force status active
    const finalRole = role ? role : userResult.rows[0].role;
    const roleIsAdmin = finalRole.toLowerCase() === "admin";
    const statusToSet = roleIsAdmin ? "active" : finalStatus;

    const updated = await pool.query(
      `UPDATE users 
       SET name = $1, email = $2, phone_number = $3, password = $4, gender = $5, role = $6, status = $7 
       WHERE user_id = $8 
       RETURNING user_id, name, email, phone_number, gender, role, status`,
      [
        name || userResult.rows[0].name,
        email || userResult.rows[0].email,
        phone_number || userResult.rows[0].phone_number,
        hashedPassword,
        gender || userResult.rows[0].gender,
        finalRole,
        statusToSet,
        userId,
      ]
    );

    res.status(200).json({
      message: "User updated successfully",
      user: updated.rows[0],
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error updating user" });
  }
};

// Delete user by ID (prevent deleting admin)
const deleteUserById = async (req, res) => {
  const { userId } = req.params;

  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );
    if (userResult.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    if (userResult.rows[0].role.toLowerCase() === "admin") {
      return res.status(400).json({ message: "Cannot delete admin user" });
    }

    await pool.query("DELETE FROM users WHERE user_id = $1", [userId]);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Error deleting user" });
  }
};

// Approve organizer (admin action)
const approveOrganizer = async (req, res) => {
  const { userId } = req.params;

  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE user_id = $1 AND role = $2 AND status = $3",
      [userId, "organizer", "pending"]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Pending organizer not found" });
    }

    const updateResult = await pool.query(
      "UPDATE users SET status = $1 WHERE user_id = $2 RETURNING user_id, name, email, status",
      ["active", userId]
    );

    const organizer = updateResult.rows[0];

    // Optional: send approval email
    const subject = "Organizer Account Approved";
    const text = `Hello ${organizer.name},\n\nYour organizer account has been approved. You can now access the organizer dashboard.`;
    await sendEmail(organizer.email, subject, text);

    res.status(200).json({
      message: "Organizer approved successfully",
      organizer,
    });
  } catch (error) {
    console.error("Error approving organizer:", error);
    res.status(500).json({ message: "Error approving organizer" });
  }
};

// User login
const loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      username,
    ]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.status(200).json({
      message: "Login successful",
      user: {
        user_id: user.user_id,
        username: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// New: Update user status (approve/reject/pending) - admin only
const updateUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  const validStatuses = ["pending", "inactive", "active"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const userResult = await pool.query(
      "SELECT role FROM users WHERE user_id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (userResult.rows[0].role.toLowerCase() === "admin") {
      return res.status(400).json({
        message: "Cannot change admin status; admin is always active.",
      });
    }

    // Update status
    const result = await pool.query(
      "UPDATE users SET status = $1 WHERE user_id = $2 RETURNING user_id, name, email, role, status",
      [status, userId]
    );

    const updatedUser = result.rows[0];

    // --- Notify user about status change ---
    await notifyUserStatus(userId, status);

    res.json({ message: "User status updated", user: updatedUser });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all organizers (any status)
const getAllOrganizers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT user_id, name, email, phone_number, gender, role, status 
      FROM users 
      WHERE role = 'organizer'
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching organizers:", error);
    res.status(500).json({ message: "Error fetching organizers" });
  }
};

// Export all functions
module.exports = {
  getUsers,
  getUserById,
  getPendingOrganizers,
  getPendingUsers, // ✅ new export
  addUser,
  getAllOrganizers,
  updateUserById,
  deleteUserById,
  approveOrganizer,
  loginUser,
  updateUserStatus, // new
  forgotPassword,
  resetPassword,
};
