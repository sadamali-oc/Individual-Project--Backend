const pool = require("../../db");
const multer = require('multer');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat); // Extend dayjs with custom format parsing

// Configure file upload location with Multer
const upload = multer({ dest: 'uploads/' });

// Use multer middleware to handle file uploads
const uploadEventFlyer = upload.single('flyer_image');

// Helper function to convert 12-hour format time to 24-hour format and combine with event_date
const convertToTimestamp = (eventDateString, startTimeString) => {
  const eventDate = dayjs(eventDateString); // Parse the event date
  if (!eventDate.isValid()) {
    throw new Error(`Invalid event date: ${eventDateString}`);
  }

  // Parse the start time with explicit format (12-hour time with AM/PM)
  const startTime = dayjs(startTimeString, ['h:mm A', 'h:mm a']); // Added both capital and lowercase AM/PM formats
  if (!startTime.isValid()) {
    throw new Error(`Invalid start time: ${startTimeString}`);
  }

  // Convert to 24-hour format (HH:mm:ss)
  const formattedStartTime = startTime.format('HH:mm:ss');

  // Combine event date and formatted time into a valid timestamp
  return eventDate.set('hour', startTime.hour()).set('minute', startTime.minute()).format('YYYY-MM-DD HH:mm:ss');
};

// Get all events
const getEvents = async (req, res) => {
  pool.query("SELECT * FROM events;", (error, results) => {
    if (error) {
      throw error;
    }
    res.status(200).json(results.rows);
  });
};

// Add an event
const addEvent = async (req, res) => {
  // Make sure to include the multer middleware for file upload
  uploadEventFlyer(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: 'File upload error', details: err.message });
    }

    const {
      event_name,
      description,
      organizer_id,
      venue_id,
      status,
      created_at,
      event_category,
      additional_notes,
      start_time,
      end_time,
      flyer_image,
      event_date, // Date should also be passed along
    } = req.body;

    console.log('Received body:', req.body);

    // Handle default organizer and venue IDs if not provided
    const dummyOrganizerId = 1;
    const dummyVenueId = 1;

    const finalOrganizerId = organizer_id || dummyOrganizerId;
    const finalVenueId = venue_id || dummyVenueId;

    // Handle flyer image upload (if any)
    let flyer_image_path = null;
    if (req.file) {
      flyer_image_path = req.file.path;
      console.log('Uploaded flyer image:', flyer_image_path);
    } else {
      console.log('No flyer image uploaded');
    }

    // Validate required fields
    if (!event_name || !start_time || !end_time || !event_date) {
      console.log('Error: Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert start_time and event_date into valid timestamp
    let convertedStartTime, convertedEndTime;
    try {
      convertedStartTime = convertToTimestamp(event_date, start_time);
      convertedEndTime = convertToTimestamp(event_date, end_time);
    } catch (error) {
      console.log('Error converting start time and event date:', error.message);
      return res.status(400).json({ error: error.message });
    }

    console.log('Converted start time:', convertedStartTime);
    console.log('Converted end time:', convertedEndTime);

    // Handle default created_at if not provided
    const finalCreatedAt = created_at || dayjs().toISOString();

    // SQL query to insert event
    const query = `
      INSERT INTO events (
        event_name, description, start_time, end_time, 
        organizer_id, venue_id, status, created_at, event_category, 
        additional_notes, flyer_image
      ) VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8, $9, $10, 
        $11
      ) RETURNING *;
    `;

    const values = [
      event_name, 
      description, 
      convertedStartTime, 
      convertedEndTime, 
      finalOrganizerId, 
      finalVenueId, 
      status, 
      finalCreatedAt, 
      event_category, 
      additional_notes, 
      flyer_image_path
    ];

    try {
      const result = await pool.query(query, values);
      console.log('Event added successfully:', result.rows[0]);
      res.status(201).json({
        message: 'Event added successfully',
        event: result.rows[0]
      });
    } catch (error) {
      console.log('Error adding event:', error);
      res.status(500).json({ error: 'Failed to add event' });
    }
  });
};

module.exports = {
  getEvents,
  addEvent
};
