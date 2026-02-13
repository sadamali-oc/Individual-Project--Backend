const pool = require("../../../db");
require("dotenv").config();

// Get all clubs
const getAllClubs = async (req, res) => {
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

// ✅ Correct CommonJS export
module.exports = {
  getAllClubs,
  getClubById,
};
