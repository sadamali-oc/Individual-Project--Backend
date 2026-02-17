// const bcrypt = require("bcrypt");
// const pool = require("../../../db");
// require("dotenv").config();
// const jwt = require("jsonwebtoken");
// const nodemailer = require("nodemailer");
// const crypto = require("crypto");
// const { notifyUserStatus } = require("../../utils/notificationHelper");

// // Email transporter setup
// const transporter = nodemailer.createTransport({
//   service: "Gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Send email helper
// const sendEmail = async (email, subject, text) => {
//   try {
//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject,
//       text,
//     });
//     console.log("Email sent successfully");
//   } catch (error) {
//     console.error("Error sending email:", error);
//   }
// };

// // Get all users (without passwords)
// const getUsers = async (req, res) => {
//   try {
//     const query = `
//       SELECT user_id, name, email, phone_number, gender, role, status 
//       FROM users 
//       WHERE role = 'user'
//     `;
//     const result = await pool.query(query);
//     res.status(200).json(result.rows);
//   } catch (error) {
//     console.error("Error fetching users:", error.message);
//     res.status(500).json({ message: "Error fetching users" });
//   }
// };

// // Get user by ID (without password)
// const getUserById = async (req, res) => {
//   const { userId } = req.params;
//   try {
//     const userResult = await pool.query(
//       "SELECT user_id, name, email, phone_number, gender, role, status, club_id FROM users WHERE user_id=$1",
//       [userId]
//     );

//     if (userResult.rows.length === 0)
//       return res.status(404).json({ message: "User not found" });

//     const user = userResult.rows[0];

//     let userClubs = [];
//     if (user.role.toLowerCase() === "user") {
//       const clubRes = await pool.query(
//         "SELECT club_id FROM user_clubs WHERE user_id=$1",
//         [userId]
//       );
//       userClubs = clubRes.rows.map((r) => r.club_id);
//     }

//     res.status(200).json({ ...user, userClubs });
//   } catch (error) {
//     console.error("Error fetching user:", error);
//     res.status(500).json({ message: "Error fetching user" });
//   }
// };

// // Get all organizers (any status)
// const getAllOrganizers = async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         u.user_id, 
//         u.name, 
//         u.email, 
//         u.phone_number, 
//         u.gender, 
//         u.role, 
//         u.status, 
//         c.name AS club_name
//       FROM users u
//       LEFT JOIN clubs c ON u.club_id = c.club_id
//       WHERE u.role = 'organizer'
//     `);

//     res.status(200).json(result.rows);
//   } catch (error) {
//     console.error("Error fetching organizers:", error);
//     res.status(500).json({ message: "Error fetching organizers" });
//   }
// };

// // Get pending organizers
// const getPendingOrganizers = async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT user_id, name, email, phone_number, gender, role, status 
//        FROM users 
//        WHERE role = $1 AND status = $2`,
//       ["organizer", "pending"]
//     );
//     res.status(200).json(result.rows);
//   } catch (error) {
//     console.error("Error fetching pending organizers:", error);
//     res.status(500).json({ message: "Error fetching pending organizers" });
//   }
// };

// // Get all pending users
// const getPendingUsers = async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT user_id, name, email, phone_number, gender, role, status 
//        FROM users 
//        WHERE status = $1`,
//       ["pending"]
//     );
//     res.status(200).json(result.rows);
//   } catch (error) {
//     console.error("Error fetching pending users:", error);
//     res.status(500).json({ message: "Error fetching pending users" });
//   }
// };

// // Add new user
// const addUser = async (req, res) => {
//   const {
//     name,
//     email,
//     phone_number,
//     password,
//     gender,
//     role,
//     club_id,
//     userClubs,
//   } = req.body;

//   if (!name || !email || !password || !gender || !role) {
//     return res.status(400).json({ message: "Missing required fields" });
//   }

//   try {
//     // Check if email exists
//     const userExists = await pool.query(
//       "SELECT * FROM users WHERE email = $1",
//       [email]
//     );
//     if (userExists.rows.length > 0) {
//       return res.status(400).json({ message: "Email already registered" });
//     }

//     // Organizer club validation
//     if (role.toLowerCase() === "organizer" && club_id) {
//       const existingOrganizer = await pool.query(
//         "SELECT * FROM users WHERE club_id = $1 AND LOWER(role) = 'organizer'",
//         [club_id]
//       );
//       if (existingOrganizer.rows.length > 0) {
//         return res
//           .status(400)
//           .json({ message: "This club already has an assigned Organizer" });
//       }
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const defaultStatus = role.toLowerCase() === "admin" ? "active" : "pending";

