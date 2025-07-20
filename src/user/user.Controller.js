const bcrypt = require("bcrypt");
const pool = require("../../db");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

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
    const result = await pool.query(
      "SELECT user_id, name, email, phone_number, gender, role, status FROM users"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error fetching users" });
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

// Add a new user (status auto 'pending')
const addUser = async (req, res) => {
  const { name, email, phone_number, password, gender, role } = req.body;

  if (!name || !email || !password || !gender || !role) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Check if email already exists
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultStatus = "pending"; // Automatically pending on register

    const result = await pool.query(
      `INSERT INTO users (name, email, phone_number, password, gender, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id, name, email, phone_number, gender, role, status`,
      [name, email, phone_number, hashedPassword, gender, role, defaultStatus]
    );

    const user = result.rows[0];

    // Send welcome email
    const subject = "Welcome to Mora Fusion University Event Management System";
    const text = `Hello ${name},\n\nYour registration is successful and your account is pending approval.`;
    await sendEmail(email, subject, text);

    res.status(201).json(user);
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ message: "Error adding user" });
  }
};

// Update user by ID
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
        role || userResult.rows[0].role,
        status || userResult.rows[0].status,
        userId,
      ]
    );

    res
      .status(200)
      .json({ message: "User updated successfully", user: updated.rows[0] });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error updating user" });
  }
};

// Delete user by ID
const deleteUserById = async (req, res) => {
  const { userId } = req.params;

  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );
    if (userResult.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    await pool.query("DELETE FROM users WHERE user_id = $1", [userId]);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Error deleting user" });
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

module.exports = {
  getUsers,
  getUserById,
  addUser,
  updateUserById,
  deleteUserById,
  loginUser,
};
