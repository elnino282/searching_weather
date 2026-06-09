# 🌤️ WeCliFor — Website Tra Cứu Thời Tiết

<div align="center">

**WeCliFor** (Weather · Climate · Forecast) là một ứng dụng web tra cứu thời tiết hiện đại, hỗ trợ người dùng xem dự báo thời tiết theo thời gian thực với giao diện đẹp mắt và đầy đủ tính năng.

[![Test](https://github.com/elnino282/searching_weather/actions/workflows/test.yml/badge.svg)](https://github.com/elnino282/searching_weather/actions/workflows/test.yml)

</div>

---

## 📋 Mục Lục

- [Tổng Quan](#-tổng-quan)
- [Tính Năng](#-tính-năng)
- [Công Nghệ Sử Dụng](#-công-nghệ-sử-dụng)
- [Kiến Trúc Hệ Thống](#-kiến-trúc-hệ-thống)
- [Cấu Trúc Thư Mục](#-cấu-trúc-thư-mục)
- [Yêu Cầu Hệ Thống](#-yêu-cầu-hệ-thống)
- [Hướng Dẫn Cài Đặt](#-hướng-dẫn-cài-đặt)
- [Biến Môi Trường](#-biến-môi-trường)
- [Chạy Ứng Dụng](#-chạy-ứng-dụng)
- [Testing](#-testing)
- [Triển Khai (Deployment)](#-triển-khai-deployment)
- [API Endpoints](#-api-endpoints)
- [Đóng Góp](#-đóng-góp)
- [Giấy Phép](#-giấy-phép)

---

## 🌍 Tổng Quan

WeCliFor là ứng dụng full-stack tra cứu thời tiết, cung cấp thông tin thời tiết hiện tại, dự báo theo giờ và theo ngày cho bất kỳ địa điểm nào trên thế giới. Ứng dụng được xây dựng theo kiến trúc **client-server** tách biệt, hỗ trợ PWA (Progressive Web App) và push notification thông qua Firebase.

### Điểm nổi bật

- 🔍 Tra cứu thời tiết theo tên thành phố với autocomplete (Google Places API)
- 📊 Dashboard trực quan với biểu đồ nhiệt độ theo giờ
- 🔔 Hệ thống cảnh báo thời tiết thông minh (push notification)
- 🌐 Hỗ trợ đa ngôn ngữ (Tiếng Việt / English)
- 📱 Thiết kế responsive, hỗ trợ PWA — có thể cài đặt như ứng dụng native
- 🛡️ Trang quản trị (Admin) với hệ thống xác thực và cấu hình runtime

---

## ✨ Tính Năng

### Người dùng

| Tính năng | Mô tả |
|---|---|
| **Tra cứu thời tiết** | Tìm kiếm thời tiết theo tên địa điểm, hỗ trợ cả metric (°C) và imperial (°F) |
| **Thời tiết hiện tại** | Hiển thị nhiệt độ, độ ẩm, tốc độ gió, áp suất, tầm nhìn, v.v. |
| **Dự báo theo giờ** | Biểu đồ đường (line graph) hiển thị xu hướng nhiệt độ trong 24–48 giờ tới |
| **Dự báo theo ngày** | Thời tiết dự báo cho 7 ngày tiếp theo |
| **Danh sách yêu thích** | Lưu các thành phố yêu thích để tra cứu nhanh |
| **Cảnh báo thời tiết** | Thiết lập cảnh báo tùy chỉnh (nhiệt độ, mưa, gió…) và nhận push notification |
| **Gợi ý hoạt động** | Đề xuất hoạt động phù hợp dựa trên điều kiện thời tiết |
| **Tìm thời điểm hoạt động** | Tìm khung giờ tốt nhất cho hoạt động ngoài trời |
| **Chia sẻ ảnh thời tiết** | Tạo snapshot thời tiết để chia sẻ lên mạng xã hội |
| **Chuyển đổi ngôn ngữ** | Hỗ trợ Tiếng Việt và Tiếng Anh |
| **Chế độ sáng/tối** | Toggle giữa giao diện sáng và tối |
| **PWA** | Cài đặt ứng dụng trên thiết bị, hoạt động offline cơ bản |

### Quản trị viên

| Tính năng | Mô tả |
|---|---|
| **Dashboard quản trị** | Theo dõi metrics API, audit log, và cấu hình hệ thống |
| **Runtime config** | Thay đổi cấu hình ứng dụng mà không cần redeploy |
| **Quota management** | Giám sát và giới hạn quota API OpenWeather hàng ngày |
| **Feature flags** | Bật/tắt tính năng từ xa qua cấu hình runtime |

---

## 🛠️ Công Nghệ Sử Dụng

### Frontend (Client)

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| **Next.js** | 15.x | React framework với SSR/SSG |
| **React** | 19.x | UI library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **SCSS (Sass)** | 1.x | Styling nâng cao |
| **Firebase** | 12.x | Push notification (FCM) |
| **React Icons** | 5.x | Thư viện icon |

### Backend (Server)

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| **Node.js** | 20+ / 22 | Runtime |
| **Express.js** | 4.x | Web framework |
| **Firebase Admin** | 13.x | Push notification server-side |
| **Axios** | 1.x | HTTP client |
| **serverless-http** | 3.x | Lambda adapter cho Express |
| **node-cron** | 4.x | Scheduled tasks (local dev) |

### Hạ tầng & DevOps

| Công nghệ | Mục đích |
|---|---|
| **AWS SAM** | Infrastructure as Code — API Gateway + Lambda |
| **AWS Lambda** | Serverless compute cho API và alert worker |
| **AWS API Gateway (HTTP API)** | HTTP endpoint |
| **AWS Secrets Manager** | Quản lý API keys và secrets |
| **AWS Amplify** | Hosting frontend (Next.js SSR) |
| **GitHub Actions** | CI/CD pipeline |

### Testing

| Công cụ | Mục đích |
|---|---|
| **Vitest** | Unit test cho frontend |
| **Jest** | Unit & integration test cho backend |
| **Playwright** | End-to-end (E2E) testing |
| **Testing Library** | Component testing utilities |
| **Supertest** | HTTP assertion cho Express |

### API bên thứ ba

| API | Mục đích |
|---|---|
| **OpenWeather API** | Dữ liệu thời tiết (current, hourly, daily) |
| **Google Places API** | Autocomplete địa điểm |
| **Firebase Cloud Messaging** | Push notification |

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────────┐     HTTPS      ┌──────────────────────────┐
│                     │ ◄────────────►  │                          │
│    Next.js Client   │                 │   AWS API Gateway (HTTP) │
│   (AWS Amplify)     │                 │           │              │
│                     │                 │           ▼              │
└─────────────────────┘                 │    AWS Lambda (Express)  │
         │                              │           │              │
         │  FCM Push                    │     ┌─────┴──────┐       │
         ▼                              │     ▼            ▼       │
┌─────────────────────┐                 │ OpenWeather   Google     │
│  Firebase Cloud     │ ◄───────────    │    API       Places API  │
│  Messaging (FCM)    │    Send         │                          │
└─────────────────────┘  Notification   └──────────────────────────┘
                                                   ▲
                                                   │ Schedule (15 min)
                                        ┌──────────┴──────────┐
                                        │  Alert Scheduler     │
                                        │  (Lambda + EventBridge)│
                                        └──────────────────────┘
```

---

## 📁 Cấu Trúc Thư Mục

```
searching_weather/
├── .github/
│   └── workflows/
│       └── test.yml                 # GitHub Actions CI pipeline
├── client/                          # 🖥️ Frontend (Next.js)
│   ├── app/
│   │   ├── admin/                   # Trang quản trị
│   │   ├── components/
│   │   │   ├── activity-finder/     # Tìm khung giờ hoạt động
│   │   │   ├── admin/               # Admin dashboard components
│   │   │   ├── alerts/              # Cảnh báo thời tiết
│   │   │   ├── auth/                # Xác thực (login, auth gate)
│   │   │   ├── favorites/           # Danh sách yêu thích
│   │   │   ├── pwa/                 # PWA network status banner
│   │   │   ├── recommendations/     # Gợi ý hoạt động
│   │   │   ├── weather-dashboard/   # Dashboard chính (current, hourly, daily)
│   │   │   ├── header.tsx           # Header component
│   │   │   ├── navbar.tsx           # Navigation bar
│   │   │   ├── search-bar.tsx       # Thanh tìm kiếm
│   │   │   ├── toggle.tsx           # Unit toggle (°C/°F)
│   │   │   ├── language-toggle.tsx  # Chuyển đổi ngôn ngữ
│   │   │   ├── line-graph.tsx       # Biểu đồ nhiệt độ
│   │   │   └── weather-app.tsx      # Component chính
│   │   ├── context/                 # React Context providers
│   │   │   ├── auth-provider.tsx
│   │   │   ├── feature-flags-provider.tsx
│   │   │   ├── language-provider.tsx
│   │   │   ├── period-provider.tsx
│   │   │   ├── pwa-provider.tsx
│   │   │   ├── unit-provider.tsx
│   │   │   └── weather-provider.tsx
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/                     # Firebase config, storage helpers
│   │   ├── styles/                  # SCSS stylesheets
│   │   ├── types/                   # TypeScript type definitions
│   │   ├── utils/                   # Utility functions
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Trang chính
│   ├── public/                      # Static assets (icons, manifest, SW)
│   ├── tests/
│   │   ├── e2e/                     # Playwright E2E tests
│   │   ├── unit/                    # Vitest unit tests
│   │   └── setup/                   # Test setup files
│   ├── next.config.ts
│   ├── playwright.config.ts
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   └── package.json
├── server/                          # ⚙️ Backend (Express.js)
│   ├── lib/
│   │   ├── api-metrics.js           # API quota tracking & metrics
│   │   ├── audit-log.js             # Audit logging
│   │   ├── auth.js                  # Authentication logic
│   │   ├── firebase-admin.js        # Firebase Admin SDK setup
│   │   ├── runtime-config.js        # Runtime configuration manager
│   │   ├── weather-checker.js       # Alert subscription checker
│   │   └── weather-service.js       # OpenWeather API integration
│   ├── routes/
│   │   ├── admin.js                 # Admin API routes
│   │   ├── alerts.js                # Weather alert routes
│   │   ├── auth.js                  # Auth routes
│   │   └── config.js                # Config routes
│   ├── tests/
│   │   ├── unit/                    # Jest unit tests
│   │   ├── integration/             # Integration tests
│   │   ├── helpers/                 # Test helpers
│   │   └── setup/                   # Test setup
│   ├── index.js                     # Express app entry point
│   ├── lambda.js                    # AWS Lambda handlers
│   ├── .env.example                 # Mẫu biến môi trường
│   └── package.json
├── template.yaml                    # AWS SAM template (IaC)
├── samconfig.toml                   # SAM deploy configuration
├── amplify.yml                      # AWS Amplify build settings
├── package.json                     # Root workspace scripts
└── .gitignore
```

---

## 💻 Yêu Cầu Hệ Thống

- **Node.js** >= 20.x
- **npm** >= 9.x
- **AWS CLI** & **AWS SAM CLI** (cho deployment)
- Tài khoản [OpenWeather](https://openweathermap.org/api) (API key)
- Tài khoản [Google Cloud](https://console.cloud.google.com/) (Places API key)
- Firebase project (cho push notification)

---

## 🚀 Hướng Dẫn Cài Đặt

### 1. Clone repository

```bash
git clone https://github.com/elnino282/searching_weather.git
cd searching_weather
```

### 2. Cài đặt dependencies

```bash
# Cài đặt dependencies cho server
cd server
npm install

# Cài đặt dependencies cho client
cd ../client
npm install
```

### 3. Cấu hình biến môi trường

#### Server

```bash
cd server
cp .env.example .env
```

Mở file `.env` và điền các giá trị:

```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
OPEN_WEATHER_API_KEY=your_openweather_api_key
GOOGLE_PLACES_API_KEY=your_google_places_api_key
ADMIN_PASSWORD=your_admin_password
ADMIN_SESSION_SECRET=your_session_secret
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

#### Client

Tạo file `client/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URI=http://localhost:4000/api
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

---

## ⚙️ Biến Môi Trường

### Server (`server/.env`)

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `PORT` | Không | Port chạy server (mặc định: `4000`) |
| `NODE_ENV` | Không | Môi trường (`development` / `production`) |
| `CORS_ORIGIN` | Không | Origin cho phép CORS (mặc định: cho phép tất cả) |
| `OPEN_WEATHER_API_KEY` | ✅ | API key từ OpenWeather |
| `GOOGLE_PLACES_API_KEY` | ✅ | API key từ Google Cloud (Places API) |
| `OPENWEATHER_DAILY_QUOTA_LIMIT` | Không | Giới hạn số lần gọi API/ngày (mặc định: `1000`) |
| `ADMIN_PASSWORD` | ✅ | Mật khẩu đăng nhập admin |
| `ADMIN_SESSION_SECRET` | ✅ | Secret cho session admin |
| `FIREBASE_SERVICE_ACCOUNT` | Có* | Firebase service account JSON (inline) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Có* | Đường dẫn file service account |
| `ALERT_CHECK_INTERVAL_MINUTES` | Không | Chu kỳ kiểm tra cảnh báo (mặc định: `15` phút) |

> *Cần ít nhất một trong hai biến Firebase.

### Client (`client/.env.local`)

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URI` | ✅ | URL API backend |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Firebase App ID |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | ✅ | Firebase VAPID key (cho push notification) |

---

## ▶️ Chạy Ứng Dụng

### Chế độ Development

Mở **2 terminal** riêng biệt:

**Terminal 1 — Backend:**

```bash
cd server
npm run dev
# Server chạy tại http://localhost:4000
```

**Terminal 2 — Frontend:**

```bash
cd client
npm run dev
# Client chạy tại http://localhost:3000
```

Mở trình duyệt và truy cập: **http://localhost:3000**

### Build Production (Client)

```bash
cd client
npm run build
npm start
```

---

## 🧪 Testing

### Chạy tất cả tests

```bash
# Từ thư mục root
npm run test:all
```

### Backend tests

```bash
cd server

# Chạy unit & integration tests
npm test

# Chạy tests với coverage report
npm run test:coverage

# Chạy tests ở chế độ watch
npm run test:watch
```

### Frontend tests

```bash
cd client

# Chạy unit tests (Vitest)
npm test

# Chạy tests với coverage
npm run test:coverage

# Chạy tests ở chế độ watch
npm run test:watch
```

### E2E tests

```bash
cd client

# Cài đặt Playwright browsers (chạy lần đầu)
npx playwright install --with-deps chromium

# Chạy E2E tests
npm run test:e2e
```

### CI/CD

Project sử dụng **GitHub Actions** để tự động chạy tests:
- ✅ Backend tests + coverage trên mỗi push/PR
- ✅ Frontend tests + coverage + build trên mỗi push/PR
- ✅ E2E tests chạy khi trigger thủ công (`workflow_dispatch`)

---

## 🚢 Triển Khai (Deployment)

### Backend — AWS SAM (Lambda + API Gateway)

```bash
# Build SAM application
sam build

# Deploy (lần đầu — guided mode)
sam deploy --guided

# Deploy (các lần sau)
sam deploy
```

SAM template (`template.yaml`) sẽ tạo:
- **WeatherHttpApi** — HTTP API Gateway với CORS configuration
- **WeatherApiFunction** — Lambda function chạy Express API
- **AlertSchedulerFunction** — Lambda function chạy theo lịch (EventBridge, mặc định 15 phút) để kiểm tra và gửi cảnh báo thời tiết

> **Lưu ý:** Secrets (API keys, Firebase credentials) được quản lý qua **AWS Secrets Manager**. Xem `template.yaml` để biết chi tiết các parameter.

### Frontend — AWS Amplify

Frontend được deploy tự động qua **AWS Amplify** khi push code lên GitHub. Cấu hình build nằm trong `amplify.yml`:

1. Kết nối repository GitHub với AWS Amplify Console
2. Amplify tự động phát hiện `amplify.yml` và build Next.js app
3. Sau khi deploy frontend, cập nhật `AppOrigin` parameter trong SAM với domain Amplify

---

## 🔌 API Endpoints

Base URL: `http://localhost:4000` (local) hoặc API Gateway URL (production)

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api?location={city}&units={metric\|imperial}` | Lấy thông tin thời tiết theo địa điểm |
| `POST` | `/api/auth/login` | Đăng nhập admin |
| `GET` | `/api/alerts/...` | Quản lý cảnh báo thời tiết |
| `POST` | `/api/alerts/...` | Tạo/cập nhật subscription cảnh báo |
| `GET` | `/api/admin/...` | Admin dashboard data |
| `GET` | `/api/config` | Lấy runtime configuration |
| `PATCH` | `/api/config` | Cập nhật runtime configuration (admin only) |

---

## 🤝 Đóng Góp

Mọi đóng góp đều được chào đón! Vui lòng thực hiện theo các bước:

1. **Fork** repository
2. Tạo **branch** mới: `git checkout -b feature/ten-tinh-nang`
3. **Commit** thay đổi: `git commit -m "feat: thêm tính năng XYZ"`
4. **Push** lên branch: `git push origin feature/ten-tinh-nang`
5. Tạo **Pull Request**

### Quy ước commit message

```
feat: thêm tính năng mới
fix: sửa lỗi
docs: cập nhật tài liệu
style: thay đổi style (không ảnh hưởng logic)
refactor: tái cấu trúc code
test: thêm/sửa tests
chore: cập nhật build tools, configs
```

---

## 📄 Giấy Phép

Dự án này được phát hành theo giấy phép **ISC**.

---

<div align="center">

Được phát triển với ❤️ bởi nhóm WeCliFor

</div>
