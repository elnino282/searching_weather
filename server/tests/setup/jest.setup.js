process.env.NODE_ENV = "test";
process.env.ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "test-admin-session-secret";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin-password";

const silenceLogsInTests = process.env.TEST_VERBOSE_LOGS !== "1";

if (silenceLogsInTests) {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
}

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});
