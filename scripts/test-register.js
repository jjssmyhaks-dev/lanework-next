const http = require("http");
const pwd = "***";
const data = JSON.stringify({ name: "Roster", email: "roster@lanework.com", password: pwd });
console.log("Sending password length:", pwd.length);
const req = http.request({ hostname: "localhost", port: 3000, path: "/api/auth/register", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } }, res => {
  let body = ""; res.on("data", chunk => body += chunk);
  res.on("end", () => { console.log("Status:", res.statusCode); console.log("Response:", body); process.exit(0); });
});
req.on("error", e => { console.error("Error:", e.message); process.exit(1); });
req.write(data); req.end();
