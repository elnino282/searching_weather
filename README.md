# ☁️ WeCliFor – Weather & Climate Forecast App

**WeCliFor** (Weather Climate Forecast) là ứng dụng tra cứu thời tiết hiện đại, hỗ trợ PWA, đa ngôn ngữ (Tiếng Việt / English), với hệ thống cảnh báo thời tiết thông minh qua push notification.

## 📑 Mục lục

- [Tổng quan kiến trúc](#-tổng-quan-kiến-trúc)
- [Tính năng chính](#-tính-năng-chính)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt và chạy Local](#-cài-đặt-và-chạy-local)
  - [1. Clone repository](#1-clone-repository)
  - [2. Cài đặt Backend (Server)](#2-cài-đặt-backend-server)
  - [3. Cài đặt Frontend (Client)](#3-cài-đặt-frontend-client)
  - [4. Chạy đồng thời Client & Server](#4-chạy-đồng-thời-client--server)
- [Cấu hình Firebase (Tùy chọn)](#-cấu-hình-firebase-tùy-chọn)
- [Triển khai lên AWS (Production)](#-triển-khai-lên-aws-production)
- [Tham chiếu biến môi trường](#-tham-chiếu-biến-môi-trường)
- [API Reference](#-api-reference)
- [Kiểm thử](#-kiểm-thử)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Xử lý sự cố](#-xử-lý-sự-cố)

---

## 🏗 Tổng quan kiến trúc

```
┌─────────────────────────┐         ┌─────────────────────────────┐
│     Client (Next.js)    │  HTTP   │     Server (Express.js)     │
│    AWS Amplify Hosting  │ ◄─────► │    AWS Lambda + API Gateway │
│    Port: 3000 (dev)     │         │    Port: 4000 (dev)         │
└─────────┬───────────────┘         └──────────┬──────────────────┘
          │                                    │
          │ Firebase SDK                       │ Firebase Admin SDK
          ▼                                    ▼
┌─────────────────────────┐         ┌──────────────────────┐
│   Firebase Cloud        │         │   Firestore Database │
│   Messaging (FCM)       │         │   (Subscriptions,    │
│   Push Notifications    │         │    Runtime Config)    │
└─────────────────────────┘         └──────────┬───────────┘
                                               │
                                    ┌──────────▼───────────┐
                                    │  OpenWeather API     │
                                    │  Google Places API   │
                                    └──────────────────────┘
```

| Thành phần | Công nghệ | Mô tả |
|---|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, SCSS | Giao diện người dùng, PWA |
| **Backend** | Express 4, Node.js, JavaScript | REST API, business logic |
| **Database** | Firestore (NoSQL) | Lưu subscriptions, runtime config |
| **Push Notification** | Firebase Cloud Messaging | Cảnh báo thời tiết real-time |
| **Weather Data** | OpenWeather API (OneCall 3.0) | Dữ liệu thời tiết current/hourly/daily |
| **Place Images** | Google Places API | Ảnh nền thành phố |
| **Infrastructure** | AWS SAM, Lambda, API Gateway, Amplify, EventBridge | Serverless deployment |
| **CI/CD** | GitHub Actions | Tự động chạy tests khi push/PR |

---

## ✨ Tính năng chính

### Người dùng (Guest / User)

- 🔍 **Tra cứu thời tiết** — Tìm kiếm theo tên thành phố với gợi ý tự động
- 📊 **Dashboard đa dạng** — Thời tiết hiện tại, theo giờ (biểu đồ line graph), theo ngày
- 🌡 **Chuyển đổi đơn vị** — Metric (°C, km/h) ↔ Imperial (°F, mph)
- 🌏 **Đa ngôn ngữ** — Tiếng Việt / English, chuyển đổi tức thì
- ⭐ **Yêu thích** — Lưu danh sách thành phố yêu thích (localStorage)
- 🔔 **Cảnh báo thời tiết** — Thiết lập ngưỡng cảnh báo nhiệt độ, gió, mưa; nhận push notification
- 💡 **Gợi ý hoạt động** — Đề xuất hoạt động phù hợp thời tiết (outdoor/indoor)
- ⏰ **Tìm thời điểm tốt nhất** — Phân tích giờ tốt nhất cho các hoạt động ngoài trời
- 📸 **Chia sẻ snapshot** — Chụp và chia sẻ hình ảnh thời tiết
- 🌐 **PWA** — Cài đặt như app native, hoạt động offline cơ bản
- 💨 **Chất lượng không khí (AQI)** — Hiển thị chỉ số chất lượng không khí (bật/tắt được)

### Quản trị viên (Admin)

- 🔐 **Đăng nhập admin** — Xác thực bằng password, session HMAC-SHA256
- 📡 **Health check** — Trạng thái server, database, Firebase, API usage
- ⚙️ **Feature flags** — Bật/tắt tính năng runtime (ví dụ: AQI)
- 🔑 **Quản lý API key** — Xem, validate, cập nhật OpenWeather API key mà không cần redeploy
- 📢 **Broadcast notification** — Gửi thông báo đến tất cả user đã đăng ký
- 📋 **Audit log** — Ghi lại hành động admin
- 📈 **API metrics** — Thống kê số lượng request, latency, quota usage

---

## 📋 Yêu cầu hệ thống

### Bắt buộc

| Phần mềm | Phiên bản tối thiểu | Kiểm tra |
|---|---|---|
| **Node.js** | 20.x trở lên | `node -v` |
| **npm** | 10.x trở lên | `npm -v` |
| **Git** | 2.x trở lên | `git --version` |

### API Keys cần đăng ký

| API | Mục đích | Đăng ký |
|---|---|---|
| **OpenWeather API** | Dữ liệu thời tiết (bắt buộc) | [openweathermap.org](https://openweathermap.org/api) — cần gói **One Call API 3.0** |
| **Google Places API** | Ảnh nền thành phố (tùy chọn) | [Google Cloud Console](https://console.cloud.google.com/) |

### Tùy chọn (cho Push Notification & Alerts)

| Phần mềm | Mục đích |
|---|---|
| **Firebase project** | Push notification, Firestore database |
| **Firebase service account JSON** | Backend xác thực với Firebase Admin |
| **VAPID key** | Web Push trên trình duyệt |

### Tùy chọn (cho Production deployment)

| Phần mềm | Mục đích |
|---|---|
| **AWS CLI** | Deploy lên AWS |
| **AWS SAM CLI** | Build và deploy Lambda |

---

## 🚀 Cài đặt và chạy Local

### 1. Clone repository

```bash
git clone <repository-url>
cd searching_weather
```

### 2. Cài đặt Backend (Server)

```bash
# Di chuyển vào thư mục server
cd server

# Cài đặt dependencies
npm install

# Tạo file cấu hình từ template
cp .env.example .env
```

Mở file `server/.env` và điền các giá trị:

```ini
# Server
PORT=4000
NODE_ENV=development

# CORS — cho phép client kết nối
CORS_ORIGIN=http://localhost:3000
CLIENT_ORIGIN=http://localhost:3000

# OpenWeather API (BẮT BUỘC)
OPEN_WEATHER_API_KEY=your_openweather_api_key_here

# Google Places API (TÙY CHỌN — bỏ trống nếu không dùng)
GOOGLE_PLACES_API_KEY=

# Giới hạn quota OpenWeather mỗi ngày
OPENWEATHER_DAILY_QUOTA_LIMIT=1000

# Admin auth (đặt password để đăng nhập admin)
ADMIN_PASSWORD=your_admin_password
ADMIN_SESSION_SECRET=any_long_random_string_at_least_32_chars

# Firebase Admin SDK (TÙY CHỌN — bỏ trống nếu không dùng notifications)
FIREBASE_SERVICE_ACCOUNT=
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

# Chu kỳ kiểm tra alert (phút)
ALERT_CHECK_INTERVAL_MINUTES=60
```

> [!IMPORTANT]
> **Tối thiểu chỉ cần `OPEN_WEATHER_API_KEY`** để server hoạt động. Các tính năng Firebase (alerts, notifications, runtime config) sẽ tự động tắt nếu không cấu hình Firebase.

Khởi động server:

```bash
npm run dev
```

Server sẽ chạy tại **http://localhost:4000**. Kiểm tra nhanh:

```bash
curl "http://localhost:4000/api?location=Hanoi&units=metric"
```

### 3. Cài đặt Frontend (Client)

Mở **terminal mới** (giữ server đang chạy):

```bash
# Quay lại thư mục gốc nếu đang ở server/
cd ../client

# Cài đặt dependencies
npm install
```

Tạo file `client/.env.local` với nội dung:

```ini
# Backend API URL (BẮT BUỘC)
NEXT_PUBLIC_BACKEND_URI=http://localhost:4000/api

# Config stream (tắt trong local development)
NEXT_PUBLIC_CONFIG_STREAM_ENABLED=false

# Firebase Web SDK (TÙY CHỌN — cần cho push notifications)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

> [!NOTE]
> Nếu không cần push notification, chỉ cần đặt `NEXT_PUBLIC_BACKEND_URI`. Các biến Firebase bỏ trống thì tính năng notification sẽ tự động ẩn.

Khởi động client:

```bash
npm run dev
```

Client sẽ chạy tại **http://localhost:3000**. Mở trình duyệt và truy cập URL này.

### 4. Chạy đồng thời Client & Server

Bạn cần **2 terminal** chạy song song:

| Terminal | Thư mục | Lệnh | URL |
|---|---|---|---|
| Terminal 1 | `server/` | `npm run dev` | http://localhost:4000 |
| Terminal 2 | `client/` | `npm run dev` | http://localhost:3000 |

---

## 🔥 Cấu hình Firebase (Tùy chọn)

Chỉ cần cấu hình nếu muốn sử dụng **push notification** và **weather alerts**.

### Bước 1: Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Bật **Firestore Database** (chế độ Native)
4. Bật **Cloud Messaging**

### Bước 2: Lấy Web SDK Config

1. Vào **Project Settings** → **General** → **Your apps**
2. Thêm **Web app** nếu chưa có
3. Copy các giá trị config vào `client/.env.local`:

```ini
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Bước 3: Tạo VAPID Key

1. Vào **Project Settings** → **Cloud Messaging** → **Web configuration**
2. Click **Generate key pair**
3. Copy VAPID key vào `client/.env.local`:

```ini
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BLk9...
```

### Bước 4: Tạo Firebase Messaging Service Worker

File `client/public/firebase-messaging-sw.js` dùng cho background push notification và chứa Firebase Web SDK config của từng project. File này đã được thêm vào `.gitignore`, vì vậy không commit lên Git.

Sau khi clone repo hoặc khi deploy frontend, tạo file `client/public/firebase-messaging-sw.js` trên môi trường tương ứng và điền config Firebase của bạn:

```js
/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "your_firebase_api_key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(
    payload.notification?.title ?? "Weather alert",
    {
      body: payload.notification?.body ?? "You have a new weather alert.",
      icon: "/static/weather-icon.png",
      badge: "/static/weather-icon.png",
      tag: payload.data?.alertId ?? "weather-alert",
      data: payload.data,
    }
  );
});
```

> [!IMPORTANT]
> Nếu API key/config này đã từng được commit hoặc push lên remote, hãy rotate/restrict key trong Firebase/Google Cloud Console trước khi deploy production.

### Bước 5: Service Account cho Backend

1. Vào **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Lưu file JSON vào `server/serviceAccountKey.json`

> [!CAUTION]
> File `serviceAccountKey.json` chứa credentials nhạy cảm. **KHÔNG** commit file này lên Git. File đã được thêm vào `server/.gitignore`.

---

## ☁️ Triển khai lên AWS (Production)

Xem chi tiết tại [DEPLOYMENT.md](./DEPLOYMENT.md). Tóm tắt các bước:

1. **Tạo Amplify app** từ Git repo (frontend)
2. **Tạo AWS Secrets** trong Secrets Manager (`weaclifor/prod/app` và `weaclifor/prod/firebaseServiceAccount`)
3. **Deploy backend** bằng AWS SAM (`sam build && sam deploy --guided`)
4. **Cập nhật Amplify environment variables** với Backend API URL
5. **Xác minh** — truy cập URL Amplify, tìm kiếm thành phố, test admin login

---

## 📖 Tham chiếu biến môi trường

### Server (`server/.env`)

| Biến | Bắt buộc | Mô tả | Giá trị mặc định |
|---|:---:|---|---|
| `PORT` | ❌ | Port chạy server | `4000` |
| `NODE_ENV` | ❌ | Môi trường chạy | `development` |
| `CORS_ORIGIN` | ❌ | Origin cho phép CORS (phân tách bằng dấu `,`) | Cho phép tất cả |
| `CLIENT_ORIGIN` | ❌ | Fallback cho `CORS_ORIGIN` | — |
| `OPEN_WEATHER_API_KEY` | ✅ | API key OpenWeather | — |
| `GOOGLE_PLACES_API_KEY` | ❌ | API key Google Places (ảnh thành phố) | — |
| `OPENWEATHER_DAILY_QUOTA_LIMIT` | ❌ | Giới hạn request/ngày | `1000` |
| `ADMIN_PASSWORD` | ❌* | Mật khẩu admin login | — |
| `ADMIN_SESSION_SECRET` | ❌* | Secret ký session token | Dev-only fallback |
| `FIREBASE_SERVICE_ACCOUNT` | ❌ | JSON string service account | — |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | ❌ | Đường dẫn file service account | `./serviceAccountKey.json` |
| `ALERT_CHECK_INTERVAL_MINUTES` | ❌ | Chu kỳ kiểm tra alert (phút) | `15` |

> \* Bắt buộc trong production (`NODE_ENV=production`)

### Client (`client/.env.local`)

| Biến | Bắt buộc | Mô tả |
|---|:---:|---|
| `NEXT_PUBLIC_BACKEND_URI` | ✅ | URL backend API (ví dụ: `http://localhost:4000/api`) |
| `NEXT_PUBLIC_CONFIG_STREAM_ENABLED` | ❌ | Bật SSE config stream (`true`/`false`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ❌ | Firebase Web API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ❌ | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ❌ | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ❌ | Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ❌ | Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ❌ | Firebase App ID |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | ❌ | Firebase Web Push VAPID Key |

---

## 📡 API Reference

Base URL: `http://localhost:4000` (development) hoặc `https://<api-id>.execute-api.<region>.amazonaws.com` (production)

### Public Endpoints

| Method | Endpoint | Mô tả | Parameters |
|---|---|---|---|
| `GET` | `/api?location=<city>&units=<metric\|imperial>` | Tra cứu thời tiết | `location` (bắt buộc), `units` (mặc định: `metric`) |
| `GET` | `/api/config/public` | Lấy config công khai (feature flags) | — |
| `GET` | `/api/config/stream` | SSE stream config thay đổi | — |

### Auth Endpoints

| Method | Endpoint | Mô tả | Body |
|---|---|---|---|
| `POST` | `/api/auth/login` | Đăng nhập | `{ "role": "admin", "password": "..." }` hoặc `{ "role": "guest" }` |
| `POST` | `/api/auth/logout` | Đăng xuất | — |
| `GET` | `/api/auth/me` | Kiểm tra session hiện tại | — |

### Alert Endpoints

| Method | Endpoint | Mô tả | Body |
|---|---|---|---|
| `POST` | `/api/alerts/subscribe` | Đăng ký / cập nhật alert | `{ "fcmToken": "...", "alerts": [...] }` |
| `GET` | `/api/alerts/subscribe/:token` | Lấy alert preferences | — |
| `DELETE` | `/api/alerts/subscribe` | Xóa subscription | `{ "fcmToken": "..." }` |

### Admin Endpoints (yêu cầu session admin)

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/admin/me` | Xác minh quyền admin |
| `GET` | `/api/admin/health` | Health check tổng hợp |
| `GET` | `/api/admin/config` | Lấy config hiện tại |
| `PATCH` | `/api/admin/config/features` | Cập nhật feature flags |
| `GET` | `/api/admin/openweather-key` | Thông tin API key (masked) |
| `POST` | `/api/admin/openweather-key` | Cập nhật API key |
| `POST` | `/api/admin/broadcast` | Gửi broadcast notification |

---

## 🧪 Kiểm thử

### Chạy tất cả tests

```bash
# Từ thư mục gốc
npm run test:all
```

### Server tests (Jest)

```bash
cd server

# Chạy tests
npm test

# Chạy với coverage report
npm run test:coverage

# Chạy chế độ watch
npm run test:watch
```

**Test structure:**
- `server/tests/unit/` — Unit tests cho các module trong `lib/`
- `server/tests/integration/` — Integration tests cho các routes
- `server/tests/helpers/` — Test utilities và mock helpers

### Client tests (Vitest)

```bash
cd client

# Chạy tests
npm test

# Chạy với coverage report
npm run test:coverage

# Chạy chế độ watch
npm run test:watch
```

**Test structure:**
- `client/tests/unit/` — Unit tests cho hooks, context, components

### End-to-End tests (Playwright)

```bash
cd client

# Cài đặt Playwright browsers (chạy lần đầu)
npx playwright install --with-deps chromium

# Chạy E2E tests
npm run test:e2e
```

**Test structure:**
- `client/tests/e2e/` — E2E tests cho user flows

### Tổng quan test coverage

| Loại test | Framework | Số lượng | Thư mục |
|---|---|---|---|
| Server Unit | Jest | 6 test files | `server/tests/unit/` |
| Server Integration | Jest + Supertest | 4 test files | `server/tests/integration/` |
| Client Unit | Vitest + Testing Library | 5 test files | `client/tests/unit/` |
| Client E2E | Playwright | 1 spec file | `client/tests/e2e/` |

---

## 📂 Cấu trúc dự án

```
searching_weather/
├── .github/
│   └── workflows/
│       └── test.yml                # CI pipeline (backend + frontend + e2e)
├── client/                         # ── Frontend (Next.js 15) ──
│   ├── app/
│   │   ├── admin/
│   │   │   └── page.tsx            # Trang admin dashboard
│   │   ├── components/
│   │   │   ├── activity-finder/    # Tìm thời điểm hoạt động tốt nhất
│   │   │   ├── admin/              # Admin dashboard cards (8 files)
│   │   │   ├── alerts/             # Banner + settings cảnh báo thời tiết
│   │   │   ├── auth/               # Login page, auth gate
│   │   │   ├── favorites/          # Quản lý thành phố yêu thích
│   │   │   ├── pwa/                # Network status banner
│   │   │   ├── recommendations/    # Gợi ý hoạt động theo thời tiết
│   │   │   ├── weather-dashboard/  # Dashboard chính (current/hourly/daily)
│   │   │   ├── header.tsx          # Header desktop
│   │   │   ├── navbar.tsx          # Navbar mobile (responsive)
│   │   │   ├── search-bar.tsx      # Thanh tìm kiếm + gợi ý thành phố
│   │   │   ├── toggle.tsx          # Toggle đơn vị °C/°F
│   │   │   ├── language-toggle.tsx # Toggle ngôn ngữ Vi/En
│   │   │   ├── line-graph.tsx      # Biểu đồ nhiệt độ theo giờ
│   │   │   └── weather-app.tsx     # App shell chính
│   │   ├── context/                # React Context providers (7 files)
│   │   ├── hooks/                  # Custom hooks (6 files)
│   │   ├── lib/                    # Firebase config, storage utils
│   │   ├── styles/                 # SCSS stylesheets
│   │   ├── types/                  # TypeScript type definitions
│   │   ├── utils/                  # Utility functions
│   │   ├── layout.tsx              # Root layout (metadata, PWA)
│   │   └── page.tsx                # Trang chính
│   ├── public/
│   │   ├── firebase-messaging-sw.js  # Local Firebase Messaging service worker (gitignored)
│   │   ├── sw.js                     # PWA service worker
│   │   ├── manifest.json             # PWA manifest
│   │   └── icon.ico                  # App icon
│   ├── tests/                      # Test files
│   ├── next.config.ts              # Next.js configuration
│   ├── vitest.config.ts            # Vitest configuration
│   ├── playwright.config.ts        # Playwright configuration
│   ├── eslint.config.mjs           # ESLint configuration
│   └── package.json
├── server/                         # ── Backend (Express.js) ──
│   ├── lib/
│   │   ├── api-metrics.js          # API call tracking, quota guard, latency
│   │   ├── audit-log.js            # Ghi log hành động admin
│   │   ├── auth.js                 # HMAC session tokens, admin middleware
│   │   ├── firebase-admin.js       # Firebase Admin SDK initialization
│   │   ├── runtime-config.js       # Hot-reload config từ Firestore
│   │   ├── weather-checker.js      # Cron job kiểm tra alerts & gửi notification
│   │   └── weather-service.js      # Gọi OpenWeather & Google Places API
│   ├── routes/
│   │   ├── admin.js                # Admin endpoints (health, config, broadcast)
│   │   ├── alerts.js               # Alert subscription CRUD
│   │   ├── auth.js                 # Login / logout / session check
│   │   └── config.js               # Public config & SSE stream
│   ├── tests/                      # Test files (unit + integration)
│   ├── index.js                    # Express app factory & dev server
│   ├── lambda.js                   # AWS Lambda handlers
│   ├── jest.config.cjs             # Jest configuration
│   ├── .env.example                # Template biến môi trường
│   └── package.json
├── template.yaml                   # AWS SAM template (Lambda + API Gateway)
├── samconfig.toml                  # SAM deployment parameters
├── amplify.yml                     # AWS Amplify build settings
├── DEPLOYMENT.md                   # Hướng dẫn deploy lên AWS
├── DEPLOYMENT_REPORT.md            # Báo cáo trạng thái deploy
├── package.json                    # Root workspace scripts
└── README.md                       # 📄 File này
```

---

## 🔧 Xử lý sự cố

### Server không khởi động được

| Triệu chứng | Nguyên nhân | Giải pháp |
|---|---|---|
| `ADMIN_SESSION_SECRET is required` | Thiếu secret trong production | Thêm `ADMIN_SESSION_SECRET` vào `.env` |
| `Firebase Admin initialization failed` | Service account không hợp lệ | Kiểm tra file `serviceAccountKey.json` hoặc biến `FIREBASE_SERVICE_ACCOUNT` |
| `Port 4000 is already in use` | Port bị chiếm | Đổi `PORT` trong `.env` hoặc tắt process đang dùng port |

### Client không hiển thị dữ liệu

| Triệu chứng | Nguyên nhân | Giải pháp |
|---|---|---|
| Trang trắng / lỗi fetch | `NEXT_PUBLIC_BACKEND_URI` sai hoặc thiếu | Kiểm tra `client/.env.local`, đảm bảo server đang chạy |
| "No results found" | Tên thành phố không tồn tại trong database gợi ý | Thử tên thành phố bằng tiếng Anh (ví dụ: "Ho Chi Minh City") |
| "API Limit Exceeded" | Vượt quota OpenWeather | Chờ đến ngày hôm sau hoặc tăng `OPENWEATHER_DAILY_QUOTA_LIMIT` |

### Push Notification không hoạt động

| Triệu chứng | Nguyên nhân | Giải pháp |
|---|---|---|
| Không thấy nút bật notification | Thiếu Firebase config trên client | Điền đầy đủ biến `NEXT_PUBLIC_FIREBASE_*` trong `.env.local` |
| Permission denied | User chưa cấp quyền notification | Click "Allow" khi trình duyệt hỏi |
| Notification gửi không đến | FCM token hết hạn | Xóa subscription cũ, đăng ký lại |

### Lỗi khi chạy tests

| Triệu chứng | Nguyên nhân | Giải pháp |
|---|---|---|
| `Cannot find module` khi test server | Chưa install dependencies | Chạy `npm install` trong `server/` |
| Playwright tests fail | Chưa cài browsers | Chạy `npx playwright install --with-deps chromium` |
| E2E tests timeout | Server chưa chạy | E2E tests cần server chạy song song |

---

## 👥 Hướng dẫn sử dụng

### Đăng nhập

Khi mở ứng dụng lần đầu, bạn sẽ thấy màn hình đăng nhập:

- **Guest** — Nhấn nút đăng nhập Guest để sử dụng các tính năng cơ bản
- **Admin** — Nhập mật khẩu admin (đã cấu hình trong `ADMIN_PASSWORD`) để truy cập panel quản trị

### Tra cứu thời tiết

1. Nhập tên thành phố vào thanh tìm kiếm (hỗ trợ gợi ý tự động)
2. Nhấn **Enter** hoặc click icon 🔍
3. Dashboard hiển thị: thời tiết hiện tại, dự báo theo giờ (biểu đồ), dự báo 7 ngày

### Chuyển đổi đơn vị & ngôn ngữ

- Click toggle **C/F** trên header để chuyển Celsius ↔ Fahrenheit
- Click toggle **Vi/En** để chuyển ngôn ngữ

### Quản lý yêu thích

- Click icon ⭐ trên card thời tiết để thêm thành phố vào yêu thích
- Mở panel yêu thích bằng icon ⭐ trên header
- Click vào thành phố trong danh sách để xem nhanh

### Thiết lập cảnh báo thời tiết

1. Cuộn xuống phần **"Cảnh báo thời tiết"** trên dashboard
2. Cấp quyền notification khi được hỏi
3. Thêm rule mới: chọn metric (nhiệt độ/gió/mưa), ngưỡng, so sánh (trên/dưới)
4. Server sẽ tự động kiểm tra và gửi notification khi điều kiện thỏa mãn

### Admin Dashboard

Truy cập bằng cách đăng nhập admin → click **"Trung tâm điều khiển"** hoặc truy cập `/admin`:

- **Health** — Xem trạng thái server, database, Firebase
- **API Usage** — Thống kê số request OpenWeather, quota còn lại
- **API Key** — Xem (masked), validate, cập nhật OpenWeather key
- **Feature Flags** — Bật/tắt tính năng AQI
- **Broadcast** — Gửi thông báo đến tất cả user đăng ký notification
- **Audit Log** — Xem lịch sử hành động admin

---

## 📄 License

ISC
