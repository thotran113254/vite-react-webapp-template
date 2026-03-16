import { Hono } from "hono";
import { authRoutes } from "../modules/auth/auth-routes.js";
import { userRoutes } from "../modules/users/user-routes.js";
import { resourceRoutes } from "../modules/resources/resource-routes.js";
import { hotelRoutes } from "../modules/hotels/hotel-routes.js";
import { bookingRoutes } from "../modules/bookings/booking-routes.js";
import { chatRoutes } from "../modules/chat/chat-routes.js";
import { kbRoutes } from "../modules/knowledge-base/kb-routes.js";
import { pricingRoutes } from "../modules/pricing/pricing-routes.js";
import { dashboardRoutes } from "../modules/dashboard/dashboard-routes.js";
import { itineraryRoutes } from "../modules/itinerary/itinerary-routes.js";
import { marketDataRoutes } from "../modules/market-data/market-data-routes.js";
import { uploadRoutes } from "../modules/upload/upload-routes.js";
import {
  propertyDetailRoutes,
  propertyRoomRoutes,
  roomPricingRoutes,
  evaluationCriteriaRoutes,
  itineraryItemRoutes,
  pricingConfigRoutes,
  aiDataSettingRoutes,
  aiToggleRoutes,
  pricingOptionRoutes,
} from "../modules/market-data/market-data-extra-routes.js";

const routes = new Hono();

routes.get("/", (c) => {
  return c.json({ message: "API is running", version: "v1" });
});

// Auth routes: /auth/*
routes.route("/auth", authRoutes);

// User management routes: /users/*
routes.route("/users", userRoutes);

// Resource management routes: /resources/*
routes.route("/resources", resourceRoutes);

// Hotel management routes: /hotels/*
routes.route("/hotels", hotelRoutes);

// Booking management routes: /bookings/*
routes.route("/bookings", bookingRoutes);

// Chat routes: /chat/*
routes.route("/chat", chatRoutes);

// Knowledge-base routes: /knowledge-base/*
routes.route("/knowledge-base", kbRoutes);

// Pricing routes: /pricing/*
routes.route("/pricing", pricingRoutes);

// Dashboard routes: /dashboard/*
routes.route("/dashboard", dashboardRoutes);

// Itinerary routes: /itinerary/*
routes.route("/itinerary", itineraryRoutes);

// Market data routes: /markets/*
routes.route("/markets", marketDataRoutes);

// Property detail: /properties/:id
routes.route("/properties", propertyDetailRoutes);

// Property rooms + evaluations: /properties/:propertyId/rooms|evaluations
routes.route("/properties", propertyRoomRoutes);

// Room pricing: /rooms/:roomId/pricing
routes.route("/rooms", roomPricingRoutes);

// Evaluation criteria: /evaluation-criteria
routes.route("/evaluation-criteria", evaluationCriteriaRoutes);

// Itinerary template detail + items: /itineraries/:templateId
routes.route("/itineraries", itineraryItemRoutes);

// Pricing configs: /pricing-configs
routes.route("/pricing-configs", pricingConfigRoutes);

// AI data settings: /ai-data-settings
routes.route("/ai-data-settings", aiDataSettingRoutes);

// AI visibility toggle: /ai-toggle/:entityType/:entityId
routes.route("/ai-toggle", aiToggleRoutes);

// Pricing options (combo types, day types): /pricing-options
routes.route("/pricing-options", pricingOptionRoutes);

// File upload: /upload
routes.route("/upload", uploadRoutes);

export { routes };
