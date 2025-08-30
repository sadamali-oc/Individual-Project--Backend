const { Router } = require("express");
const controller = require("../event/event.controller");

const router = Router();

router.get("/all/events", controller.getEvents);

router.post("/add/events/:userId", controller.addEvent);

router.get("/event/:userId", controller.getEventsByUserId);
router.delete("/events/:eventId", controller.deleteEvent);
router.get("/events/current-month", controller.getEventsForCurrentMonth);
router.put("/events/:eventId/progress", controller.updateEventProgress);
// Admin: view all organizer events
router.get("/organizer-events", controller.getAllOrganizerEvents);

// Admin: approve or reject an event
router.put("/event-status/:eventId", controller.updateEventStatusAdmin);

// Admin: delete an event
router.delete("/delete-event/:eventId", controller.deleteEventAdmin);


// User enrolls for an event
router.post("/events/:eventId/enroll/:userId", controller.enrollUserInEvent);

// User unenrolls from an event
router.delete("/events/:eventId/enroll/:userId", controller.cancelEnrollment);

// Get all users enrolled in an event
router.get("/events/:eventId/enrollments", controller.getEventEnrollments);

// Get all events a user is enrolled in
router.get("/users/:userId/enrolled-events", controller.getUserEnrolledEvents);

    

// Event chat routes
router.get("/events/:eventId/chat", controller.getEventChat);
router.post("/events/:eventId/chat",controller.postEventChat);



module.exports = router;
