const pool = require("../../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

// --- Multer setup ---
const uploadDir = path.join(__dirname, "../../public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// --- Helper: convert 12-hour time + date to timestamp ---
const convertToTimestamp = (eventDateString, timeString) => {
  const eventDate = dayjs(eventDateString);
  if (!eventDate.isValid())
    throw new Error(`Invalid event date: ${eventDateString}`);

  const time = dayjs(timeString, ["h:mm A", "h:mm a"]);
  if (!time.isValid()) throw new Error(`Invalid time: ${timeString}`);

  return eventDate
    .set("hour", time.hour())
    .set("minute", time.minute())
    .set("second", 0)
    .format("YYYY-MM-DD HH:mm:ss");
};

// --- Middleware: validate event creation ---
const validateAddEvent = (req, res, next) => {
  const {
    event_name,
    start_time,
    end_time,
    event_date,
    user_id,
    event_mode,
    audience_type,
    location,
  } = req.body;

  if (
    !event_name ||
    !start_time ||
    !end_time ||
    !event_date ||
    !user_id ||
    !event_mode ||
    !audience_type
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const validModes = ["online", "physical", "hybrid"];
  const validAudiences = ["open", "club_members", "private", "faculty only"];

  if (!validModes.includes(event_mode))
    return res.status(400).json({ error: "Invalid event_mode" });
  if (!validAudiences.includes(audience_type))
    return res.status(400).json({ error: "Invalid audience_type" });

  if (
    (event_mode === "physical" || event_mode === "hybrid") &&
    (!location || location.trim() === "")
  ) {
    return res
      .status(400)
      .json({ error: "Location is required for physical or hybrid events" });
  }

  next();
};

// --- Placeholder Auth middleware ---
const authMiddleware = (req, res, next) => {
  // Implement authentication logic here
  next();
};

// --- Controller functions ---

// Get all events
const getEvents = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM events;");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

// Get events by user ID
const getEventsByUserId = async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user_id" });

  try {
    const result = await pool.query("SELECT * FROM events WHERE user_id = $1", [
      userId,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "No events found" });
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

// Add a new event
const addEvent = [
  authMiddleware,
  upload.none(),
  validateAddEvent,
  async (req, res) => {
    try {
      const {
        event_name,
        description = null,
        start_time,
        end_time,
        event_date,
        flyer_image = null,
        user_id,
        event_mode,
        location = null,
        audience_type,
        venue_id = 1,
        status = "pending",
        created_at = dayjs().toISOString(),
        event_category = null,
        additional_notes = null,
        event_form_link = null,
      } = req.body;

      // Validate organizer
      const userRes = await pool.query(
        "SELECT role, status FROM users WHERE user_id = $1",
        [user_id]
      );
      if (userRes.rows.length === 0)
        return res.status(404).json({ error: "User not found" });
      const user = userRes.rows[0];
      if (user.role !== "organizer")
        return res
          .status(403)
          .json({ error: "Only organizers can create events" });
      if (user.status !== "active")
        return res.status(403).json({ error: "Organizer not approved" });

      // Convert times
      const startTimestamp = convertToTimestamp(event_date, start_time);
      const endTimestamp = convertToTimestamp(event_date, end_time);

      // Insert event
      const query = `
        INSERT INTO events
        (event_name, description, start_time, end_time, event_date, venue_id, status, created_at, event_category, additional_notes, flyer_image, user_id, event_form_link, event_mode, location, audience_type)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *;
      `;
      const values = [
        event_name,
        description,
        startTimestamp,
        endTimestamp,
        event_date,
        venue_id,
        status,
        created_at,
        event_category,
        additional_notes,
        flyer_image,
        user_id,
        event_form_link,
        event_mode,
        location,
        audience_type,
      ];

      const result = await pool.query(query, values);
      res
        .status(201)
        .json({ message: "Event added successfully", event: result.rows[0] });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ error: "Failed to add event", details: err.message });
    }
  },
];

// Delete an event
const deleteEvent = async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  if (isNaN(eventId))
    return res.status(400).json({ error: "Invalid event_id" });

  try {
    const result = await pool.query(
      "DELETE FROM events WHERE event_id = $1 RETURNING *",
      [eventId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Event not found" });
    res
      .status(200)
      .json({ message: "Event deleted", deletedEvent: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete event" });
  }
};

// Get current month events
const getEventsForCurrentMonth = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM events
      WHERE date_trunc('month', event_date) = date_trunc('month', CURRENT_DATE)
      AND status='active'
      ORDER BY event_date ASC;
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch current month events" });
  }
};

// Update event progress
const updateEventProgress = async (req, res) => {
  const { eventId } = req.params;
  const { event_status } = req.body;
  const validStatuses = ["upcoming", "in-progress", "completed", "cancelled"];
  if (!validStatuses.includes(event_status))
    return res.status(400).json({ error: "Invalid status" });

  try {
    const result = await pool.query(
      "UPDATE events SET event_status=$1 WHERE event_id=$2 RETURNING *",
      [event_status, eventId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Event not found" });
    res
      .status(200)
      .json({
        message: `Event status updated to ${event_status}`,
        event: result.rows[0],
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update event" });
  }
};

// Admin: Get all organizer events
const getAllOrganizerEvents = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, u.name AS organizer_name, u.email AS organizer_email
      FROM events e
      JOIN users u ON e.user_id=u.user_id
      WHERE u.role='organizer'
      ORDER BY e.event_date ASC;
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch organizer events" });
  }
};

// Admin: Update event status
const updateEventStatusAdmin = async (req, res) => {
  const { eventId } = req.params;
  let { status } = req.body;
  if (status === "rejected") status = "inactive";
  if (!["active", "inactive"].includes(status))
    return res.status(400).json({ error: "Invalid status" });

  try {
    const result = await pool.query(
      "UPDATE events SET status=$1 WHERE event_id=$2 RETURNING *",
      [status, eventId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Event not found" });
    res
      .status(200)
      .json({ message: "Event status updated", event: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
};

// Admin: Delete event
const deleteEventAdmin = async (req, res) => {
  const { eventId } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM events WHERE event_id=$1 RETURNING *",
      [eventId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Event not found" });
    res
      .status(200)
      .json({ message: "Event deleted", deletedEvent: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete event" });
  }
};

// --- Event Enrollment ---

const enrollUserInEvent = async (req, res) => {
  const { eventId } = req.params;
  const { user_id } = req.body;

  try {
    const event = await pool.query(
      "SELECT * FROM events WHERE event_id=$1 AND status='active'",
      [eventId]
    );
    if (event.rows.length === 0)
      return res.status(404).json({ error: "Event not found" });

    const user = await pool.query("SELECT * FROM users WHERE user_id=$1", [
      user_id,
    ]);
    if (user.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const existing = await pool.query(
      "SELECT * FROM event_enrollments WHERE event_id=$1 AND user_id=$2",
      [eventId, user_id]
    );
    if (existing.rows.length > 0) {
      return res.status(200).json({ message: "User already enrolled" }); // idempotent
    }

    const result = await pool.query(
      "INSERT INTO event_enrollments (event_id, user_id) VALUES ($1,$2) RETURNING *",
      [eventId, user_id]
    );
    res
      .status(201)
      .json({ message: "User enrolled", enrollment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to enroll user" });
  }
};


const getEventEnrollments = async (req, res) => {
  const { eventId } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT u.user_id, u.name, u.email, ee.enrolled_at
      FROM event_enrollments ee
      JOIN users u ON ee.user_id = u.user_id
      WHERE ee.event_id=$1
    `,
      [eventId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
};

const cancelEnrollment = async (req, res) => {
  const { eventId } = req.params;
  const { user_id } = req.body;

  try {
    const result = await pool.query(
      "DELETE FROM event_enrollments WHERE event_id=$1 AND user_id=$2 RETURNING *",
      [eventId, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ message: "Enrollment already cancelled" }); // idempotent
    }

    res.status(200).json({
      message: "Enrollment cancelled",
      enrollment: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel enrollment" });
  }
};

const getUserEnrolledEvents = async (req, res) => {
  const userId = req.params.userId;
  console.log("Fetching enrollments for user:", userId);
  try {
    const result = await pool.query(
      // ✅ FIXED
      "SELECT event_id FROM event_enrollments WHERE user_id = $1",
      [userId]
    );
    console.log("Query result:", result.rows);
    res.json(result.rows.map((r) => r.event_id));
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Failed to fetch enrolled events" });
  }
};



// Get chat messages for an event
const getEventChat = async (req, res) => {
  const { eventId } = req.params;

  try {
    const result = await pool.query(
      `SELECT ec.chat_id, ec.message, ec.created_at, u.user_id, u.name as user_name
       FROM event_chat ec
       JOIN users u ON u.user_id = ec.user_id
       WHERE ec.event_id = $1
       ORDER BY ec.created_at ASC`,
      [eventId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
};

// Post a new chat message
const postEventChat = async (req, res) => {
  const { eventId } = req.params;
  const { user_id, message } = req.body;

  if (!user_id || !message)
    return res.status(400).json({ error: "Missing user_id or message" });

  try {
    const result = await pool.query(
      `INSERT INTO event_chat (event_id, user_id, message)
       VALUES ($1, $2, $3) RETURNING *`,
      [eventId, user_id, message]
    );

    res.status(201).json({ message: "Message sent", chat: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
};


// --- Export ---
module.exports = {
  getEvents,
  getEventsByUserId,
  addEvent,
  deleteEvent,
  getEventsForCurrentMonth,
  updateEventProgress,
  getAllOrganizerEvents,
  updateEventStatusAdmin,
  deleteEventAdmin,
  enrollUserInEvent,
  getEventEnrollments,
  cancelEnrollment,
  multerErrorHandler,
  validateAddEvent,
  authMiddleware,
  getUserEnrolledEvents,
  getEventChat,
  postEventChat
};
