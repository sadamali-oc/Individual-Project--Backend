const { Router } = require("express");
const controller = require("./event.controller");

const router = Router();

router.get("/all/events", controller.getEvents);

router.post("/add/events/:userId", controller.addEvent);

router.get("/event/:userId", controller.getEventsByUserId);
router.delete("/events/:eventId", controller.deleteEvent);

module.exports = router;
