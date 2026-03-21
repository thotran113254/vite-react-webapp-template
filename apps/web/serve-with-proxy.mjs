/**
 * Simple static file server + API reverse proxy.
 * Serves web dist on port 4002, proxies /api/v1/* to API on port 4001.
 */
import { createServer, request as httpRequest } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const WEB_PORT = 4002;
const API_HOST = "127.0.0.1";
const API_PORT = 4001;
const DIST_DIR = new URL("./dist", import.meta.url).pathname;

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

async function serveStatic(res, urlPath) {
  let filePath = join(DIST_DIR, urlPath === "/" ? "/index.html" : urlPath);
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, "index.html");
  } catch {
    // SPA fallback — serve index.html for any non-file route
    filePath = join(DIST_DIR, "index.html");
  }
  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    // Final fallback
    const html = await readFile(join(DIST_DIR, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  }
}

function proxyToApi(req, res) {
  const proxyReq = httpRequest(
    { hostname: API_HOST, port: API_PORT, path: req.url, method: req.method, headers: req.headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    },
  );
  proxyReq.on("error", () => {
    res.writeHead(502);
    res.end("API unavailable");
  });
  req.pipe(proxyReq, { end: true });
}

const server = createServer((req, res) => {
  if (req.url.startsWith("/api/") || req.url.startsWith("/uploads/") || req.url === "/health") {
    proxyToApi(req, res);
  } else {
    serveStatic(res, req.url);
  }
});

server.listen(WEB_PORT, () => {
  console.log(`Web+Proxy running on http://localhost:${WEB_PORT}`);
  console.log(`  Static: ${DIST_DIR}`);
  console.log(`  API proxy: /api/* -> http://${API_HOST}:${API_PORT}`);
});
