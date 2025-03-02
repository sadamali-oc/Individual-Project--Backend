const { Router } = require("express");
const controller = require("./userController");

const router = Router();

// Route to get all users
router.get("/all/users", controller.getUsers);

// Route to create a new user
router.post("/user/register", controller.addUser);

router.post("/user/auth/login", controller.loginUser);

router.get("/user/profile/:userId", controller.getUserById);


router.put("/user/profile/:userId", controller.updateUserById);



module.exports = router;
