import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const webDir = path.join(root, "web");
const webPkg = path.join(webDir, "package.json");

if (!existsSync(webPkg)) {
  console.error("Missing web/package.json — cannot start dev server.");
  process.exit(1);
}

const child = spawn("npm", ["run", "dev"], {
  cwd: webDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
