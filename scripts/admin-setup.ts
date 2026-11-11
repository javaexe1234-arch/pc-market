/**
 * Creates the secret admin address and password in .env, if they aren't set yet, and shows them.
 * Run in your own terminal: npm run admin:setup
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENV_FILE = process.env.ADMIN_ENV_FILE || ".env";

function readValue(content: string, key: string): string {
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^"|"$/g, "") : "";
}

function withValue(content: string, key: string, value: string): string {
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return `${content.replace(/\n*$/, "\n")}${line}\n`;
}

let content = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";

let path = readValue(content, "ADMIN_PATH");
if (!path) {
  path = randomBytes(12).toString("hex");
  content = withValue(content, "ADMIN_PATH", path);
}
let password = readValue(content, "ADMIN_PASSWORD");
if (!password) {
  password = randomBytes(18).toString("base64url");
  content = withValue(content, "ADMIN_PASSWORD", password);
}
writeFileSync(ENV_FILE, content);

console.log(`Address:  http://localhost:3000/${path}`);
console.log(`Password: ${password}`);
console.log("Save them somewhere safe and restart the site. Both are stored in .env.");
