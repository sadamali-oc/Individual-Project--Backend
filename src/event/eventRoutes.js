const { Router } = require("express");
const controller = require("./eventController");

const router = Router();

router.get("/all/events", controller.getEvents);

router.post("/add/events/:userId", controller.addEvent);

router.get("/event/:userId", controller.getEventsByUserId);

module.exports = router;
