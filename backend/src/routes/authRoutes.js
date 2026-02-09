const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (username !== process.env.ADMIN_USER)
    return res.status(401).send("Invalid credentials");

  const valid = await bcrypt.compare(
    password,
    process.env.ADMIN_PASS_HASH
  );

  if (!valid) return res.status(401).send("Invalid credentials");

  const token = jwt.sign(
    { username: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token });
});

module.exports = router;
