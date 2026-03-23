/**
 * Admin analytics routes — FAQ, staff usage, and chat session viewer.
 * All endpoints require authMiddleware + adminMiddleware.
 */
import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { adminMiddleware } from "../../middleware/auth-middleware.js";
import * as analyticsService from "./analytics-service.js";
import type { Period } from "./analytics-service.js";

export const analyticsRoutes = new Hono();

analyticsRoutes.use("*", authMiddleware, adminMiddleware);

const VALID_PERIODS: Period[] = ["7d", "30d", "90d", "all"];

function parsePeriod(raw: string | undefined): Period {
  return VALID_PERIODS.includes(raw as Period) ? (raw as Period) : "30d";
}

/** GET /admin/analytics/faq?period=30d — FAQ keyword aggregation */
analyticsRoutes.get("/faq", async (c) => {
  const period = parsePeriod(c.req.query("period"));
  const data = await analyticsService.getFaqAnalytics(period);
  return c.json({ success: true, data });
});

/** GET /admin/analytics/usage?period=30d — per-staff usage stats */
analyticsRoutes.get("/usage", async (c) => {
  const period = parsePeriod(c.req.query("period"));
  const data = await analyticsService.getStaffUsage(period);
  return c.json({ success: true, data });
});

/** GET /admin/analytics/users — list non-admin users for dropdown */
analyticsRoutes.get("/users", async (c) => {
  const data = await analyticsService.getNonAdminUsers();
  return c.json({ success: true, data });
});

/** GET /admin/analytics/sessions?userId=&page=1 — sessions for any user */
analyticsRoutes.get("/sessions", async (c) => {
  const userId = c.req.query("userId") || undefined;
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const data = await analyticsService.getSessionsByUser(userId, page);
  return c.json({ success: true, data });
});

/** GET /admin/analytics/sessions/:id/messages — messages in a session */
analyticsRoutes.get("/sessions/:id/messages", async (c) => {
  const data = await analyticsService.getSessionMessages(c.req.param("id"));
  return c.json({ success: true, data });
});
