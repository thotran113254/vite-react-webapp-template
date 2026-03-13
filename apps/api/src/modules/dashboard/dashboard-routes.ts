import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { getDashboardStats } from "./dashboard-service.js";

export const dashboardRoutes = new Hono();

dashboardRoutes.use("*", authMiddleware);

dashboardRoutes.get("/stats", async (c) => {
  const stats = await getDashboardStats();
  return c.json({ success: true, data: stats });
});
