const pool = require("../../../db");
require("dotenv").config();

// Get all clubs
const getAllClubs = async (req, res) => {

const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { notifyUserStatus } = require("../../utils/notificationHelper");
const { body, validationResult, param } = require("express-validator");

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

// ---------------------------
// Validation Middleware
// ---------------------------
const validateUserIdParam = [
  param("userId").isInt().withMessage("userId must be an integer"),
];

const validateAddUser = [
  body("name").trim().isLength({ min: 2, max: 50 }).escape(),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
  body("role").isIn(["admin", "user", "organizer"]),
  body("phone_number").optional().isMobilePhone(),
  body("gender").isIn(["male", "female", "other"]),
];

const validateUpdateUser = [
  param("userId").isInt(),
  body("name").optional().trim().isLength({ min: 2, max: 50 }).escape(),
  body("email").optional().isEmail().normalizeEmail(),
  body("password").optional().isLength({ min: 8 }),
  body("role").optional().isIn(["admin", "user", "organizer"]),
  body("phone_number").optional().isMobilePhone(),
  body("gender").optional().isIn(["male", "female", "other"]),
  body("status").optional().isIn(["pending", "active", "inactive"]),
];

// Get all users (without passwords)
const getUsers = async (req, res) => {
  try {
    const query = `
      SELECT user_id, name, email, phone_number, gender, role, status 
      FROM users 
      WHERE role = 'user'
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ message: "Error fetching users" });
  }
};

// Get user by ID (without password)
const getUserById = async (req, res) => {
  const { userId } = req.params;
  try {
    const userResult = await pool.query(
      "SELECT user_id, name, email, phone_number, gender, role, status, club_id FROM users WHERE user_id=$1",
      [userId]
    );

    if (userResult.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = userResult.rows[0];

    let userClubs = [];
    if (user.role.toLowerCase() === "user") {
      const clubRes = await pool.query(
        "SELECT club_id FROM user_clubs WHERE user_id=$1",
        [userId]
      );
      userClubs = clubRes.rows.map((r) => r.club_id);
    }

    res.status(200).json({ ...user, userClubs });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error fetching user" });
  }
};

// Get all organizers (any status)
const getAllOrganizers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.user_id, 
        u.name, 
        u.email, 
        u.phone_number, 
        u.gender, 
        u.role, 
        u.status, 
        c.name AS club_name
      FROM users u
      LEFT JOIN clubs c ON u.club_id = c.club_id
      WHERE u.role = 'organizer'
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching organizers:", error);
    res.status(500).json({ message: "Error fetching organizers" });
  }
};

// Get pending organizers
const getPendingOrganizers = async (req, res) => {

  try {
    const result = await pool.query(
      // ✅ FIXED: use pool.query not just query
      "SELECT club_id, name, display_name FROM clubs ORDER BY display_name ASC"
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching clubs:", err);
    res.status(500).json({ error: "Failed to fetch clubs" });
  }
};

// Optional: Get a single club by ID
const getClubById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT club_id, name, display_name FROM clubs WHERE club_id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Club not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching club:", err);
    res.status(500).json({ error: "Failed to fetch club" });
  }
};
}
module.exports = {
  getAllClubs,
  getClubById,
};