//     // Insert user
//     const result = await pool.query(
//       `INSERT INTO users (name, email, phone_number, password, gender, role, status, club_id)
//        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
//        RETURNING user_id, name, email, phone_number, gender, role, status, club_id`,
//       [
//         name,
//         email,
//         phone_number,
//         hashedPassword,
//         gender,
//         role,
//         defaultStatus,
//         club_id || null,
//       ]
//     );

//     const user = result.rows[0];

//     // Insert multiple clubs for normal users
//     let assignedClubs = [];
//     if (
//       role.toLowerCase() === "user" &&
//       Array.isArray(userClubs) &&
//       userClubs.length > 0
//     ) {
//       const insertPromises = userClubs.map((clubId) =>
//         pool.query(
//           "INSERT INTO user_clubs (user_id, club_id) VALUES ($1,$2)",
//           [user.user_id, clubId]
//         )
//       );
//       await Promise.all(insertPromises);

//       // Fetch assigned clubs to return
//       const clubRes = await pool.query(
//         "SELECT club_id FROM user_clubs WHERE user_id = $1",
//         [user.user_id]
//       );
//       assignedClubs = clubRes.rows.map((r) => r.club_id);
//     }

//     // Send welcome email
//     const subject = "Welcome to Mora Fusion University Event Management System";
//     const text = `Hello ${name},\n\nYour registration is successful and your account is ${
//       defaultStatus === "active" ? "active" : "pending approval"
//     }.`;
//     await sendEmail(email, subject, text);

//     // Return user with assigned clubs
//     res.status(201).json({ ...user, userClubs: assignedClubs });
//   } catch (error) {
//     console.error("Error adding user:", error);
//     res.status(500).json({ message: "Error adding user" });
//   }
// };


// // Update user by ID
// const updateUserById = async (req, res) => {
//   const { userId } = req.params;
//   const {
//     name,
//     email,
//     phone_number,
//     password,
//     gender,
//     role,
//     status,
//     club_id,
//     userClubs,
//   } = req.body;

//   try {
//     const userResult = await pool.query(
//       "SELECT * FROM users WHERE user_id = $1",
//       [userId]
//     );
//     if (userResult.rows.length === 0)
//       return res.status(404).json({ message: "User not found" });

//     let hashedPassword = userResult.rows[0].password;
//     if (password) hashedPassword = await bcrypt.hash(password, 10);

//     // Admin status forced active
//     const isAdmin = (role || userResult.rows[0].role).toLowerCase() === "admin";
//     const statusToSet = isAdmin
//       ? "active"
//       : status || userResult.rows[0].status;

//     // --- Organizer uniqueness check ---
//     const finalRole = (role || userResult.rows[0].role).toLowerCase();
//     const finalClubId = club_id || userResult.rows[0].club_id;
//     if (finalRole === "organizer" && finalClubId) {
//       const existingOrganizer = await pool.query(
//         "SELECT * FROM users WHERE club_id = $1 AND LOWER(role) = 'organizer' AND user_id != $2",
//         [finalClubId, userId]
//       );
//       if (existingOrganizer.rows.length > 0) {
//         return res
//           .status(400)
//           .json({ message: "This club already has an assigned Organizer" });
//       }
//     }

//     const updated = await pool.query(
//       `UPDATE users 
//        SET name=$1, email=$2, phone_number=$3, password=$4, gender=$5, role=$6, status=$7, club_id=$8
//        WHERE user_id=$9
//        RETURNING user_id, name, email, phone_number, gender, role, status, club_id`,
//       [
//         name || userResult.rows[0].name,
//         email || userResult.rows[0].email,
//         phone_number || userResult.rows[0].phone_number,
//         hashedPassword,
//         gender || userResult.rows[0].gender,
//         role || userResult.rows[0].role,
//         statusToSet,
//         club_id || userResult.rows[0].club_id,
//         userId,
//       ]
//     );

//     const user = updated.rows[0];

//     // Update userClubs table for normal users
//     if (finalRole === "user") {
//       // Delete existing clubs
//       await pool.query("DELETE FROM user_clubs WHERE user_id=$1", [userId]);
//       // Insert new clubs
//       if (Array.isArray(userClubs) && userClubs.length > 0) {
//         const insertPromises = userClubs.map((clubId) =>
//           pool.query(
//             "INSERT INTO user_clubs (user_id, club_id) VALUES ($1,$2)",
//             [userId, clubId]
//           )
//         );
//         await Promise.all(insertPromises);
//       }
//     }

