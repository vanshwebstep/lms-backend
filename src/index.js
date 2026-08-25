const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const env = require("./config/env");
const db = require("./config/db");
const { sendJson, fail } = require("./utils/response");
const { registerRoutes } = require("./routes");
const { publicUploadPath } = require("./services/upload");

const routes = [];

const route = (method, pattern, handlers) => {
  routes.push({
    method,
    pattern,
    handlers: Array.isArray(handlers) ? handlers : [handlers],
  });
};

const match = (actual, expected) => {
  const a = actual.split("/").filter(Boolean);
  const e = expected.split("/").filter(Boolean);
  if (a.length !== e.length) return null;
  const params = {};
  for (let i = 0; i < e.length; i += 1) {
    if (e[i].startsWith(":")) {
      params[e[i].slice(1)] = decodeURIComponent(a[i]);
    } else if (e[i] !== a[i]) {
      return null;
    }
  }
  return params;
};

const readBuffer = async (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > 100_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const parseMultipart = (buffer, contentType) => {
  const boundaryMatch = contentType.match(
    /boundary=(?:(?:"([^"]+)")|([^;]+))/i,
  );
  if (!boundaryMatch) throw new Error("Multipart boundary missing");
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const fields = {};
  const files = [];
  let cursor = buffer.indexOf(boundary);

  while (cursor !== -1) {
    cursor += boundary.length;
    if (buffer[cursor] === 45 && buffer[cursor + 1] === 45) break;
    if (buffer[cursor] === 13 && buffer[cursor + 1] === 10) cursor += 2;

    const next = buffer.indexOf(boundary, cursor);
    if (next === -1) break;
    let part = buffer.slice(cursor, next);
    if (
      part.length >= 2 &&
      part[part.length - 2] === 13 &&
      part[part.length - 1] === 10
    )
      part = part.slice(0, -2);

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd !== -1) {
      const headerText = part.slice(0, headerEnd).toString("utf8");
      const body = part.slice(headerEnd + 4);
      const nameMatch = headerText.match(/name="([^"]+)"/i);
      const fileMatch = headerText.match(/filename="([^"]*)"/i);
      const typeMatch = headerText.match(/content-type:\s*([^\r\n]+)/i);
      const name = nameMatch?.[1];
      if (name && fileMatch && fileMatch[1]) {
        files.push({
          fieldName: name,
          originalName: fileMatch[1],
          mimeType: typeMatch?.[1]?.trim() || "",
          buffer: body,
        });
      } else if (name) {
        fields[name] = body.toString("utf8");
      }
    }

    cursor = next;
  }

  return { ...fields, files };
};

const parseBody = async (req) => {
  const contentType = req.headers["content-type"] || "";
  const buffer = await readBuffer(req);
  if (!buffer.length) return {};
  if (contentType.includes("multipart/form-data"))
    return parseMultipart(buffer, contentType);
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(
      new URLSearchParams(buffer.toString("utf8")).entries(),
    );
  }
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new Error("Invalid JSON body");
  }
};

const getAllowedOrigin = (origin = "") => {
  if (!origin) return env.appUrl;
  if (origin === env.appUrl) return origin;

  try {
    const parsed = new URL(origin);
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(
      parsed.hostname,
    );
    if (isLocalHost) return origin;
  } catch {
    return env.appUrl;
  }

  return env.appUrl;
};

const sendUpload = (req, res, pathname) => {
  const fullPath = publicUploadPath(pathname);
  if (!fullPath || !fs.existsSync(fullPath)) return false;
  const ext = path.extname(fullPath).toLowerCase();
  const types = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".ogv": "video/ogg",
    ".mov": "video/quicktime",
    ".zip": "application/zip",
    ".html": "text/html; charset=utf-8",
  };
  res.writeHead(200, {
    "Content-Type": types[ext] || "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  fs.createReadStream(fullPath).pipe(res);
  return true;
};

route("GET", "/api/health", async (ctx) => {
  await db.ping();
  return sendJson(ctx.res, 200, {
    success: true,
    status: "ok",
    database: "mysql",
    time: new Date().toISOString(),
  });
});

registerRoutes(route);

const handle = async (req, res) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    getAllowedOrigin(req.headers.origin),
  );
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && sendUpload(req, res, url.pathname)) return;

  const found = routes.find(
    (item) => item.method === req.method && match(url.pathname, item.pattern),
  );
  if (!found)
    return fail(res, 404, `Route not found: ${req.method} ${url.pathname}`);

  let body;
  try {
    body = await parseBody(req);
  } catch (error) {
    return fail(res, 400, error.message);
  }

  const ctx = {
    req,
    res,
    params: match(url.pathname, found.pattern),
    query: url.searchParams,
    body,
  };

  let index = -1;
  const next = async () => {
    index += 1;
    const handler = found.handlers[index];
    if (handler) return handler(ctx, next);
  };

  try {
    await next();
  } catch (error) {
    console.error(error);
    if (error.code === "ER_ACCESS_DENIED_ERROR")
      return fail(
        res,
        500,
        "MySQL access denied. Check DB_USER and DB_PASSWORD in .env",
      );
    if (error.code === "ER_BAD_DB_ERROR")
      return fail(
        res,
        500,
        "MySQL database not found. Run database/schema.sql first",
      );
    if (error.code === "ECONNREFUSED")
      return fail(res, 500, "MySQL is not running on the configured host/port");
    return fail(
      res,
      500,
      "Internal server error",
      process.env.NODE_ENV === "production" ? undefined : error.message,
    );
  }
};

const createServer = () => http.createServer(handle);

const startServer = () => {
  const server = createServer();
  server.listen(env.port, async () => {
    try {
      await db.ping();
      console.log(`LMS backend running at http://localhost:${env.port}/api`);
      console.log(`MySQL connected: ${env.db.database}@${env.db.host}:${env.db.port}`);
    } catch (error) {
      console.error('Backend started but MySQL connection failed:');
      console.error(error.message);
    }
  });
  return server;
};

module.exports = { createServer, startServer };

if (require.main === module) {
  startServer();
}
