import { Hono } from "hono";
import { authMiddleware, adminMiddleware } from "../../middleware/auth-middleware.js";
import * as propertiesService from "./properties-service.js";
import * as propertyRoomsService from "./property-rooms-service.js";
import * as evaluationService from "./evaluation-service.js";
import * as itineraryService from "./itinerary-service.js";
import * as pricingConfigsService from "./pricing-configs-service.js";
import * as aiDataSettingsService from "./ai-data-settings-service.js";
import * as aiToggleService from "./ai-toggle-service.js";
import * as pricingOptionsService from "./pricing-options-service.js";
import { invalidateAiContextCache } from "./ai-context-builder.js";

// ─── Property detail (non-market-scoped) ─────────────────────────────────────
export const propertyDetailRoutes = new Hono();
propertyDetailRoutes.use("*", authMiddleware);

propertyDetailRoutes.get("/:id", async (c) => {
  const data = await propertiesService.getPropertyById(c.req.param("id"));
  return c.json({ success: true, data });
});

// ─── Property Rooms ───────────────────────────────────────────────────────────
export const propertyRoomRoutes = new Hono();
propertyRoomRoutes.use("*", authMiddleware);

propertyRoomRoutes.get("/:propertyId/rooms", async (c) => {
  const data = await propertyRoomsService.listRooms(c.req.param("propertyId"));
  return c.json({ success: true, data });
});

propertyRoomRoutes.post("/:propertyId/rooms", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const record = await propertyRoomsService.createRoom({ ...body, propertyId: c.req.param("propertyId") });
  return c.json({ success: true, data: record }, 201);
});

propertyRoomRoutes.patch("/:propertyId/rooms/:id", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const record = await propertyRoomsService.updateRoom(c.req.param("id"), body);
  return c.json({ success: true, data: record });
});

propertyRoomRoutes.delete("/:propertyId/rooms/:id", adminMiddleware, async (c) => {
  await propertyRoomsService.deleteRoom(c.req.param("id"));
  return c.json({ success: true, message: "Room deleted" });
});

// Property evaluations
propertyRoomRoutes.get("/:propertyId/evaluations", async (c) => {
  const data = await evaluationService.listEvaluations(c.req.param("propertyId"));
  return c.json({ success: true, data });
});

propertyRoomRoutes.put("/:propertyId/evaluations", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const items = Array.isArray(body) ? body : body.items ?? [];
  const data = await evaluationService.bulkUpsertEvaluations(c.req.param("propertyId"), items);
  return c.json({ success: true, data });
});

// ─── Room Pricing ─────────────────────────────────────────────────────────────
export const roomPricingRoutes = new Hono();
roomPricingRoutes.use("*", authMiddleware);

roomPricingRoutes.get("/:roomId/pricing", async (c) => {
  const data = await propertyRoomsService.listRoomPricing(c.req.param("roomId"));
  return c.json({ success: true, data });
});

roomPricingRoutes.post("/:roomId/pricing", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const record = await propertyRoomsService.createRoomPricing({ ...body, roomId: c.req.param("roomId") });
  return c.json({ success: true, data: record }, 201);
});

roomPricingRoutes.put("/:roomId/pricing", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const items = Array.isArray(body) ? body : body.items ?? [];
  const data = await propertyRoomsService.bulkUpsertRoomPricing(c.req.param("roomId"), items);
  return c.json({ success: true, data });
});

roomPricingRoutes.patch("/:roomId/pricing/:id", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const record = await propertyRoomsService.updateRoomPricing(c.req.param("id"), body);
  return c.json({ success: true, data: record });
});

roomPricingRoutes.delete("/:roomId/pricing/:id", adminMiddleware, async (c) => {
  await propertyRoomsService.deleteRoomPricing(c.req.param("id"));
  return c.json({ success: true, message: "Room pricing deleted" });
});

// ─── Evaluation Criteria ──────────────────────────────────────────────────────
export const evaluationCriteriaRoutes = new Hono();
evaluationCriteriaRoutes.use("*", authMiddleware);

evaluationCriteriaRoutes.get("/", async (c) => {
  const marketId = c.req.query("marketId");
  const data = await evaluationService.listCriteria(marketId);
  return c.json({ success: true, data });
});

evaluationCriteriaRoutes.post("/", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const record = await evaluationService.createCriteria(body);
  return c.json({ success: true, data: record }, 201);
});

evaluationCriteriaRoutes.patch("/:id", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const record = await evaluationService.updateCriteria(c.req.param("id"), body);
  return c.json({ success: true, data: record });
});

evaluationCriteriaRoutes.delete("/:id", adminMiddleware, async (c) => {
  await evaluationService.deleteCriteria(c.req.param("id"));
  return c.json({ success: true, message: "Criteria deleted" });
});

