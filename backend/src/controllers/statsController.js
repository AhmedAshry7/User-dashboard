const statsService = require("../services/statsService");

exports.noActiveUsers = async (req, res) => {
  const data = await statsService.noActiveUsers();
  res.json(data);
};

exports.getActiveUsers = async (req, res) => {
  try {
    const filters = req.body.filters || {};
    const users = await statsService.getActiveUsers(filters);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed" });
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
