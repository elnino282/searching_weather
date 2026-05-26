# AWS Deployment

This project deploys the Next.js client with AWS Amplify Hosting and the Express
server with AWS Lambda, API Gateway HTTP API, and EventBridge Scheduler through
AWS SAM.

## Prerequisites

- AWS CLI and AWS SAM CLI are installed and authenticated.
- Route53 hosts the root domain.
- An ACM certificate exists for `api.<your-domain>` in the same region as the
  Lambda/API Gateway stack.
- Amplify will manage `app.<your-domain>` for the client.

Recommended production values:

```powershell
$env:AWS_REGION="ap-southeast-1"
$ROOT_DOMAIN="<your-domain>"
$APP_DOMAIN="app.$ROOT_DOMAIN"
$API_DOMAIN="api.$ROOT_DOMAIN"
```

## Secrets

Create an application secret with these JSON keys:

```json
{
  "OPEN_WEATHER_API_KEY": "<openweather-key>",
  "GOOGLE_PLACES_API_KEY": "<google-places-key>",
  "ADMIN_PASSWORD": "<admin-password>",
  "ADMIN_SESSION_SECRET": "<long-random-secret>"
}
```

Store it as `weaclifor/prod/app`.

Store the Firebase service account JSON as the full `SecretString` for
`weaclifor/prod/firebaseServiceAccount`. The local files `server/.env` and
`server/serviceAccountKey.json` are intentionally excluded from Lambda packages.

## Backend

Validate and build:

```powershell
npm --prefix server test
sam validate
sam build
```

Deploy:

```powershell
sam deploy --guided `
  --stack-name weaclifor-api `
  --region ap-southeast-1 `
  --capabilities CAPABILITY_IAM
```

Use these parameter values when prompted:

- `AppOrigin`: `https://app.<your-domain>`
- `ApiDomainName`: `api.<your-domain>`
- `ApiCertificateArn`: ACM certificate ARN for `api.<your-domain>`
- `HostedZoneId`: Route53 hosted zone ID for the root domain
- `AppSecretName`: `weaclifor/prod/app`
- `FirebaseServiceAccountSecretName`: `weaclifor/prod/firebaseServiceAccount`
- `AlertScheduleExpression`: `rate(15 minutes)`

Smoke tests:

```powershell
curl "https://api.<your-domain>/api/config/public"
curl "https://api.<your-domain>/api?location=London&units=metric"
```

## Frontend

Amplify uses the root `amplify.yml` and `client` as the app root.

Required Amplify environment variables:

- `AMPLIFY_MONOREPO_APP_ROOT=client`
- `NEXT_PUBLIC_BACKEND_URI=https://api.<your-domain>/api`
- `NEXT_PUBLIC_CONFIG_STREAM_ENABLED=false`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

After the first successful Amplify deploy, attach the custom domain
`app.<your-domain>`.

## Verification

- Open `https://app.<your-domain>`.
- Search for a city and confirm weather data loads.
- Sign in as guest and admin.
- Confirm admin health/config/API key pages call `https://api.<your-domain>`.
- Register notifications and verify the subscription document appears in
  Firestore.
- Check CloudWatch logs for the scheduled alert Lambda after the EventBridge
  schedule interval.
