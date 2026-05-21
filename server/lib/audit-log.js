const { db, isFirebaseAdminReady } = require("./firebase-admin");

const AUDIT_LOG_COLLECTION = "adminAuditLogs";

async function writeAuditLog({ action, actor = "admin", details = {}, req }) {
  if (!isFirebaseAdminReady || !db) {
    return false;
  }

  try {
    await db.collection(AUDIT_LOG_COLLECTION).add({
      action,
      actor,
      details,
      ip: req?.ip || null,
      userAgent: req?.get?.("user-agent") || null,
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    console.warn(`[AuditLog] Failed to write audit log: ${error.message}`);
    return false;
  }
}

module.exports = {
  writeAuditLog,
};