//     res.status(200).json({ message: "User updated successfully", user });
//   } catch (error) {
//     console.error("Error updating user:", error);
//     res.status(500).json({ message: "Error updating user" });
//   }
// };


// // Delete user by ID
// const deleteUserById = async (req, res) => {
//   const { userId } = req.params;

//   try {
//     const userResult = await pool.query(
//       "SELECT * FROM users WHERE user_id = $1",
//       [userId]
//     );
//     if (userResult.rows.length === 0)
//       return res.status(404).json({ message: "User not found" });

//     if (userResult.rows[0].role.toLowerCase() === "admin") {
//       return res.status(400).json({ message: "Cannot delete admin user" });
//     }

//     await pool.query("DELETE FROM users WHERE user_id = $1", [userId]);
//     res.status(200).json({ message: "User is deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting user:", error);
//     res.status(500).json({ message: "Error deleting user" });
//   }
// };

// // Approve organizer
// const approveOrganizer = async (req, res) => {
//   const { userId } = req.params;

//   try {
//     const userResult = await pool.query(
//       "SELECT * FROM users WHERE user_id=$1 AND role='organizer' AND status='pending'",
//       [userId]
//     );
//     if (userResult.rows.length === 0) {
//       return res.status(404).json({ message: "Pending organizer not found" });
//     }

//     const updateResult = await pool.query(
//       "UPDATE users SET status='active' WHERE user_id=$1 RETURNING user_id, name, email, status",
//       [userId]
//     );

//     const organizer = updateResult.rows[0];
//     const subject = "Organizer Account Approved";
//     const text = `Hello ${organizer.name},\n\nYour organizer account has been approved. You can now access the organizer dashboard.`;
//     await sendEmail(organizer.email, subject, text);

//     res
//       .status(200)
//       .json({ message: "Organizer approved successfully", organizer });
//   } catch (error) {
//     console.error("Error approving organizer:", error);
//     res.status(500).json({ message: "Error approving organizer" });
//   }
// };

// // Update user status (admin only)
// const updateUserStatus = async (req, res) => {
//   const { userId } = req.params;
//   const { status } = req.body;
//   const validStatuses = ["pending", "inactive", "active"];

//   if (!validStatuses.includes(status)) {
//     return res.status(400).json({ message: "Invalid status value" });
//   }

//   try {
//     const userResult = await pool.query(
//       "SELECT role FROM users WHERE user_id=$1",
//       [userId]
//     );
//     if (userResult.rows.length === 0)
//       return res.status(404).json({ message: "User not found" });

//     if (userResult.rows[0].role.toLowerCase() === "admin") {
//       return res
//         .status(400)
//         .json({
//           message: "Cannot change admin status; admin is always active.",
//         });
//     }

//     const result = await pool.query(
//       "UPDATE users SET status=$1 WHERE user_id=$2 RETURNING user_id, name, email, role, status",
//       [status, userId]
//     );

//     const updatedUser = result.rows[0];
//     await notifyUserStatus(userId, status);

//     res.json({ message: "User status updated", user: updatedUser });
//   } catch (error) {
//     console.error("Error updating user status:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// // User login
// const loginUser = async (req, res) => {
//   const { username, password } = req.body;
//   try {
//     const result = await pool.query("SELECT * FROM users WHERE email=$1", [
//       username,
//     ]);
//     const user = result.rows[0];
//     if (!user) return res.status(400).json({ message: "User not found" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch)
//       return res.status(400).json({ message: "Invalid credentials" });

//     const token = jwt.sign(
//       { user_id: user.user_id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: "1h" }
//     );

//     res.status(200).json({
//       message: "Login successful",
//       user: {
//         user_id: user.user_id,
//         username: user.email,
//         role: user.role,
//         token,
//       },
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// // Forgot password
// const forgotPassword = async (req, res) => {
//   const { email } = req.body;
//   try {
//     const result = await pool.query("SELECT * FROM users WHERE email=$1", [
//       email,
//     ]);
//     const user = result.rows[0];
//     if (!user)
//       return res.status(404).json({ message: "No user with that email" });

//     const resetToken = crypto.randomBytes(32).toString("hex");
//     const tokenExpires = new Date(Date.now() + 15 * 60 * 1000);

