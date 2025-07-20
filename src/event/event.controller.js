const pool = require("../../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

// --- Multer setup for file uploads (not used for flyer since Firebase is used) ---
const uploadDir = path.join(__dirname, "../../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
});

// Middleware to handle multer errors
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Helper: Convert 12-hour time + date to timestamp string
const convertToTimestamp = (eventDateString, timeString) => {
  const eventDate = dayjs(eventDateString);
  if (!eventDate.isValid()) {
    throw new Error(`Invalid event date: ${eventDateString}`);
  }

  const time = dayjs(timeString, ["h:mm A", "h:mm a"]);
  if (!time.isValid()) {
    throw new Error(`Invalid time: ${timeString}`);
  }

  return eventDate
    .set("hour", time.hour())
    .set("minute", time.minute())
    .set("second", 0)
    .format("YYYY-MM-DD HH:mm:ss");
};

// Basic input validation middleware for addEvent
const validateAddEvent = (req, res, next) => {
  const { event_name, start_time, end_time, event_date, user_id } = req.body;

  if (!event_name || !start_time || !end_time || !event_date || !user_id) {
    return res.status(400).json({
      error:
        "Missing required fields: event_name, start_time, end_time, event_date, user_id",
    });
  }
  next();
};

// Placeholder Auth middleware (implement your own)
const authMiddleware = (req, res, next) => {
  // Example: check req.headers.authorization or session, etc.
  next();
};

// --- Controller functions ---

// Get all events
const getEvents = async (req, res) => {
  try {
    const results = await pool.query("SELECT * FROM events;");
    res.status(200).json(results.rows);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

// ✅ Add a new event (expects multipart/form-data fields, no files)
const addEvent = [
  authMiddleware,
  upload.none(), // <<<<< Parse multipart/form-data fields, no files
  validateAddEvent,
  async (req, res) => {
    try {
      const {
        event_name,
        description = null,
        status = "pending",
        created_at = dayjs().toISOString(),
        event_category = null,
        additional_notes = null,
        start_time,
        end_time,
        event_date,
        flyer_image = null,
        user_id,
        venue_id = 1,
        event_form_link = null, // NEW FIELD
      } = req.body;

      const convertedStartTime = convertToTimestamp(event_date, start_time);
      const convertedEndTime = convertToTimestamp(event_date, end_time);

      const query = `
        INSERT INTO events (
          event_name, description, start_time, end_time, event_date, venue_id, status, created_at,
          event_category, additional_notes, flyer_image, user_id, event_form_link
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *;
      `;

      const values = [
        event_name,
        description,
        convertedStartTime,
        convertedEndTime,
        event_date,
        venue_id,
        status,
        created_at,
        event_category,
        additional_notes,
        flyer_image,
        user_id,
        event_form_link, // NEW FIELD
      ];

      const result = await pool.query(query, values);

      res.status(201).json({
        message: "Event added successfully",
        event: result.rows[0],
      });
    } catch (error) {
      console.error("Error adding event:", error);
      res.status(500).json({
        error: "Failed to add event",
        details: error.message,
      });
    }
  },
];

// Get events by user ID
const getEventsByUserId = async (req, res) => {
  const { userId } = req.params;
  const parsedUserId = parseInt(userId, 10);

  if (isNaN(parsedUserId)) {
    return res.status(400).json({ error: "Invalid user_id parameter" });
  }

  try {
    const results = await pool.query(
      "SELECT * FROM events WHERE user_id = $1",
      [parsedUserId]
    );

    if (results.rows.length === 0) {
      return res.status(404).json({ message: "No events found for this user" });
    }

    res.status(200).json(results.rows);
  } catch (error) {
    console.error("Error fetching events by user:", error);
    res.status(500).json({ error: "Failed to fetch events for this user" });
  }
};

// ✅ Delete an event by ID
const deleteEvent = async (req, res) => {
  const { eventId } = req.params;
  const parsedEventId = parseInt(eventId, 10);

  if (isNaN(parsedEventId)) {
    return res.status(400).json({ error: "Invalid event_id parameter" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM events WHERE event_id = $1 RETURNING *;",
      [parsedEventId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Event not found or already deleted" });
    }

    res.status(200).json({
      message: "Event deleted successfully",
      deletedEvent: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
};

// --- Export all functions ---
module.exports = {
  getEvents,
  addEvent,
  getEventsByUserId,
  deleteEvent,
  multerErrorHandler,
  validateAddEvent,
  authMiddleware,
};
