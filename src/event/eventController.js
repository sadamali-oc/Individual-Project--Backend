const pool = require("../../db");

const getEvents = async (req, res) => {
  pool.query("SELECT * FROM events;", (error, results) => {
    if (error) {
      throw error;
    }
    res.status(200).json(results.rows);
  });
};

module.exports = {
  getEvents,
};
