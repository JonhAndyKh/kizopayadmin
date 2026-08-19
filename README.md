# KizoPay Admin

Standalone admin dashboard for the KizoPay game top-up store. Provides login,
order dashboard, game visibility management, product overrides, promo slides,
and promo codes.

## Configuration

The API origin is configurable via environment variable at build time:

```
VITE_API_ORIGIN=https://your-api-host.example.com
```

- Leave it empty to send relative `/api/...` requests to the same origin
  (useful when the admin site is served behind the same proxy as the API).
- All admin endpoints require a JWT obtained by logging in; unauthenticated
  requests are rejected by the API.

## Develop

```
npm install
npm run dev
```

## Build

```
VITE_API_ORIGIN=https://your-api-host.example.com npm run build
```

Static output is written to `dist/`, deployable to any static host.
