import { expect, test } from "@playwright/test";

type MockState = {
  isAdmin: boolean;
  lastFeaturePayload: unknown;
  lastWeatherUnit: string;
};

function createWeatherPayload(location: string, units: string) {
  const isImperial = units === "imperial";
  const now = Math.floor(Date.now() / 1000);
  const baseTemp = isImperial ? 86 : 30;
  const feelsLike = isImperial ? 90 : 32;
  const hourly = Array.from({ length: 24 }).map((_, index) => ({
    dt: now + index * 3600,
    temp: baseTemp - 2 + (index % 4),
    pop: 0.15,
    weather: [{ main: "Clear", description: "clear sky" }],
  }));
  const daily = Array.from({ length: 7 }).map((_, index) => ({
    dt: now + index * 86400,
    temp: { min: baseTemp - 4, max: baseTemp + 2 },
    weather: [{ main: "Clear", description: "clear sky" }],
    pop: 0.1,
  }));

  return {
    data: {
      name: location.charAt(0).toUpperCase() + location.slice(1),
      country: "TH",
      timezone_offset: 0,
      current: {
        dt: now,
        sunrise: now - 3600,
        sunset: now + 3600,
        temp: baseTemp,
        feels_like: feelsLike,
        humidity: 74,
        visibility: 10000,
        wind_speed: isImperial ? 12 : 5,
        wind_deg: 120,
        weather: [{ main: "Clear", description: "clear sky" }],
      },
      hourly,
      daily,
      list: [{ main: { aqi: 2 }, components: { pm2_5: 10, pm10: 16 } }],
      imageUrl: null,
    },
  };
}

async function setupCommonMocks(page: Parameters<typeof test>[0]["page"], state: MockState) {
  await page.addInitScript(() => {
    localStorage.setItem("weather-app-language", "en");
  });

  await page.route("**/countriesnow.space/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            city: "Bangkok",
            country: "Thailand",
            populationCounts: [{ value: "10000000" }],
          },
          {
            city: "Paris",
            country: "France",
            populationCounts: [{ value: "2100000" }],
          },
        ],
      }),
    });
  });

  await page.route(/\/api\/config\/stream$/, async (route) => {
    await route.abort();
  });

  await page.route(/\/api\/auth\/me$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ role: state.isAdmin ? "admin" : "guest" }),
    });
  });

  await page.route(/\/api\/auth\/login$/, async (route) => {
    const payload = route.request().postDataJSON() as {
      role?: string;
      password?: string;
    };
    if (payload.role === "guest") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ role: "guest" }),
      });
      return;
    }

    if (payload.role === "admin" && payload.password === "correct-password") {
      state.isAdmin = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ role: "admin" }),
      });
      return;
    }

    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Invalid admin credentials." }),
    });
  });

  await page.route(/\/api\/auth\/logout$/, async (route) => {
    state.isAdmin = false;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ role: "guest" }),
    });
  });

  await page.route(/\/api\/config\/public$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ features: { aqiEnabled: true } }),
    });
  });

  await page.route(/\/api\/admin\/me$/, async (route) => {
    if (!state.isAdmin) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Admin authentication required." }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ role: "admin", ok: true }),
    });
  });

  await page.route(/\/api\/admin\/health$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "UP",
        uptimeSeconds: 120,
        database: { status: "UP", latencyMs: 8 },
        firebase: { status: "UP" },
        openWeather: {
          usageToday: 12,
          quotaLimit: 1000,
          quotaPercent: 1,
          latencyAvgMs: 120,
          latencyP95Ms: 240,
          successCount: 20,
          failureCount: 0,
          quotaRejected: 0,
          lastError: null,
          byStatusCode: {},
          sampleCount: 20,
        },
      }),
    });
  });

  await page.route(/\/api\/admin\/config\/features$/, async (route) => {
    state.lastFeaturePayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ features: { aqiEnabled: false } }),
    });
  });

  await page.route(/\/api\/admin\/broadcast$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ total: 2, success: 2, failure: 0, invalidRemoved: 0 }),
    });
  });

  await page.route(/\/api\/admin\/openweather-key$/, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ source: "firestore", maskedKey: "ABCD...1234" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ source: "firestore", maskedKey: "WXYZ...9876" }),
    });
  });

  await page.route(/\/api\/alerts\/subscribe$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route(/\/api\/alerts\/subscribe\/.*/, async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "Subscription not found" }),
    });
  });

  await page.route(/\/api\/?\?.*location=.*/, async (route) => {
    const url = new URL(route.request().url());
    const location = (url.searchParams.get("location") || "toronto").toLowerCase();
    const units = (url.searchParams.get("units") || "metric").toLowerCase();
    state.lastWeatherUnit = units;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(createWeatherPayload(location, units)),
    });
  });
}

