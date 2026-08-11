import { randomBytes } from "node:crypto";

const id = process.argv[2];
if (!/^[a-zA-Z0-9_-]{3,64}$/.test(id || "")) throw new Error("Usage: node create-user-token.mjs <user-id>");
console.log(JSON.stringify({ id, token: randomBytes(32).toString("base64url"), dailyBytes: 5 * 1024 * 1024 * 1024 }));
