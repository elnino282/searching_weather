const express = require("express");
const request = require("supertest");

const authRouter = require("../../routes/auth");

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  return app;
}

describe("auth routes", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "super-admin-password";
  });

  test("guest login succeeds without password", async () => {
    const app = createApp();
    const response = await request(app).post("/api/auth/login").send({ role: "guest" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ role: "guest" });
  });

  test("admin login fails with wrong password", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/auth/login")
      .send({ role: "admin", password: "wrong-password" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid admin credentials." });
    expect(JSON.stringify(response.body)).not.toContain("super-admin-password");
  });

  test("admin login succeeds and sets secure session cookie", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/auth/login")
      .send({ role: "admin", password: "super-admin-password" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ role: "admin" });
    const setCookie = response.headers["set-cookie"]?.[0] || "";
    expect(setCookie).toContain("admin_session=");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie).toContain("SameSite=Lax");
  });

  test("session lookup returns guest by default and admin after login", async () => {
    const app = createApp();
    const agent = request.agent(app);

    const guestMe = await agent.get("/api/auth/me");
    expect(guestMe.status).toBe(200);
    expect(guestMe.body).toEqual({ role: "guest" });

    const login = await agent
      .post("/api/auth/login")
      .send({ role: "admin", password: "super-admin-password" });
    expect(login.status).toBe(200);

    const adminMe = await agent.get("/api/auth/me");
    expect(adminMe.status).toBe(200);
    expect(adminMe.body).toEqual({ role: "admin" });
  });

  test("logout clears session and returns guest", async () => {
    const app = createApp();
    const agent = request.agent(app);

    await agent
      .post("/api/auth/login")
      .send({ role: "admin", password: "super-admin-password" });

    const logoutResponse = await agent.post("/api/auth/logout");
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body).toEqual({ role: "guest" });

    const meAfterLogout = await agent.get("/api/auth/me");
    expect(meAfterLogout.status).toBe(200);
    expect(meAfterLogout.body).toEqual({ role: "guest" });
  });
});