test("guest weather search flow with unit toggle", async ({ page }) => {
  const state: MockState = {
    isAdmin: false,
    lastFeaturePayload: null,
    lastWeatherUnit: "metric",
  };
  await setupCommonMocks(page, state);

  await page.goto("/");
  await page.locator("button.auth-guest-button").click();
  await expect(page.locator("section.weather-dashboard")).toBeVisible();
  await expect(page.locator("#current-location")).toContainText("Toronto");

  const searchInput = page.locator("input.search-bar");
  await searchInput.fill("Bangkok");
  await searchInput.press("Enter");
  await expect(page.locator("#current-location")).toContainText("Bangkok");

  await page.locator("button.toggle-container:not(.language-toggle)").first().click();
  await expect.poll(() => state.lastWeatherUnit).toBe("imperial");
});

test("weather fallback flow shows no results", async ({ page }) => {
  const state: MockState = {
    isAdmin: false,
    lastFeaturePayload: null,
    lastWeatherUnit: "metric",
  };
  await setupCommonMocks(page, state);

  await page.route(/\/api\/?\?.*location=.*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: null }),
    });
  });

  await page.goto("/");
  await page.locator("button.auth-guest-button").click();
  await expect(
    page.getByText(/No results found|Kh[oô]ng t[ìi]m th[ấa]y k[ếe]t qu[ảa]/i)
  ).toBeVisible();
});

test("admin login guard and success flow", async ({ page }) => {
  const state: MockState = {
    isAdmin: false,
    lastFeaturePayload: null,
    lastWeatherUnit: "metric",
  };
  await setupCommonMocks(page, state);

  await page.goto("/admin");
  await expect(page.locator("form.auth-admin-form")).toBeVisible();

  await page.locator("#admin-password").fill("wrong-password");
  await page.locator("button.auth-admin-button").click();
  await expect(page.locator(".admin-dashboard-header")).toHaveCount(0);

  await page.locator("#admin-password").fill("correct-password");
  await page.locator("button.auth-admin-button").click();
  await expect(page.locator(".admin-dashboard-header h1")).toBeVisible();
});

test("admin feature flag toggle sends expected request", async ({ page }) => {
  const state: MockState = {
    isAdmin: true,
    lastFeaturePayload: null,
    lastWeatherUnit: "metric",
  };
  await setupCommonMocks(page, state);

  await page.goto("/admin");
  await expect(page.locator(".admin-dashboard-header h1")).toBeVisible();
  await page.locator("button.feature-toggle").click();

  await expect(page.locator(".feature-flag-message")).toBeVisible();
  expect(state.lastFeaturePayload).toEqual({
    features: {
      aqiEnabled: false,
    },
  });
});

test("alert preference persists after reload", async ({ page }) => {
  const state: MockState = {
    isAdmin: false,
    lastFeaturePayload: null,
    lastWeatherUnit: "metric",
  };
  await setupCommonMocks(page, state);

  await page.goto("/");
  await page.locator("button.auth-guest-button").click();
  await expect(page.locator("section.weather-dashboard")).toBeVisible();

  await page.locator("button.alert-add-button").click();
  await page.locator("input.alert-input").fill("30");
  await page.locator("button.alert-save").click();

  await expect(page.locator(".alert-list .alert-item")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".alert-list .alert-item")).toHaveCount(1);
});

test("push permission denied flow shows clear message", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("weather-app-language", "en");
    const deniedNotification = {
      permission: "denied" as const,
      requestPermission: async () => "denied" as const,
    };
    // @ts-expect-error runtime override for E2E
    window.Notification = deniedNotification;
  });

  const state: MockState = {
    isAdmin: false,
    lastFeaturePayload: null,
    lastWeatherUnit: "metric",
  };
  await setupCommonMocks(page, state);

  await page.goto("/");
  await page.locator("button.auth-guest-button").click();
  await expect(page.locator("section.weather-dashboard")).toBeVisible();
  await expect(page.locator(".alert-push-badge.alert-push-denied").first()).toBeVisible();
});
