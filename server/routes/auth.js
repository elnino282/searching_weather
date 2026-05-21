const express = require("express");
const router = express.Router();
const {
  clearAdminSessionCookie,
  constantTimePasswordCompare,
  getAdminSession,
  signAdminSessionCookie,
} = require("../lib/auth");

function isAdminPasswordConfigured() {
  return typeof process.env.ADMIN_PASSWORD === "string" && process.env.ADMIN_PASSWORD.length > 0;
}

router.post("/login", (req, res) => {
  const { role, password } = req.body || {};

  if (role === "guest") {
    clearAdminSessionCookie(res);
    return res.status(200).json({ role: "guest" });
  }

  if (role !== "admin") {
    return res.status(400).json({ error: "Invalid login role." });
  }

  if (!isAdminPasswordConfigured()) {
    return res.status(503).json({ error: "Admin login is not configured." });
  }

  const passwordMatches = constantTimePasswordCompare(
    typeof password === "string" ? password : "",
    process.env.ADMIN_PASSWORD
  );

  if (!passwordMatches) {
    clearAdminSessionCookie(res);
    return res.status(401).json({ error: "Invalid admin credentials." });
  }

  signAdminSessionCookie(res);
  return res.status(200).json({ role: "admin" });
});

router.post("/logout", (_req, res) => {
  clearAdminSessionCookie(res);
  return res.status(200).json({ role: "guest" });
});

router.get("/me", (req, res) => {
  const session = getAdminSession(req);
  if (session) {
    return res.status(200).json({ role: "admin" });
  }

  return res.status(200).json({ role: "guest" });
});

module.exports = router;
