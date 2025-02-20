const {Router} = require('express');
const controller = require('./eventController');

const router = Router();

router.get('/all/events',controller.getEvents);

router.post('/add/event',controller.addEvent);

module.exports = router;




