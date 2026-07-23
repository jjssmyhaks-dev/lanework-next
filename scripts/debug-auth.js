const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");
const bcrypt = require("bcryptjs");

const envPath = path.resolve(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
const DB = match[1];

async function main() {
  const sql = neon(DB);
  const email = "roster@lanework.com";

  // Check what's in DB
  const [user] = await sql`SELECT id, email, password_hash FROM users WHERE email = ${email}`;
  if (!user) { console.log("User not found in DB!"); process.exit(1); }
  console.log("User found:", user.id, user.email);
  console.log("password_hash length:", user.password_hash?.length);
  console.log("password_hash:", user.password_hash);

  // Test password from env
  const envPw = "***";
  console.log("\nTesting password length:", envPw.length);
  console.log("Password chars:", [...envPw].map(c => c.charCodeAt(0)));

  const valid = await bcrypt.compare(envPw, user.password_hash);
  console.log("bcrypt.compare result:", valid);

  // Try with trimmed
  const trimmed = envPw.trim();
  console.log("\nTrimmed length:", trimmed.length);
  const valid2 = await bcrypt.compare(trimmed, user.password_hash);
  console.log("bcrypt.compare trimmed:", valid2);

  // Try manual hash+compare
  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(envPw, salt);
  const valid3 = await bcrypt.compare(envPw, newHash);
  console.log("\nSelf-hash test:", valid3);

  process.exit(0);
}
main();
