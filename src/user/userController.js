const bcrypt = require("bcrypt"); // Import bcrypt
const pool = require("../../db");
require("dotenv").config(); // This loads the .env file
const jwt = require("jsonwebtoken"); // Import JWT for login

// Get all users
const getUsers = async (req, res) => {
  pool.query("SELECT * FROM users", (error, results) => {
    if (error) {
      throw error;
    }
    res.status(200).json(results.rows);
  });
};

// Add a new user
const addUser = async (req, res) => {
  const { name, email, phone_number, password, gender, role, status } =
    req.body;

  try {
    // Validate input (optional)
    if (!name || !email || !password || !gender || !role || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Hash the password before saving to database
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user into the database with hashed password
    const result = await pool.query(
      `INSERT INTO users (name, email, phone_number, password, gender, role, status) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, email, phone_number, hashedPassword, gender, role, status]
    );

    // Send back the created user as response (without password)
    const createdUser = result.rows[0];
    delete createdUser.password; // Remove password from response
    res.status(201).json(createdUser);
  } catch (error) {
    console.error("Error details:", error.message); // Log the error message
    console.error("Error stack:", error.stack); // Log the error stack

    res
      .status(500)
      .json({ message: "Error creating user", error: error.message });
  }
};

// User login (authentication)
const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Query the database to find the user by username (email in this case)
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      username,
    ]);

    // Check if user exists
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Compare the password with the hashed password from the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    // Check if the password is correct
    if (passwordMatch) {
      // Log the user object to verify role and user_id are present
      console.log("User Object:", user); // This will help debug the issue

      // Remove password from the response object for security
      delete user.password;

      // Generate JWT token
      const token = jwt.sign(
        { user_id: user.user_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Send the response with user details, including user_id and token
      return res.status(200).json({
        message: "Login successful",
        user: {
          user_id: user.user_id, // Ensure user.id is being passed
          username: user.email, // Send username
          role: user.role, // Send role
          token: token, // Send token
        },
      });
    } else {
      // If password doesn't match
      return res.status(400).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Login error:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Get user details by userId
const getUserById = async (req, res) => {
  const { userId } = req.params; // Get the userId from the URL params

  try {
    // Query to fetch user details from the database by userId
    const result = await pool.query("SELECT * FROM users WHERE user_id = $1", [
      userId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    // Remove sensitive information like password before sending response
    delete user.password;

    // Return the user details
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getUsers,
  addUser,
  loginUser,
  getUserById,
};
