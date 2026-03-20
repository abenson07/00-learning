import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const nextBin = path.join(webRoot, "node_modules", "next", "dist", "bin", "next");

/**
 * Find the first listenable TCP port starting at `startPort` (inclusive).
 */
function findOpenPort(startPort, maxAttempts = 64) {
  return new Promise((resolve, reject) => {
    let port = startPort;
    let attempts = 0;

    const probe = () => {
      if (attempts >= maxAttempts) {
        reject(
          new Error(
            `No free port in range ${startPort}-${startPort + maxAttempts - 1}`,
          ),
        );
        return;
      }
      attempts += 1;
      const s = createServer();
      s.once("error", (err) => {
        const e = /** @type {NodeJS.ErrnoException} */ (err);
        s.close(() => {
          if (e.code === "EADDRINUSE") {
            port += 1;
            probe();
          } else {
            reject(e);
          }
        });
      });
      s.listen(port, "0.0.0.0", () => {
        const addr = s.address();
        const p = typeof addr === "object" && addr !== null ? addr.port : port;
        s.close(() => resolve(p));
      });
    };

    probe();
  });
}

const preferred = Number(process.env.PORT) || 3000;
const port = await findOpenPort(preferred);

const child = spawn(process.execPath, [nextBin, "dev", "-p", String(port)], {
  cwd: webRoot,
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 1);
});
