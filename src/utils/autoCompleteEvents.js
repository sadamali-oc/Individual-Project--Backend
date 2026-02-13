const dayjs = require("dayjs");
const pool = require("../../db"); 


async function autoCompleteEvents() {
  try {
    // Get yesterday's end of day
    const yesterday = dayjs()
      .subtract(1, "day")
      .endOf("day")
      .format("YYYY-MM-DD HH:mm:ss");

    // Update events whose end_time is <= yesterday and are not already completed
    const query = `
      UPDATE events
      SET event_status = 'completed'
      WHERE end_time <= $1
      AND event_status != 'completed'
      RETURNING *;
    `;

    const result = await pool.query(query, [yesterday]);
    if (result.rows.length > 0) {
      console.log(`Auto-completed ${result.rows.length} events`);
    }
  } catch (err) {
    console.error("Error in autoCompleteEvents:", err);
  }
}

module.exports = { autoCompleteEvents };
