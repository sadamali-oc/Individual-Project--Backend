const {Router} = require('express');
const controller = require('./eventController');

const router = Router();

router.get('/',controller.getEvents);
module.exports = router;