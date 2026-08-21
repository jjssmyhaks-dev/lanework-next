// k6 load test — All CRUD endpoints
// Run: k6 run loadtest/k6-api.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const failRate = new Rate("api_failures");
const duration = new Trend("api_duration");
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "test-token";

const HEADERS = {
  "Content-Type": "application/json",
  Cookie: `auth-token=${AUTH_TOKEN}`,
};

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 20 },
    { duration: "30s", target: 50 },
    { duration: "2m", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 200 }, // Stress
    { duration: "1m", target: 200 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<200"],
    api_failures: ["rate<0.05"],
  },
};

export default function () {
  const endpoints = [
    // GET endpoints (read-heavy)
    { method: "GET", url: "/api/dashboard/stats" },
    { method: "GET", url: "/api/usage" },
    { method: "GET", url: "/api/shipment" },
    { method: "GET", url: "/api/inventory" },
    { method: "GET", url: "/api/fleet/vehicles" },
    { method: "GET", url: "/api/fleet/drivers" },
    { method: "GET", url: "/api/warehouse" },
    { method: "GET", url: "/api/routes" },
    { method: "GET", url: "/api/customer" },
    { method: "GET", url: "/api/integrations" },
    { method: "GET", url: "/api/health" },
    // POST endpoints (write)
    { method: "POST", url: "/api/shipment", body: JSON.stringify({
      customer_name: "Load Test Customer",
      carrier: "Test Carrier",
      status: "pending",
    })},
    { method: "POST", url: "/api/inventory", body: JSON.stringify({
      sku: `LOAD-${Date.now()}-${__VU}`,
      name: "Load Test Item",
      quantity: 100,
    })},
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const startTime = Date.now();

  let res;
  if (endpoint.method === "GET") {
    res = http.get(`${BASE_URL}${endpoint.url}`, { headers: HEADERS, timeout: "5s" });
  } else {
    res = http.post(`${BASE_URL}${endpoint.url}`, endpoint.body, { headers: HEADERS, timeout: "5s" });
  }

  const elapsed = Date.now() - startTime;

  check(res, {
    "status is 2xx": (r) => r.status >= 200 && r.status < 300,
    "response < 200ms": (r) => r.timings.duration < 200,
    "has body": (r) => r.body && r.body.length > 0,
  });

  failRate.add(res.status < 200 || res.status >= 300);
  duration.add(res.timings.duration);

  sleep(Math.random() * 2 + 0.5);
}
