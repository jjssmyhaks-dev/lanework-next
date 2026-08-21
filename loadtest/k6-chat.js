// k6 load test — Chat API
// Run: k6 run loadtest/k6-chat.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const chatFailRate = new Rate("chat_failures");
const chatDuration = new Trend("chat_duration");
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

const MESSAGES = [
  "Track shipment SH-2024-001",
  "Show me low-stock inventory",
  "Check weather in Mumbai",
  "Validate GSTIN 27AABCG2196N1Z1",
  "Get shipping rates from 110001 to 400001",
  "How many active shipments do I have?",
  "Show fleet status",
  "What's the warehouse inventory?",
];

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 10 },
    { duration: "30s", target: 25 },
    { duration: "2m", target: 25 },
    { duration: "30s", target: 50 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"],  // 95% under 3s (includes AI inference)
    chat_failures: ["rate<0.15"],
  },
};

// Simulate auth token (replace with real token for actual tests)
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "test-token";

export default function () {
  const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  const chatRes = http.post(
    `${BASE_URL}/api/chat`,
    JSON.stringify({ message: msg }),
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth-token=${AUTH_TOKEN}`,
      },
      timeout: "10s",
    }
  );

  check(chatRes, {
    "chat status is 200": (r) => r.status === 200,
    "chat has message": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.message && body.message.content;
      } catch {
        return false;
      }
    },
    "chat response < 5s": (r) => r.timings.duration < 5000,
  });

  chatFailRate.add(chatRes.status !== 200);
  chatDuration.add(chatRes.timings.duration);

  sleep(Math.random() * 5 + 2); // 2-7s think time
}
