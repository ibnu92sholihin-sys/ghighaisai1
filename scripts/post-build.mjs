import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const distDir = path.resolve(process.cwd(), "dist");
const publicDir = path.resolve(distDir, "public");

// 1. Copy all contents of dist/public directly into dist so static hosts find /assets, /favicon.ico, etc.
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, distDir, { recursive: true });
}

// 2. Generate pre-rendered index.html by starting server briefly
async function generateIndexHtml() {
  const serverPath = path.resolve(distDir, "server/index.mjs");
  if (!fs.existsSync(serverPath)) {
    console.log("No server/index.mjs found, skipping index.html extraction.");
    return;
  }

  const port = 3099;
  const child = spawn("node", [serverPath], {
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore",
  });

  try {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/`);
        if (res.ok) {
          const html = await res.text();
          fs.writeFileSync(path.resolve(distDir, "index.html"), html, "utf8");
          fs.writeFileSync(path.resolve(publicDir, "index.html"), html, "utf8");
          console.log("Successfully generated dist/index.html and dist/public/index.html");
          break;
        }
      } catch {
        // continue polling until server responds
      }
    }
  } finally {
    child.kill("SIGTERM");
  }
}

await generateIndexHtml();
