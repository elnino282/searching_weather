const express = require("express");
const {
  getPublicConfig,
  subscribePublicConfig,
} = require("../lib/runtime-config");

const router = express.Router();
const HEARTBEAT_INTERVAL_MS = 25 * 1000;

function sendSseEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

router.get("/public", async (_req, res) => {
  const publicConfig = await getPublicConfig({ force: true });
  return res.status(200).json(publicConfig);
});

router.get("/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const initialConfig = await getPublicConfig();
  sendSseEvent(res, "config", initialConfig);

  const unsubscribe = subscribePublicConfig((publicConfig) => {
    sendSseEvent(res, "config", publicConfig);
  });

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, HEARTBEAT_INTERVAL_MS);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

module.exports = router;
