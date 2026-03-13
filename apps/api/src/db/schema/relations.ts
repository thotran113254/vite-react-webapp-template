import { relations } from "drizzle-orm";
import { users } from "./users-schema";
import { resources } from "./resources-schema";
import { hotels } from "./hotels-schema";
import { hotelRooms } from "./hotel-rooms-schema";
import { bookings } from "./bookings-schema";
import { knowledgeBase } from "./knowledge-base-schema";
import { chatSessions } from "./chat-sessions-schema";
import { chatMessages } from "./chat-messages-schema";
import { pricingRules } from "./pricing-rules-schema";
import { trips } from "./trips-schema";
import { itineraryItems } from "./itinerary-items-schema";

export const usersRelations = relations(users, ({ many }) => ({
  resources: many(resources),
  bookings: many(bookings),
  chatSessions: many(chatSessions),
  knowledgeBase: many(knowledgeBase),
  trips: many(trips),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  user: one(users, {
    fields: [resources.userId],
    references: [users.id],
  }),
}));

export const hotelsRelations = relations(hotels, ({ many }) => ({
  hotelRooms: many(hotelRooms),
  bookings: many(bookings),
  pricingRules: many(pricingRules),
}));

export const hotelRoomsRelations = relations(hotelRooms, ({ one, many }) => ({
  hotel: one(hotels, {
    fields: [hotelRooms.hotelId],
    references: [hotels.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  hotel: one(hotels, {
    fields: [bookings.hotelId],
    references: [hotels.id],
  }),
  room: one(hotelRooms, {
    fields: [bookings.roomId],
    references: [hotelRooms.id],
  }),
}));

export const knowledgeBaseRelations = relations(knowledgeBase, ({ one }) => ({
  creator: one(users, {
    fields: [knowledgeBase.createdBy],
    references: [users.id],
  }),
}));

export const chatSessionsRelations = relations(
  chatSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [chatSessions.userId],
      references: [users.id],
    }),
    messages: many(chatMessages),
  }),
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const pricingRulesRelations = relations(pricingRules, ({ one }) => ({
  hotel: one(hotels, {
    fields: [pricingRules.hotelId],
    references: [hotels.id],
  }),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  user: one(users, {
    fields: [trips.userId],
    references: [users.id],
  }),
  items: many(itineraryItems),
}));

export const itineraryItemsRelations = relations(itineraryItems, ({ one }) => ({
  trip: one(trips, {
    fields: [itineraryItems.tripId],
    references: [trips.id],
  }),
}));
