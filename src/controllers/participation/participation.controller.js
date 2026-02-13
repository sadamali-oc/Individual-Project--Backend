// src/controllers/participation/participation.controller.js
const pool = require("../../../db");

exports.participate = async (req, res) => {
  const { user_id, event_id } = req.body;

  try {
    // Check if user is already participating
    const check = await pool.query(
      "SELECT * FROM participations WHERE user_id = $1 AND event_id = $2",
      [user_id, event_id]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ message: "Already participating" });
    }

    // Insert participation record
    await pool.query(
      "INSERT INTO participations (user_id, event_id) VALUES ($1, $2)",
      [user_id, event_id]
    );

    res.status(201).json({ message: "Participation added successfully" });
  } catch (error) {
    console.error("Error in participate:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.cancelParticipation = async (req, res) => {
  const { user_id, event_id } = req.body;

  try {
    const result = await pool.query(
      "DELETE FROM participations WHERE user_id = $1 AND event_id = $2",
      [user_id, event_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Participation not found" });
    }

    res.json({ message: "Participation removed successfully" });
  } catch (error) {
    console.error("Error in cancelParticipation:", error);
    res.status(500).json({ message: "Server error" });
  }
};
