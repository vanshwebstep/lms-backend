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

/**
 * Register route
 */
const route = (method, pattern, handlers) => {
  routes.push({
    method,
    pattern,
    handlers: Array.isArray(handlers) ? handlers : [handlers],
  });
};

/**
 * Match route
 */
const match = (actual, expected) => {
  const a = actual.split("/").filter(Boolean);
  const e = expected.split("/").filter(Boolean);

  if (a.length !== e.length) {
    return null;
  }

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

/**
 * Read request body
 */
const readBuffer = async (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    const MAX_BODY_SIZE = 100 * 1024 * 1024; // 100 MB

    req.on("data", (chunk) => {
      size += chunk.length;

      if (size > MAX_BODY_SIZE) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });

/**
 * Parse multipart/form-data
 */
const parseMultipart = (buffer, contentType) => {
  const boundaryMatch = contentType.match(
    /boundary=(?:(?:"([^"]+)")|([^;]+))/i,
  );

  if (!boundaryMatch) {
    throw new Error("Multipart boundary missing");
  }

  const boundary = Buffer.from(
    `--${boundaryMatch[1] || boundaryMatch[2]}`,
  );

  const fields = {};
  const files = [];

  let cursor = buffer.indexOf(boundary);

  while (cursor !== -1) {
    cursor += boundary.length;

    // End boundary
    if (buffer[cursor] === 45 && buffer[cursor + 1] === 45) {
      break;
    }

    // Skip CRLF
    if (buffer[cursor] === 13 && buffer[cursor + 1] === 10) {
      cursor += 2;
    }

    const next = buffer.indexOf(boundary, cursor);

    if (next === -1) {
      break;
    }

    let part = buffer.slice(cursor, next);

    // Remove trailing CRLF
    if (
      part.length >= 2 &&
      part[part.length - 2] === 13 &&
      part[part.length - 1] === 10
    ) {
      part = part.slice(0, -2);
    }

    const headerEnd = part.indexOf(
      Buffer.from("\r\n\r\n"),
    );

    if (headerEnd !== -1) {
      const headerText = part
        .slice(0, headerEnd)
        .toString("utf8");

      const body = part.slice(headerEnd + 4);

      const nameMatch = headerText.match(
        /name="([^"]+)"/i,
      );

      const fileMatch = headerText.match(
        /filename="([^"]*)"/i,
      );

      const typeMatch = headerText.match(
        /content-type:\s*([^\r\n]+)/i,
      );

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

  return {
    ...fields,
    files,
  };
};

/**
 * Parse request body
 */
const parseBody = async (req) => {
  const contentType = req.headers["content-type"] || "";

  const buffer = await readBuffer(req);

  if (!buffer.length) {
    return {};
  }

  if (contentType.includes("multipart/form-data")) {
    return parseMultipart(buffer, contentType);
  }

  if (
    contentType.includes(
      "application/x-www-form-urlencoded",
    )
  ) {
    return Object.fromEntries(
      new URLSearchParams(
        buffer.toString("utf8"),
      ).entries(),
    );
  }

  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new Error("Invalid JSON body");
  }
};

/**
 * Allowed CORS origin
 */
const getAllowedOrigin = (origin = "") => {
  if (!origin) {
    return env.appUrl;
  }

  if (env.allowedOrigins.includes(origin)) {
    return origin;
  }

  try {
    const parsed = new URL(origin);
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(
      parsed.hostname,
    );
    if (isLocalHost) {
      return origin;
    }
  } catch {
    return env.appUrl;
  }

  return env.appUrl;
};

/**
 * Serve uploaded files
 */
const sendUpload = (req, res, pathname) => {
  const fullPath = publicUploadPath(pathname);

  if (!fullPath || !fs.existsSync(fullPath)) {
    return false;
  }

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
    "Content-Type":
      types[ext] || "application/octet-stream",
    "Cache-Control":
      "public, max-age=31536000, immutable",
  });

  fs.createReadStream(fullPath).pipe(res);

  return true;
};

/**
 * Health check
 */
route("GET", "/api/health", async (ctx) => {
  await db.ping();

  return sendJson(ctx.res, 200, {
    success: true,
    status: "ok",
    database: "mysql",
    time: new Date().toISOString(),
  });
});

