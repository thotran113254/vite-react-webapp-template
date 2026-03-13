import { eq, sql, and, asc } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../../db/connection.js";
import { trips, itineraryItems } from "../../db/schema/index.js";
import type {
  Trip,
  ItineraryItem,
  CreateTripDto,
  UpdateTripDto,
  CreateItineraryItemDto,
  UpdateItineraryItemDto,
} from "@app/shared";

function toTrip(row: typeof trips.$inferSelect): Trip {
  return {
    ...row,
    status: row.status as Trip["status"],
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toItem(row: typeof itineraryItems.$inferSelect): ItineraryItem {
  return {
    ...row,
    type: row.type as ItineraryItem["type"],
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

function canAccess(
  trip: typeof trips.$inferSelect,
  userId: string,
  role: string,
): boolean {
  return role === "admin" || trip.userId === userId;
}

// --- Trip CRUD ---

export async function listTrips(userId: string, role: string): Promise<Trip[]> {
  const rows =
    role === "admin"
      ? await db.select().from(trips).orderBy(asc(trips.startDate))
      : await db
          .select()
          .from(trips)
          .where(eq(trips.userId, userId))
          .orderBy(asc(trips.startDate));
  return rows.map(toTrip);
}

export async function getTripById(
  id: string,
  userId: string,
  role: string,
): Promise<Trip & { items: ItineraryItem[] }> {
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);
  if (!trip) throw new HTTPException(404, { message: "Trip not found" });
  if (!canAccess(trip, userId, role))
    throw new HTTPException(403, { message: "Access denied" });

  const items = await db
    .select()
    .from(itineraryItems)
    .where(eq(itineraryItems.tripId, id))
    .orderBy(asc(itineraryItems.dayNumber), asc(itineraryItems.sortOrder));

  return { ...toTrip(trip), items: items.map(toItem) };
}

export async function createTrip(
  dto: CreateTripDto,
  userId: string,
): Promise<Trip> {
  const [trip] = await db
    .insert(trips)
    .values({
      userId,
      title: dto.title,
      destination: dto.destination,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      guests: dto.guests ?? 2,
      coverImage: dto.coverImage ?? "",
      notes: dto.notes ?? "",
    })
    .returning();
  return toTrip(trip!);
}

export async function updateTrip(
  id: string,
  dto: UpdateTripDto,
  userId: string,
  role: string,
): Promise<Trip> {
  const [existing] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);
  if (!existing) throw new HTTPException(404, { message: "Trip not found" });
  if (!canAccess(existing, userId, role))
    throw new HTTPException(403, { message: "Access denied" });

  const values: Record<string, unknown> = { updatedAt: sql`now()` };
  if (dto.title !== undefined) values.title = dto.title;
  if (dto.destination !== undefined) values.destination = dto.destination;
  if (dto.startDate !== undefined) values.startDate = new Date(dto.startDate);
  if (dto.endDate !== undefined) values.endDate = new Date(dto.endDate);
  if (dto.guests !== undefined) values.guests = dto.guests;
  if (dto.status !== undefined) values.status = dto.status;
  if (dto.coverImage !== undefined) values.coverImage = dto.coverImage;
  if (dto.notes !== undefined) values.notes = dto.notes;

  const [updated] = await db
    .update(trips)
    .set(values)
    .where(eq(trips.id, id))
    .returning();
  return toTrip(updated!);
}

export async function deleteTrip(
  id: string,
  userId: string,
  role: string,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);
  if (!existing) throw new HTTPException(404, { message: "Trip not found" });
  if (!canAccess(existing, userId, role))
    throw new HTTPException(403, { message: "Access denied" });
  await db.delete(trips).where(eq(trips.id, id));
}

// --- Itinerary items CRUD ---

export async function addItem(
  tripId: string,
  dto: CreateItineraryItemDto,
  userId: string,
  role: string,
): Promise<ItineraryItem> {
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);
  if (!trip) throw new HTTPException(404, { message: "Trip not found" });
  if (!canAccess(trip, userId, role))
    throw new HTTPException(403, { message: "Access denied" });

  const [item] = await db
    .insert(itineraryItems)
    .values({
      tripId,
      dayNumber: dto.dayNumber,
      startTime: dto.startTime,
      endTime: dto.endTime ?? "",
      type: dto.type,
      title: dto.title,
      subtitle: dto.subtitle ?? "",
      location: dto.location ?? "",
      confirmationCode: dto.confirmationCode ?? "",
      notes: dto.notes ?? "",
      metadata: dto.metadata ?? {},
      sortOrder: dto.sortOrder ?? 0,
    })
    .returning();
  return toItem(item!);
}

export async function updateItem(
  itemId: string,
  dto: UpdateItineraryItemDto,
  userId: string,
  role: string,
): Promise<ItineraryItem> {
  const [item] = await db
    .select()
    .from(itineraryItems)
    .where(eq(itineraryItems.id, itemId))
    .limit(1);
  if (!item) throw new HTTPException(404, { message: "Item not found" });

  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, item.tripId))
    .limit(1);
  if (!trip || !canAccess(trip, userId, role))
    throw new HTTPException(403, { message: "Access denied" });

  const [updated] = await db
    .update(itineraryItems)
    .set(dto)
    .where(eq(itineraryItems.id, itemId))
    .returning();
  return toItem(updated!);
}

export async function deleteItem(
  itemId: string,
  userId: string,
  role: string,
): Promise<void> {
  const [item] = await db
    .select()
    .from(itineraryItems)
    .where(eq(itineraryItems.id, itemId))
    .limit(1);
  if (!item) throw new HTTPException(404, { message: "Item not found" });

  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, item.tripId))
    .limit(1);
  if (!trip || !canAccess(trip, userId, role))
    throw new HTTPException(403, { message: "Access denied" });

  await db.delete(itineraryItems).where(eq(itineraryItems.id, itemId));
}
