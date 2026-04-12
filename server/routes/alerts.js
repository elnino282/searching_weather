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

/**
 * POST /api/alerts/subscribe
 * Register or update a device's alert subscriptions.
 * Body: { fcmToken: string, alerts: AlertPreference[] }
 */
router.post("/subscribe", async (req, res) => {
  if (!ensureFirebaseReady(res)) return;

  try {
    const { fcmToken, alerts } = req.body;

    if (!fcmToken || typeof fcmToken !== "string") {
      return res.status(400).json({ error: "fcmToken is required" });
    }

    if (!Array.isArray(alerts)) {
      return res.status(400).json({ error: "alerts must be an array" });
    }

    // Use fcmToken as document ID for easy lookup & upsert
    const docRef = db.collection(SUBSCRIPTIONS_COLLECTION).doc(fcmToken);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      // Update existing subscription
      await docRef.update({
        alerts,
        updatedAt: new Date(),
      });
    } else {
      // Create new subscription
      await docRef.set({
        fcmToken,
        alerts,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastNotifiedAt: null,
      });
    }

    console.log(`[Alerts] Subscription saved for token: ${fcmToken.substring(0, 20)}...`);
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