//     await pool.query(
//       "UPDATE users SET reset_token=$1, reset_token_expiry=$2 WHERE user_id=$3",
//       [resetToken, tokenExpires, user.user_id]
//     );

//     const resetLink = `http://localhost:4200/auth/reset-password?token=${resetToken}`;
//     const subject = "Password Reset Request";
//     const text = `Hello ${user.name},\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link expires in 15 minutes.`;
//     await sendEmail(email, subject, text);

//     res.status(200).json({ message: "Password reset link sent to email." });
//   } catch (error) {
//     console.error("Forgot password error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// // Reset password
// const resetPassword = async (req, res) => {
//   const { token, newPassword } = req.body;
//   try {
//     if (!token || !newPassword)
//       return res
//         .status(400)
//         .json({ message: "Token and new password are required" });
//     if (newPassword.length < 8)
//       return res
//         .status(400)
//         .json({ message: "Password must be at least 8 characters long" });

//     const result = await pool.query(
//       "SELECT * FROM users WHERE reset_token=$1 AND reset_token_expiry > NOW()",
//       [token]
//     );
//     if (result.rows.length === 0)
//       return res.status(400).json({ message: "Invalid or expired token" });

//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     const userId = result.rows[0].user_id;

//     await pool.query(
//       "UPDATE users SET password=$1, reset_token=NULL, reset_token_expiry=NULL WHERE user_id=$2",
//       [hashedPassword, userId]
//     );

//     res.status(200).json({ message: "Password reset successful" });
//   } catch (error) {
//     console.error("Reset password error:", error);
//     res.status(500).json({ message: "Server error during password reset" });
//   }
// };

// // Export all functions
// module.exports = {
//   getUsers,
//   getUserById,
//   getPendingOrganizers,
//   getPendingUsers,
//   addUser,
//   getAllOrganizers,
//   updateUserById,
//   deleteUserById,
//   approveOrganizer,
//   loginUser,
//   updateUserStatus,
//   forgotPassword,
//   resetPassword,
// };


const bcrypt = require("bcrypt");
const pool = require("../../../db");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { notifyUserStatus } = require("../../utils/notificationHelper");

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
const MFA_EXPIRY = 10 * 60 * 1000; // 10 minutes

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (email, subject, text) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      text,
    });
  } catch (error) {
    console.error("Error sending email:", error);
  }
};


// LOGIN WITH ACCOUNT LOCK + MFA 

const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [username]
    );

    const user = result.rows[0];
    if (!user) return res.status(400).json({ message: "User not found" });

    // Check account lock
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      return res.status(403).json({
        message: "Account locked. Try again later.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    // Wrong password
    if (!isMatch) {
      const attempts = user.failed_attempts + 1;

      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        await pool.query(
          "UPDATE users SET failed_attempts=$1, lock_until=$2 WHERE user_id=$3",
          [attempts, new Date(Date.now() + LOCK_TIME), user.user_id]
        );

        return res.status(403).json({
          message: "Account locked after 5 failed attempts.",
        });
      }

      await pool.query(
        "UPDATE users SET failed_attempts=$1 WHERE user_id=$2",
        [attempts, user.user_id]
      );

      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Reset failed attempts after success
    await pool.query(
      "UPDATE users SET failed_attempts=0, lock_until=NULL WHERE user_id=$1",
      [user.user_id]
    );

    // MFA generation
    const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date(Date.now() + MFA_EXPIRY);

    await pool.query(
      "UPDATE users SET mfa_code=$1, mfa_expiry=$2 WHERE user_id=$3",
      [mfaCode, expiryTime, user.user_id]
    );

    await sendEmail(
      user.email,
      "Your MFA Verification Code",
      `Your verification code is ${mfaCode}. It expires in 10 minutes.`
    );

    res.status(200).json({
      message: "MFA code sent to email",
      user_id: user.user_id,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Verify MFA 

const verifyMFA = async (req, res) => {
  const { user_id, code } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE user_id=$1",
      [user_id]
    );

    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    if (
      user.mfa_code !== code ||
      new Date(user.mfa_expiry) < new Date()
    ) {
      return res.status(400).json({
        message: "Invalid or expired MFA code",
      });
    }

    // Clear MFA
    await pool.query(
      "UPDATE users SET mfa_code=NULL, mfa_expiry=NULL WHERE user_id=$1",
      [user_id]
    );

    // Generate JWT after MFA success
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        username: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("MFA error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

      // Export

module.exports = {
  loginUser,
  verifyMFA,
};
