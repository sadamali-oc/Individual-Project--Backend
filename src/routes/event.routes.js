const { Router } = require("express");
const controller = require("../event/event.controller");
const { verifyJWT } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/rbac.middleware");
const { checkEventOwnership } = require("../middleware/ownership.middleware");

const router = Router();

//  PUBLIC ROUTES (no authentication required) 
router.get("/all/events", controller.getEvents);
router.get("/events/current-month", controller.getEventsForCurrentMonth);
router.get("/events/auto-complete", controller.autoCompleteEvents);

//  ORGANIZER & ADMIN ROUTES (event modification) 
router.post("/add/events/:userId", verifyJWT, requireRole(["organizer", "admin"]), controller.addEvent);
router.put("/events/:eventId/progress", verifyJWT, requireRole(["organizer", "admin"]), checkEventOwnership, controller.updateEventProgress);
router.delete("/events/:eventId", verifyJWT, requireRole(["organizer", "admin"]), checkEventOwnership, controller.deleteEvent);

//  ADMIN ONLY ROUTES 
// view all organizer events
router.get("/organizer-events", verifyJWT, requireRole(["admin"]), controller.getAllOrganizerEvents);
// approve or reject an event
router.put("/event-status/:eventId", verifyJWT, requireRole(["admin"]), controller.updateEventStatusAdmin);
//delete an event
router.delete("/delete-event/:eventId", verifyJWT, requireRole(["admin"]), controller.deleteEventAdmin);

//  AUTHENTICATED USER ROUTES (any authenticated user) 
router.get("/event/:userId", verifyJWT, controller.getEventsByUserId);
router.get("/events/finished/:userId", verifyJWT, controller.getFinishedEventsByUserId);
router.get("/users/:userId/enrolled-events", verifyJWT, controller.getUserEnrolledEvents);

// User enrolls for an event
router.post("/events/:eventId/enroll/:userId", verifyJWT, controller.enrollUserInEvent);
// User unenrolls from an event
router.delete("/events/:eventId/enroll/:userId", verifyJWT, controller.cancelEnrollment);

// Get all users enrolled in an event
router.get("/events/:eventId/enrollments", verifyJWT, controller.getEventEnrollments);

// Event chat routes
router.get("/events/:eventId/chat", verifyJWT, controller.getEventChat);
router.post("/events/:eventId/chat", verifyJWT, controller.postEventChat);



module.exports = router;
