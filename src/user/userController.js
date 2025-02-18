const bcrypt = require('bcrypt');  // Import bcrypt
const pool = require('../../db');

const getUsers = async (req, res) => {
   pool.query('SELECT * FROM users', (error, results) => {
      if (error) {
         throw error;
      }
      res.status(200).json(results.rows);
   });
}

const addUser = async (req, res) => {
   const { name, email, phone_number, password, gender, role, status } = req.body;
 
   try {
     // Validate input (optional)
     if (!name || !email || !password || !gender || !role || !status) {
       return res.status(400).json({ message: 'Missing required fields' });
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
     delete createdUser.password;  // Remove password from response
     res.status(201).json(createdUser);
   } catch (error) {
     console.error("Error details:", error.message); // Log the error message
     console.error("Error stack:", error.stack); // Log the error stack
 
     res.status(500).json({ message: "Error creating user", error: error.message });
   }
};
 
module.exports = {
    getUsers,
    addUser
};