// ─── Itinerary Items ──────────────────────────────────────────────────────────
export const itineraryItemRoutes = new Hono();
itineraryItemRoutes.use("*", authMiddleware);

itineraryItemRoutes.get("/:templateId", async (c) => {
  const data = await itineraryService.getTemplateById(c.req.param("templateId"));
  return c.json({ success: true, data });
});

itineraryItemRoutes.get("/:templateId/items", async (c) => {
  const data = await itineraryService.listTemplateItems(c.req.param("templateId"));
  return c.json({ success: true, data });
});

itineraryItemRoutes.post("/:templateId/items", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const data = await itineraryService.createTemplateItem(c.req.param("templateId"), body);
  return c.json({ success: true, data }, 201);
});

itineraryItemRoutes.put("/:templateId/items", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const items = Array.isArray(body) ? body : body.items ?? [];
  const data = await itineraryService.bulkReplaceTemplateItems(c.req.param("templateId"), items);
  return c.json({ success: true, data });
});

itineraryItemRoutes.patch("/:templateId/items/:itemId", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const data = await itineraryService.updateTemplateItem(c.req.param("itemId"), body);
  return c.json({ success: true, data });
});

itineraryItemRoutes.delete("/:templateId/items/:itemId", adminMiddleware, async (c) => {
  await itineraryService.deleteTemplateItem(c.req.param("itemId"));
  return c.json({ success: true, message: "Item deleted" });
});

// ─── Pricing Configs ──────────────────────────────────────────────────────────
export const pricingConfigRoutes = new Hono();
pricingConfigRoutes.use("*", authMiddleware);

pricingConfigRoutes.get("/", async (c) => {
  const data = await pricingConfigsService.listPricingConfigs(
    c.req.query("marketId"),
    c.req.query("propertyId"),
  );
  return c.json({ success: true, data });
});

pricingConfigRoutes.post("/", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const record = await pricingConfigsService.createPricingConfig(body);
  return c.json({ success: true, data: record }, 201);
});

pricingConfigRoutes.patch("/:id", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const record = await pricingConfigsService.updatePricingConfig(c.req.param("id"), body);
  return c.json({ success: true, data: record });
});

pricingConfigRoutes.delete("/:id", adminMiddleware, async (c) => {
  await pricingConfigsService.deletePricingConfig(c.req.param("id"));
  return c.json({ success: true, message: "Pricing config deleted" });
});

// ─── AI Data Settings ─────────────────────────────────────────────────────────
export const aiDataSettingRoutes = new Hono();
aiDataSettingRoutes.use("*", authMiddleware, adminMiddleware);

aiDataSettingRoutes.get("/", async (c) => {
  const data = await aiDataSettingsService.listSettings();
  return c.json({ success: true, data });
});

aiDataSettingRoutes.patch("/:category", async (c) => {
  const body = await c.req.json();
  const user = c.get("user");
  const record = await aiDataSettingsService.toggleCategory(
    c.req.param("category"),
    body.isEnabled,
    user.sub,
  );
  invalidateAiContextCache();
  return c.json({ success: true, data: record });
});

// ─── Pricing Options (combo types, day types) ────────────────────────────────
export const pricingOptionRoutes = new Hono();
pricingOptionRoutes.use("*", authMiddleware);

pricingOptionRoutes.get("/", async (c) => {
  const category = c.req.query("category");
  const data = category ? await pricingOptionsService.listByCategory(category) : await pricingOptionsService.listAll();
  return c.json({ success: true, data });
});

pricingOptionRoutes.post("/", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const record = await pricingOptionsService.create(body);
  invalidateAiContextCache();
  return c.json({ success: true, data: record }, 201);
});

pricingOptionRoutes.patch("/:id", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const record = await pricingOptionsService.update(c.req.param("id"), body);
  invalidateAiContextCache();
  return c.json({ success: true, data: record });
});

pricingOptionRoutes.delete("/:id", adminMiddleware, async (c) => {
  await pricingOptionsService.remove(c.req.param("id"));
  invalidateAiContextCache();
  return c.json({ success: true, message: "Pricing option deleted" });
});

// ─── AI Toggle ────────────────────────────────────────────────────────────────
export const aiToggleRoutes = new Hono();
aiToggleRoutes.use("*", authMiddleware, adminMiddleware);

aiToggleRoutes.patch("/:entityType/:entityId", async (c) => {
  const body = await c.req.json();
  const record = await aiToggleService.toggleAiVisible(
    c.req.param("entityType"),
    c.req.param("entityId"),
    body.aiVisible,
  );
  invalidateAiContextCache();
  return c.json({ success: true, data: record });
});
