const express = require("express");
const router = express.Router();
const statsController = require("../controllers/statsController");

router.get("/noActiveUsers", statsController.noActiveUsers);
router.get("/activeUsers", statsController.getActiveUsers);
router.put("/activeUsers", statsController.updateActiveUsers);
router.get("/sources", statsController.getSources);

module.exports = router;
