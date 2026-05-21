"use client";

export const LAST_SYNCED_FCM_TOKEN_STORAGE_KEY =
  "weather-app-last-synced-fcm-token";

export const ALERT_PREFERENCES_SYNC_STORAGE_PREFIX =
  "weather-app-alerts-last-sync-";

function hashStorageKeyPart(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

export function getAlertPreferencesSyncStorageKey(fcmToken: string): string {
  return `${ALERT_PREFERENCES_SYNC_STORAGE_PREFIX}${hashStorageKeyPart(fcmToken)}`;
}

export function clearAlertPreferencesSyncStorage(fcmToken?: string) {
  if (typeof window === "undefined") return;

  if (fcmToken) {
    window.localStorage.removeItem(getAlertPreferencesSyncStorageKey(fcmToken));
    return;
  }

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(ALERT_PREFERENCES_SYNC_STORAGE_PREFIX)) {
      window.localStorage.removeItem(key);
    }
  }
}
