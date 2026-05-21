const express = require("express");
const { requireAdmin } = require("../lib/auth");
const {
  checkFirestoreHealth,
  db,
  getFirebaseAdminHealth,
  firebaseInitMessage,
  isFirebaseAdminReady,
  messaging,
} = require("../lib/firebase-admin");
const { getMetricsSummary } = require("../lib/api-metrics");
const {
  getOpenWeatherApiKeyInfo,
  getPublicConfig,
  updateOpenWeatherApiKey,
  updatePublicFeatures,
  validateOpenWeatherKey,
} = require("../lib/runtime-config");
const { writeAuditLog } = require("../lib/audit-log");

const router = express.Router();
const SUBSCRIPTIONS_COLLECTION = "subscriptions";
const BROADCAST_BATCH_SIZE = 500;
const BROADCAST_TITLE_MAX_LENGTH = 120;
const BROADCAST_BODY_MAX_LENGTH = 500;
const BROADCAST_URL_MAX_LENGTH = 300;
const OPENWEATHER_KEY_MIN_LENGTH = 16;
const OPENWEATHER_KEY_MAX_LENGTH = 128;

router.use(requireAdmin);

function validateBroadcastPayload(payload) {
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const url = typeof payload?.url === "string" ? payload.url.trim() : "";

  if (!title) {
    return { error: "title is required." };
  }

  if (title.length > BROADCAST_TITLE_MAX_LENGTH) {
    return { error: `title must be ${BROADCAST_TITLE_MAX_LENGTH} characters or fewer.` };
  }

  if (!body) {
    return { error: "body is required." };
  }

  if (body.length > BROADCAST_BODY_MAX_LENGTH) {
    return { error: `body must be ${BROADCAST_BODY_MAX_LENGTH} characters or fewer.` };
  }

  if (url) {
    if (url.length > BROADCAST_URL_MAX_LENGTH) {
      return { error: `url must be ${BROADCAST_URL_MAX_LENGTH} characters or fewer.` };
    }

    if (!url.startsWith("/") || url.startsWith("//")) {
      return { error: "url must be a relative app path." };
    }
  }

  return {
    value: {
      title,
      body,
      url: url || "/",
    },
  };
}

function isInvalidFcmTokenError(error) {
  const code = error?.code || error?.errorInfo?.code;
  return (
    code === "messaging/invalid-registration-token" ||
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-argument"
  );
}

function validateOpenWeatherKeyBody(payload) {
  const key = typeof payload?.key === "string" ? payload.key.trim() : "";

  if (!key) {
    return { error: "key is required." };
  }

  if (key.length < OPENWEATHER_KEY_MIN_LENGTH || key.length > OPENWEATHER_KEY_MAX_LENGTH) {
    return { error: "key length is invalid." };
  }

  if (!/^[A-Za-z0-9_-]+$/.test(key)) {
    return { error: "key contains invalid characters." };
  }

  return { value: key };
}

async function sendMulticastBatch(tokens, messageBase) {
  if (typeof messaging.sendEachForMulticast === "function") {
    const response = await messaging.sendEachForMulticast({
      ...messageBase,
      tokens,
    });
    return response.responses.map((sendResponse) => ({
      success: sendResponse.success,
      error: sendResponse.error,
    }));
  }

  const messages = tokens.map((token) => ({
    ...messageBase,
    token,
  }));

  if (typeof messaging.sendEach === "function") {
    const response = await messaging.sendEach(messages);
    return response.responses.map((sendResponse) => ({
      success: sendResponse.success,
      error: sendResponse.error,
    }));
  }

  return Promise.all(
    messages.map(async (message) => {
      try {
        await messaging.send(message);
        return { success: true, error: null };
      } catch (error) {
        return { success: false, error };
      }
    })
  );
}

router.get("/me", (_req, res) => {
  return res.status(200).json({ role: "admin", ok: true });
});

