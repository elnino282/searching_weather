const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

function parseServiceAccountFromEnv() {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (inlineJson) {
    try {
      return JSON.parse(inlineJson);
    } catch (err) {
      console.warn(
        `[FirebaseAdmin] FIREBASE_SERVICE_ACCOUNT is invalid JSON (${err.message}). Falling back to FIREBASE_SERVICE_ACCOUNT_PATH.`
      );
    }
  }

  const accountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!accountPath) return null;

  // Resolve relative paths from the server process cwd (usually /server).
  const resolvedPath = path.isAbsolute(accountPath)
    ? accountPath
    : path.resolve(process.cwd(), accountPath);

  try {
    const raw = fs.readFileSync(resolvedPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Unable to load service account from path "${resolvedPath}": ${err.message}`);
  }
}

const hasGoogleManagedCredentials = Boolean(
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.K_SERVICE ||
    process.env.FUNCTION_TARGET ||
    process.env.GAE_ENV
);

let db = null;
let messaging = null;
let isFirebaseAdminReady = false;
let firebaseInitMessage = "";

try {
  const serviceAccount = parseServiceAccountFromEnv();

  if (!admin.apps.length) {
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      isFirebaseAdminReady = true;
      firebaseInitMessage = "Firebase Admin initialized with service account.";
    } else if (hasGoogleManagedCredentials) {
      admin.initializeApp();
      isFirebaseAdminReady = true;
      firebaseInitMessage = "Firebase Admin initialized with default credentials.";
    } else {
      firebaseInitMessage =
        "Firebase Admin is disabled: missing FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH.";
      console.warn(`[FirebaseAdmin] ${firebaseInitMessage}`);
    }
  } else {
    isFirebaseAdminReady = true;
    firebaseInitMessage = "Firebase Admin app already initialized.";
  }

  if (isFirebaseAdminReady) {
    db = admin.firestore();
    messaging = admin.messaging();
  }
} catch (err) {
  isFirebaseAdminReady = false;
  firebaseInitMessage = `Firebase Admin initialization failed: ${err.message}`;
  console.error(`[FirebaseAdmin] ${firebaseInitMessage}`);
}

module.exports = {
  admin,
  db,
  messaging,
  isFirebaseAdminReady,
  firebaseInitMessage,
};
