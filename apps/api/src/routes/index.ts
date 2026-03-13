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

export { routes };
