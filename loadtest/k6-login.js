// k6 load test — Auth flow
// Run: k6 run loadtest/k6-login.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const loginFailRate = new Rate("login_failures");
const loginDuration = new Trend("login_duration");
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  stages: [
    { duration: "30s", target: 20 },   // Ramp up to 20 VUs
    { duration: "1m", target: 20 },     // Stay at 20 VUs
    { duration: "30s", target: 50 },    // Ramp up to 50 VUs
    { duration: "2m", target: 50 },     // Stay at 50 VUs
    { duration: "30s", target: 100 },   // Peak at 100 VUs
    { duration: "1m", target: 100 },    // Stay at peak
    { duration: "30s", target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],  // 95% of requests under 500ms
    login_failures: ["rate<0.1"],      // Less than 10% failure rate
  },
};

export default function () {
  // Test login endpoint
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: `loadtest-${__VU}@test.com`,
      password: "testpassword",
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(loginRes, {
    "login status is 200 or 401": (r) => r.status === 200 || r.status === 401,
    "login response has body": (r) => r.body && r.body.length > 0,
    "login response time < 500ms": (r) => r.timings.duration < 500,
  });

  loginFailRate.add(loginRes.status !== 200 && loginRes.status !== 401);
  loginDuration.add(loginRes.timings.duration);

  // Test /api/auth/me (session check)
  if (loginRes.status === 200) {
    const data = JSON.parse(loginRes.body);
    const meRes = http.get(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `auth-token=${data.accessToken}` },
    });

    check(meRes, {
      "me status is 200": (r) => r.status === 200,
      "me returns user": (r) => JSON.parse(r.body).user !== null,
    });
  }

  sleep(Math.random() * 3 + 1); // 1-4s think time
}
