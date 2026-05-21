const express = require("express");
const router = express.Router();
const {
  db,
  isFirebaseAdminReady,
  firebaseInitMessage,
} = require("../lib/firebase-admin");

const SUBSCRIPTIONS_COLLECTION = "subscriptions";

function ensureFirebaseReady(res) {
  if (isFirebaseAdminReady && db) return true;
  res.status(503).json({
    error: "Firebase alerts are not configured on this server.",
    details: firebaseInitMessage,
  });
  return false;
}

function hasOwn(payload, key) {
  return Object.prototype.hasOwnProperty.call(payload || {}, key);
}

function stableStringify(value) {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function alertsAreEqual(currentAlerts, nextAlerts) {
  const normalizedCurrentAlerts = Array.isArray(currentAlerts) ? currentAlerts : [];
  return stableStringify(normalizedCurrentAlerts) === stableStringify(nextAlerts);
}

function getUserAgent(req) {
  const userAgent =
    typeof req.body?.userAgent === "string"
      ? req.body.userAgent
      : req.get("user-agent");

  return typeof userAgent === "string" && userAgent.trim()
    ? userAgent.trim().slice(0, 300)
    : null;
}

/**
 * POST /api/alerts/subscribe
 * Register or update a device's alert subscriptions.
 * Body: { fcmToken: string, alerts?: AlertPreference[], userAgent?: string }
 */
router.post("/subscribe", async (req, res) => {
  if (!ensureFirebaseReady(res)) return;

  try {
    const payload = req.body || {};
    const { fcmToken } = payload;
    const hasAlerts = hasOwn(payload, "alerts");
    const alerts = payload.alerts;

    if (!fcmToken || typeof fcmToken !== "string") {
      return res.status(400).json({ error: "fcmToken is required" });
    }

    if (hasAlerts && !Array.isArray(alerts)) {
      return res.status(400).json({ error: "alerts must be an array" });
    }

    // Use fcmToken as document ID for easy lookup & upsert
    const docRef = db.collection(SUBSCRIPTIONS_COLLECTION).doc(fcmToken);
    const docSnap = await docRef.get();
    const now = new Date();
    const userAgent = getUserAgent(req);

    if (docSnap.exists) {
      const currentData = docSnap.data() || {};
      const updates = {};
      let preferencesChanged = false;
      let tokenMetadataChanged = false;

      if (currentData.fcmToken !== fcmToken) {
        updates.fcmToken = fcmToken;
        tokenMetadataChanged = true;
      }

      if (userAgent && currentData.userAgent !== userAgent) {
        updates.userAgent = userAgent;
        tokenMetadataChanged = true;
      }

      if (hasAlerts && !alertsAreEqual(currentData.alerts, alerts)) {
        updates.alerts = alerts;
        preferencesChanged = true;
      }

      if (!preferencesChanged && !tokenMetadataChanged) {
        console.log(
          `[Alerts] Skipped duplicate subscription for token: ${fcmToken.substring(0, 20)}...`
        );
        return res.status(200).json({ success: true, skipped: true });
      }

      updates.updatedAt = now;
      await docRef.update(updates);

      console.log(
        `[Alerts] ${preferencesChanged ? "Preferences updated" : "Token registered"} for token: ${fcmToken.substring(0, 20)}...`
      );
    } else {
      const subscription = {
        fcmToken,
        createdAt: now,
        updatedAt: now,
        lastNotifiedAt: null,
      };

      if (hasAlerts) {
        subscription.alerts = alerts;
      }

      if (userAgent) {
        subscription.userAgent = userAgent;
      }

      await docRef.set(subscription);

      console.log(
        `[Alerts] ${hasAlerts ? "Preferences updated" : "Token registered"} for token: ${fcmToken.substring(0, 20)}...`
      );
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Alerts] Error saving subscription:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/alerts/subscribe/:token
 * Retrieve current alert preferences for a device.
 */
router.get("/subscribe/:token", async (req, res) => {
  if (!ensureFirebaseReady(res)) return;

  try {
    const { token } = req.params;
    const docRef = db.collection(SUBSCRIPTIONS_COLLECTION).doc(token);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    return res.status(200).json(docSnap.data());
  } catch (error) {
    console.error("[Alerts] Error fetching subscription:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/alerts/subscribe
 * Remove a device's subscription entirely.
 * Body: { fcmToken: string }
 */
router.delete("/subscribe", async (req, res) => {
  if (!ensureFirebaseReady(res)) return;

  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ error: "fcmToken is required" });
    }

    await db.collection(SUBSCRIPTIONS_COLLECTION).doc(fcmToken).delete();

    console.log(`[Alerts] Subscription deleted for token: ${fcmToken.substring(0, 20)}...`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Alerts] Error deleting subscription:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
