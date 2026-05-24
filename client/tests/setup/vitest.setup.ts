import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = "test-vapid-key";
process.env.NEXT_PUBLIC_BACKEND_URI = "http://localhost:4000/api";

const silenceLogsInTests = process.env.TEST_VERBOSE_LOGS !== "1";

if (silenceLogsInTests) {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock {
  root = null;
  rootMargin = "";
  thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);
vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

const notificationMock = vi.fn();
Object.defineProperty(window, "Notification", {
  configurable: true,
  writable: true,
  value: Object.assign(notificationMock, {
    permission: "default",
    requestPermission: vi.fn(async () => "default"),
  }),
});

Object.defineProperty(window.navigator, "serviceWorker", {
  configurable: true,
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
