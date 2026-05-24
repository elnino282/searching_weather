const auth = require("../../lib/auth");

function createResponseDouble() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("auth library", () => {
  test("signs admin session cookie with secure defaults", () => {
    const res = createResponseDouble();
    auth.signAdminSessionCookie(res);

    const [cookieName, token, options] = res.cookie.mock.calls[0];
    expect(cookieName).toBe(auth.ADMIN_SESSION_COOKIE);
    expect(options).toEqual(
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      })
    );
    expect(auth.verifyAdminSessionToken(token)).toEqual(
      expect.objectContaining({ role: "admin" })
    );
  });

  test("rejects tampered session token", () => {
    const res = createResponseDouble();
    auth.signAdminSessionCookie(res);

    const [, token] = res.cookie.mock.calls[0];
    const tamperedToken = `${token}tampered`;

    expect(auth.verifyAdminSessionToken(tamperedToken)).toBeNull();
  });

  test("rejects expired admin session token", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const res = createResponseDouble();
    auth.signAdminSessionCookie(res);
    const [, token] = res.cookie.mock.calls[0];

    jest.setSystemTime(
      new Date("2026-01-01T00:00:00.000Z").getTime() + auth.ADMIN_SESSION_MAX_AGE_MS + 1
    );

    expect(auth.verifyAdminSessionToken(token)).toBeNull();
  });

  test("requireAdmin rejects request without valid cookie", () => {
    const req = { headers: {} };
    const res = createResponseDouble();
    const next = jest.fn();

    auth.requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Admin authentication required." });
    expect(next).not.toHaveBeenCalled();
  });

  test("requireAdmin accepts request with valid cookie", () => {
    const res = createResponseDouble();
    auth.signAdminSessionCookie(res);
    const [, token] = res.cookie.mock.calls[0];

    const req = {
      headers: {
        cookie: `${auth.ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
      },
    };
    const middlewareRes = createResponseDouble();
    const next = jest.fn();

    auth.requireAdmin(req, middlewareRes, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.adminSession).toEqual(expect.objectContaining({ role: "admin" }));
  });

  test("constantTimePasswordCompare enforces exact match", () => {
    expect(auth.constantTimePasswordCompare("abc", "abc")).toBe(true);
    expect(auth.constantTimePasswordCompare("abc", "abcd")).toBe(false);
    expect(auth.constantTimePasswordCompare("abc", "")).toBe(false);
  });
});
