import { Hono } from "hono";
import {
  createTripSchema,
  updateTripSchema,
  createItineraryItemSchema,
  updateItineraryItemSchema,
} from "@app/shared";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import * as svc from "./itinerary-service.js";

export const itineraryRoutes = new Hono();

itineraryRoutes.use("*", authMiddleware);

// --- Trips ---

itineraryRoutes.get("/trips", async (c) => {
  const user = c.get("user");
  const data = await svc.listTrips(user.sub, user.role);
  return c.json({ success: true, data });
});

itineraryRoutes.get("/trips/:id", async (c) => {
  const user = c.get("user");
  const data = await svc.getTripById(c.req.param("id"), user.sub, user.role);
  return c.json({ success: true, data });
});

itineraryRoutes.post("/trips", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const dto = createTripSchema.parse(body);
  const data = await svc.createTrip(dto, user.sub);
  return c.json({ success: true, data }, 201);
});

itineraryRoutes.patch("/trips/:id", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const dto = updateTripSchema.parse(body);
  const data = await svc.updateTrip(
    c.req.param("id"),
    dto,
    user.sub,
    user.role,
  );
  return c.json({ success: true, data });
});

itineraryRoutes.delete("/trips/:id", async (c) => {
  const user = c.get("user");
  await svc.deleteTrip(c.req.param("id"), user.sub, user.role);
  return c.json({ success: true, message: "Trip deleted" });
});

// --- Itinerary items ---

itineraryRoutes.post("/trips/:tripId/items", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const dto = createItineraryItemSchema.parse(body);
  const data = await svc.addItem(
    c.req.param("tripId"),
    dto,
    user.sub,
    user.role,
  );
  return c.json({ success: true, data }, 201);
});

itineraryRoutes.patch("/items/:itemId", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const dto = updateItineraryItemSchema.parse(body);
  const data = await svc.updateItem(
    c.req.param("itemId"),
    dto,
    user.sub,
    user.role,
  );
  return c.json({ success: true, data });
});

itineraryRoutes.delete("/items/:itemId", async (c) => {
  const user = c.get("user");
  await svc.deleteItem(c.req.param("itemId"), user.sub, user.role);
  return c.json({ success: true, message: "Item deleted" });
});