router.get("/health", async (_req, res) => {
  const [database, metricsSummary] = await Promise.all([
    checkFirestoreHealth(),
    Promise.resolve(getMetricsSummary()),
  ]);
  const firebase = getFirebaseAdminHealth();
  const status =
    database.status === "DOWN" && firebase.status === "DOWN"
      ? "DOWN"
      : database.status === "DOWN"
      ? "DEGRADED"
      : firebase.status === "DOWN"
        ? "DEGRADED"
        : "UP";

  return res.status(200).json({
    status,
    uptimeSeconds: Math.round(process.uptime()),
    database,
    firebase: {
      status: firebase.status,
    },
    openWeather: metricsSummary.openWeather,
  });
});

router.get("/config", async (_req, res) => {
  const publicConfig = await getPublicConfig({ force: true });
  return res.status(200).json(publicConfig);
});

router.patch("/config/features", async (req, res) => {
  try {
    const { features } = req.body || {};
    const updatedConfig = await updatePublicFeatures(features);

    await writeAuditLog({
      action: "config.features.update",
      details: {
        features: Object.keys(features || {}),
      },
      req,
    });

    return res.status(200).json(updatedConfig);
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.get("/openweather-key", async (_req, res) => {
  const keyInfo = await getOpenWeatherApiKeyInfo({ force: true });
  return res.status(200).json(keyInfo);
});

router.post("/openweather-key", async (req, res) => {
  const validation = validateOpenWeatherKeyBody(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  if (!isFirebaseAdminReady || !db) {
    return res.status(503).json({
      error: "Firestore runtime config is not available.",
    });
  }

  try {
    await validateOpenWeatherKey(validation.value);
    const keyInfo = await updateOpenWeatherApiKey(validation.value);

    await writeAuditLog({
      action: "openweather_key.update",
      details: {
        source: keyInfo.source,
        maskedKey: keyInfo.maskedKey,
      },
      req,
    });

    return res.status(200).json(keyInfo);
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      error: error.message || "Unable to update OpenWeather key.",
    });
  }
});

router.post("/broadcast", async (req, res) => {
  const validation = validateBroadcastPayload(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  if (!isFirebaseAdminReady || !db || !messaging) {
    return res.status(503).json({
      error: "Firebase messaging is not configured on this server.",
      details: firebaseInitMessage,
    });
  }

  const { title, body, url } = validation.value;

  try {
    const snapshot = await db.collection(SUBSCRIPTIONS_COLLECTION).get();
    if (snapshot.empty) {
      const counts = { total: 0, success: 0, failure: 0, invalidRemoved: 0 };
      await writeAuditLog({
        action: "broadcast",
        details: {
          title,
          bodyLength: body.length,
          counts,
        },
        req,
      });
      return res.status(200).json(counts);
    }

    const subscriptions = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const token = typeof data.fcmToken === "string" ? data.fcmToken : doc.id;
      if (token) {
        subscriptions.push({ docId: doc.id, token });
      }
    });

    let success = 0;
    let failure = 0;
    let invalidRemoved = 0;

    const messageBase = {
      notification: { title, body },
      data: {
        type: "broadcast",
        url,
      },
      webpush: {
        fcmOptions: {
          link: url,
        },
      },
    };

    for (let i = 0; i < subscriptions.length; i += BROADCAST_BATCH_SIZE) {
      const batch = subscriptions.slice(i, i + BROADCAST_BATCH_SIZE);
      const responses = await sendMulticastBatch(
        batch.map((subscription) => subscription.token),
        messageBase
      );

      for (const [index, sendResponse] of responses.entries()) {
        const subscription = batch[index];
        if (sendResponse.success) {
          success += 1;
          continue;
        }

        failure += 1;
        if (isInvalidFcmTokenError(sendResponse.error)) {
          await db
            .collection(SUBSCRIPTIONS_COLLECTION)
            .doc(subscription.docId)
            .delete();
          invalidRemoved += 1;
        }
      }
    }

    const counts = {
      total: subscriptions.length,
      success,
      failure,
      invalidRemoved,
    };

    await writeAuditLog({
      action: "broadcast",
      details: {
        title,
        bodyLength: body.length,
        counts,
      },
      req,
    });

    return res.status(200).json(counts);
  } catch (error) {
    console.error("[Admin] Broadcast failed:", error.message);
    return res.status(500).json({ error: "Failed to send broadcast notification." });
  }
});

module.exports = router;