/**
 * Register all application routes
 */
registerRoutes(route);

/**
 * Main request handler
 */
const handle = async (req, res) => {
  try {
    /**
     * CORS
     */
    res.setHeader(
      "Access-Control-Allow-Origin",
      getAllowedOrigin(req.headers.origin),
    );

    res.setHeader("Vary", "Origin");

    res.setHeader(
      "Access-Control-Allow-Credentials",
      "true",
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );

    /**
     * OPTIONS / CORS preflight
     */
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(
      req.url || "/",
      "http://localhost",
    );

    /**
     * Static uploads
     */
    if (
      req.method === "GET" &&
      sendUpload(req, res, url.pathname)
    ) {
      return;
    }

    /**
     * Find route
     */
    const found = routes.find(
      (item) =>
        item.method === req.method &&
        match(url.pathname, item.pattern),
    );

    if (!found) {
      return fail(
        res,
        404,
        `Route not found: ${req.method} ${url.pathname}`,
      );
    }

    /**
     * Parse body
     */
    let body = {};

    try {
      body = await parseBody(req);
    } catch (error) {
      return fail(
        res,
        400,
        error.message || "Invalid request body",
      );
    }

    /**
     * Request context
     */
    const ctx = {
      req,
      res,
      params: match(
        url.pathname,
        found.pattern,
      ),
      query: url.searchParams,
      body,
    };

    /**
     * Execute handlers
     */
    let index = -1;

    const next = async () => {
      index += 1;

      const handler = found.handlers[index];

      if (handler) {
        return handler(ctx, next);
      }

      return undefined;
    };

    try {
      await next();
    } catch (error) {
      console.error(
        "[REQUEST ERROR]",
        error?.stack || error,
      );

      if (error.code === "ER_ACCESS_DENIED_ERROR") {
        return fail(
          res,
          500,
          "MySQL access denied. Check DB_USER and DB_PASSWORD.",
        );
      }

      if (error.code === "ER_BAD_DB_ERROR") {
        return fail(
          res,
          500,
          "MySQL database not found. Check DB_NAME.",
        );
      }

      if (error.code === "ECONNREFUSED") {
        return fail(
          res,
          500,
          "MySQL connection refused. Check DB_HOST and DB_PORT.",
        );
      }

      return fail(
        res,
        500,
        "Internal server error",
        process.env.NODE_ENV !== "production"
          ? error.message
          : undefined,
      );
    }
  } catch (error) {
    console.error(
      "[UNHANDLED REQUEST ERROR]",
      error?.stack || error,
    );

    if (!res.headersSent) {
      return fail(
        res,
        500,
        "Internal server error",
      );
    }

    res.end();
  }
};

/**
 * Create HTTP server
 */
const createServer = () => {
  const server = http.createServer(handle);

  server.on("error", (error) => {
    console.error(
      "[SERVER ERROR]",
      error?.stack || error,
    );
  });

  return server;
};

/**
 * Start server
 */
const startServer = () => {
  const port = Number(
    process.env.PORT || env.port || 3000,
  );

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(
      `Invalid PORT configuration: ${port}`,
    );
  }

  const server = createServer();

  server.listen(
    port,
    "0.0.0.0",
    async () => {
      console.log(
        `LMS backend running on port ${port}`,
      );

      console.log(
        `Environment: ${
          process.env.NODE_ENV || "development"
        }`,
      );

      try {
        await db.ping();

        console.log(
          `MySQL connected: ${env.db.database}@${env.db.host}:${env.db.port}`,
        );
      } catch (error) {
        console.error(
          "Backend started but MySQL connection failed:",
        );

        console.error(
          error?.stack || error?.message || error,
        );
      }
    },
  );

  return server;
};

/**
 * Process-level error logging
 */
process.on("uncaughtException", (error) => {
  console.error(
    "[UNCAUGHT EXCEPTION]",
    error?.stack || error,
  );
});

process.on("unhandledRejection", (reason) => {
  console.error(
    "[UNHANDLED REJECTION]",
    reason?.stack || reason,
  );
});

/**
 * DIRECT START
 *
 * Plesk Startup File:
 * src/index.js
 */
startServer();