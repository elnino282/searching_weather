import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useNotifications } from "@/app/hooks/useNotifications";
import { LAST_SYNCED_FCM_TOKEN_STORAGE_KEY } from "@/app/lib/alertSubscriptionStorage";
import { getFirebaseMessaging } from "@/app/lib/firebaseConfig";
import { deleteToken, getToken, onMessage } from "firebase/messaging";

vi.mock("@/app/context/language-provider", () => ({
  useLanguage: () => ({ language: "en" }),
}));

vi.mock("@/app/lib/firebaseConfig", () => ({
  getFirebaseMessaging: vi.fn(),
}));

vi.mock("firebase/messaging", () => ({
  deleteToken: vi.fn(async () => true),
  getToken: vi.fn(async () => "mock-token"),
  onMessage: vi.fn(() => () => {}),
}));

function setNotificationApi(permission: NotificationPermission, requestResult: NotificationPermission) {
  const notificationMock = vi.fn();
  Object.defineProperty(window, "Notification", {
    configurable: true,
    writable: true,
    value: Object.assign(notificationMock, {
      permission,
      requestPermission: vi.fn(async () => requestResult),
    }),
  });
}

describe("useNotifications", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    Object.defineProperty(window.navigator, "serviceWorker", {
      writable: true,
      value: {
        getRegistration: vi.fn(async () => null),
        register: vi.fn(async () => ({
          scope: "/firebase-cloud-messaging-push-scope",
          active: {},
          installing: null,
          waiting: null,
        })),
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })) as unknown as typeof fetch
    );
  });

  test("marks notification status unsupported when browser API is unavailable", async () => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (window as unknown as Record<string, unknown>).Notification;
    vi.mocked(getFirebaseMessaging).mockResolvedValue(null);

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permissionStatus).toBe("unsupported"));

    let token: string | null = null;
    await act(async () => {
      token = await result.current.requestNotificationPermission();
    });
    expect(token).toBeNull();
    expect(getFirebaseMessaging).not.toHaveBeenCalled();
  });

  test("handles permission denied without requesting token", async () => {
    setNotificationApi("default", "denied");
    vi.mocked(getFirebaseMessaging).mockResolvedValue(null);

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permissionStatus).toBe("default"));

    let token: string | null = null;
    await act(async () => {
      token = await result.current.requestNotificationPermission();
    });
    expect(token).toBeNull();
    await waitFor(() =>
      expect(String(result.current.notificationError || "")).toMatch(/blocked/i)
    );
    expect(vi.mocked(getToken)).not.toHaveBeenCalled();
  });

  test("registers service worker, gets token and syncs token payload to backend", async () => {
    setNotificationApi("default", "granted");
    vi.mocked(getFirebaseMessaging).mockResolvedValue({} as never);
    vi.mocked(getToken).mockResolvedValue("fcm-token-1");

    const fetchMock = vi.mocked(fetch);
    const { result } = renderHook(() => useNotifications());

    let token: string | null = null;
    await act(async () => {
      token = await result.current.requestNotificationPermission();
    });
    expect(token).toBe("fcm-token-1");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(options?.body));
    expect(payload.fcmToken).toBe("fcm-token-1");
    expect(payload).not.toHaveProperty("alerts");
    expect(localStorage.getItem(LAST_SYNCED_FCM_TOKEN_STORAGE_KEY)).toBe("fcm-token-1");
  });

  test("reports backend registration error without crashing hook", async () => {
    setNotificationApi("default", "granted");
    vi.mocked(getFirebaseMessaging).mockResolvedValue({} as never);
    vi.mocked(getToken).mockResolvedValue("fcm-token-2");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: "server failed" }),
      })) as unknown as typeof fetch
    );

    const { result } = renderHook(() => useNotifications());
    let token: string | null = null;
    await act(async () => {
      token = await result.current.requestNotificationPermission();
    });

    expect(token).toBe("fcm-token-2");
    await waitFor(() =>
      expect(String(result.current.notificationError || "")).toMatch(/500/)
    );
  });

  test("avoids duplicate backend registration for existing token", async () => {
    setNotificationApi("default", "granted");
    vi.mocked(getFirebaseMessaging).mockResolvedValue({} as never);
    vi.mocked(getToken).mockResolvedValue("fcm-token-3");

    const fetchMock = vi.mocked(fetch);
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.requestNotificationPermission();
    });
    await act(async () => {
      await result.current.requestNotificationPermission();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  test("cleans up foreground message listener on unmount", async () => {
    setNotificationApi("granted", "granted");
    vi.mocked(getFirebaseMessaging).mockResolvedValue({} as never);
    const unsubscribe = vi.fn();
    vi.mocked(onMessage).mockImplementation(() => unsubscribe);

    const { unmount } = renderHook(() => useNotifications());
    await waitFor(() => expect(vi.mocked(onMessage)).toHaveBeenCalled());

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test("disablePushNotifications removes token on client and server", async () => {
    setNotificationApi("default", "granted");
    vi.mocked(getFirebaseMessaging).mockResolvedValue({} as never);
    vi.mocked(getToken).mockResolvedValue("fcm-token-4");
    vi.mocked(deleteToken).mockResolvedValue(true);

    const fetchMock = vi.mocked(fetch);
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.requestNotificationPermission();
    });
    await act(async () => {
      await result.current.disablePushNotifications();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(result.current.fcmToken).toBeNull();
    expect(result.current.pushEnabled).toBe(false);
  });
});
