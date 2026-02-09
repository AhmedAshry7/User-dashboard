const statsService = require("../services/statsService");

exports.noActiveUsers = async (req, res) => {
  const data = await statsService.noActiveUsers();
  res.json(data);
};

exports.getActiveUsers = async (req, res) => {
  try {
    // Extract filters from the request body
    const filters = req.body.filters || {};

    const users = await statsService.getActiveUsers(filters);

    // Send the results back to the frontend
    res.json(users);
  } catch (err) {
    // Log the full error to the console for easier troubleshooting
    console.error("Controller Error in getActiveUsers:", err);
    
    // Send a consistent error response
    res.status(500).json({ error: "Failed to fetch active users" });
  }
};


exports.getFilters = async (req, res) => {
  const data = await statsService.getFilters();
  res.json(data);
};

/* exports.updateActiveUsers = async (req, res) => {
  const { source } = req.query;
  const data = await statsService.updateActiveUsers(source);
  res.json(data);
}; */
