import { eq, and, asc, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../../db/connection.js";
import { propertyRooms, roomPricing } from "../../db/schema/index.js";
import type { PropertyRoomRecord, NewPropertyRoomRecord } from "../../db/schema/index.js";

export async function listRooms(propertyId: string) {
  const rooms = await db.select().from(propertyRooms)
    .where(eq(propertyRooms.propertyId, propertyId))
    .orderBy(asc(propertyRooms.sortOrder));

  const roomsWithPricing = await Promise.all(
    rooms.map(async (room) => {
      const pricing = await db.select().from(roomPricing).where(eq(roomPricing.roomId, room.id));
      return { ...room, pricing };
    }),
  );
  return roomsWithPricing;
}

export async function createRoom(data: Omit<NewPropertyRoomRecord, "id" | "createdAt" | "updatedAt">) {
  const [record] = await db.insert(propertyRooms).values(data).returning();
  return record!;
}

export async function updateRoom(id: string, data: Partial<PropertyRoomRecord>) {
  const [existing] = await db.select().from(propertyRooms).where(eq(propertyRooms.id, id)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "Room not found" });
  const [updated] = await db.update(propertyRooms)
    .set({ ...data, updatedAt: sql`now()` })
    .where(eq(propertyRooms.id, id))
    .returning();
  return updated!;
}

export async function deleteRoom(id: string) {
  const [existing] = await db.select().from(propertyRooms).where(eq(propertyRooms.id, id)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "Room not found" });
  await db.delete(propertyRooms).where(eq(propertyRooms.id, id));
}

export async function listRoomPricing(roomId: string) {
  return db.select().from(roomPricing).where(eq(roomPricing.roomId, roomId));
}

export async function createRoomPricing(data: typeof roomPricing.$inferInsert) {
  // Check for duplicate (same room + combo + day + season)
  const [existing] = await db.select().from(roomPricing).where(
    and(
      eq(roomPricing.roomId, data.roomId),
      eq(roomPricing.comboType, data.comboType),
      eq(roomPricing.dayType, data.dayType),
      eq(roomPricing.seasonName, data.seasonName ?? "default"),
    ),
  ).limit(1);
  if (existing) {
    throw new HTTPException(409, { message: `Đã tồn tại giá cho combo "${data.comboType}" + ngày "${data.dayType}" + mùa "${data.seasonName ?? "default"}"` });
  }
  const [record] = await db.insert(roomPricing).values(data).returning();
  return record!;
}

export async function bulkUpsertRoomPricing(roomId: string, items: Omit<typeof roomPricing.$inferInsert, "roomId">[]) {
  await db.delete(roomPricing).where(eq(roomPricing.roomId, roomId));
  if (items.length === 0) return [];
  const inserted = await db.insert(roomPricing)
    .values(items.map((item) => ({ ...item, roomId })))
    .returning();
  return inserted;
}

export async function updateRoomPricing(id: string, data: Partial<typeof roomPricing.$inferSelect>) {
  const [existing] = await db.select().from(roomPricing).where(eq(roomPricing.id, id)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "Room pricing not found" });
  const [updated] = await db.update(roomPricing)
    .set({ ...data, updatedAt: sql`now()` })
    .where(eq(roomPricing.id, id))
    .returning();
  return updated!;
}

export async function deleteRoomPricing(id: string) {
  const [existing] = await db.select().from(roomPricing).where(eq(roomPricing.id, id)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "Room pricing not found" });
  await db.delete(roomPricing).where(eq(roomPricing.id, id));
}
