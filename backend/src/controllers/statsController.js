const statsService = require("../services/statsService");

exports.noActiveUsers = async (req, res) => {
  const data = await statsService.noActiveUsers();
  res.json(data);
};

exports.getActiveUsers = async (req, res) => {
  const { source } = req.query;
  try {
    const data = await statsService.getActiveUsers(source);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" }); // Return JSON, not HTML!
  }
};

exports.getSources = async (req, res) => {
  const data = await statsService.getSources();
  res.json(data);
};

exports.updateActiveUsers = async (req, res) => {
  const { source } = req.query;
  const data = await statsService.updateActiveUsers(source);
  res.json(data);
};
