import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { serveStatic } from "@hono/node-server/serve-static";
import { env } from "./env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { rateLimiter } from "./middleware/rate-limiter.js";
import { requestLogger } from "./middleware/request-logger.js";
import { routes } from "./routes/index.js";

/**
 * Create and configure the Hono application instance.
 */
export function createApp(): Hono {
  const app = new Hono();

  // Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
  app.use("*", secureHeaders());

  // CORS middleware
  app.use(
    "*",
    cors({
      origin: env.CORS_ORIGINS,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      exposeHeaders: ["X-Total-Count"],
      credentials: true,
      maxAge: 86400,
    }),
  );

  // Request body size limit: 6MB for uploads, 1MB default
  app.use("/api/v1/upload/*", bodyLimit({ maxSize: 6 * 1024 * 1024 }));
  app.use("*", bodyLimit({ maxSize: 1024 * 1024 }));

  // Rate limiting
  app.use("*", rateLimiter);

  // Structured request logger
  app.use("*", requestLogger);

  // Serve uploaded files
  app.use("/uploads/*", serveStatic({ root: "./" }));

  // Health check endpoint
  app.get("/health", (c) => {
    return c.json({
      success: true,
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  });

  // Mount API routes under prefix
  app.route(env.API_PREFIX, routes);

  // Global error handler
  app.onError(errorHandler);

  // 404 handler for unmatched routes
  app.notFound(notFoundHandler);

  return app;
}

// Export singleton app instance
export const app = createApp();
