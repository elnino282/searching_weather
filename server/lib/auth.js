const crypto = require("crypto");

const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const DEV_SESSION_SECRET = "dev-only-admin-session-secret";

let warnedAboutDevSecret = false;

if (process.env.NODE_ENV === "production" && !process.env.ADMIN_SESSION_SECRET) {
  throw new Error("ADMIN_SESSION_SECRET is required in production.");
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET is required in production.");
  }

  if (!warnedAboutDevSecret) {
    console.warn(
      "[Auth] ADMIN_SESSION_SECRET is not set. Using a development-only session secret."
    );
    warnedAboutDevSecret = true;
  }

  return DEV_SESSION_SECRET;
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_SESSION_MAX_AGE_MS,
    path: "/",
  };
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};

  return cookieHeader.split(";").reduce((cookies, cookiePart) => {
    const [rawName, ...rawValueParts] = cookiePart.trim().split("=");
    if (!rawName) return cookies;

    try {
      cookies[rawName] = decodeURIComponent(rawValueParts.join("="));
    } catch (_error) {
      cookies[rawName] = rawValueParts.join("=");
    }
    return cookies;
  }, {});
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function signValue(value) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  const maxLength = Math.max(left.length, right.length);
  const leftPadded = Buffer.alloc(maxLength);
  const rightPadded = Buffer.alloc(maxLength);

  left.copy(leftPadded);
  right.copy(rightPadded);

  return crypto.timingSafeEqual(leftPadded, rightPadded) && left.length === right.length;
}

function createAdminSessionToken() {
  const now = Date.now();
  const payload = {
    role: "admin",
    iat: now,
    exp: now + ADMIN_SESSION_MAX_AGE_MS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function verifyAdminSessionToken(token) {
  if (!token || typeof token !== "string") return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signValue(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload));
    if (payload.role !== "admin") return null;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (_error) {
    return null;
  }
}

function getAdminSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifyAdminSessionToken(cookies[ADMIN_SESSION_COOKIE]);
}

function signAdminSessionCookie(res) {
  const token = createAdminSessionToken();
  res.cookie(ADMIN_SESSION_COOKIE, token, getCookieOptions());
}

function clearAdminSessionCookie(res) {
  const { maxAge: _maxAge, ...clearOptions } = getCookieOptions();
  res.clearCookie(ADMIN_SESSION_COOKIE, clearOptions);
}

function constantTimePasswordCompare(inputPassword, expectedPassword) {
  if (typeof expectedPassword !== "string" || expectedPassword.length === 0) {
    return false;
  }

  return safeEqual(inputPassword, expectedPassword);
}

function requireAdmin(req, res, next) {
  try {
    const session = getAdminSession(req);
    if (!session) {
      return res.status(401).json({ error: "Admin authentication required." });
    }

    req.adminSession = session;
    return next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_MS,
  signAdminSessionCookie,
  verifyAdminSessionToken,
  clearAdminSessionCookie,
  getAdminSession,
  requireAdmin,
  constantTimePasswordCompare,
};
