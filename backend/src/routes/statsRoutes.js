const express = require("express");
const router = express.Router();
const statsController = require("../controllers/statsController");

const auth = require("../middleware/authMiddleware");

router.get("/noActiveUsers", auth, statsController.noActiveUsers);
router.post("/activeUsers", auth, statsController.getActiveUsers);
//router.put("/activeUsers", auth, statsController.updateActiveUsers);
router.get("/filters", auth, statsController.getFilters);

module.exports = router;
