import { eq, asc, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../../db/connection.js";
import { itineraryTemplates, itineraryTemplateItems } from "../../db/schema/index.js";
import type {
  ItineraryTemplateRecord,
  NewItineraryTemplateRecord,
  NewItineraryTemplateItemRecord,
} from "../../db/schema/index.js";

export async function listTemplates(marketId: string) {
  return db.select().from(itineraryTemplates)
    .where(eq(itineraryTemplates.marketId, marketId))
    .orderBy(asc(itineraryTemplates.sortOrder));
}

export async function getTemplateById(id: string) {
  const [template] = await db.select().from(itineraryTemplates).where(eq(itineraryTemplates.id, id)).limit(1);
  if (!template) throw new HTTPException(404, { message: "Itinerary template not found" });
  const items = await db.select().from(itineraryTemplateItems)
    .where(eq(itineraryTemplateItems.templateId, id))
    .orderBy(asc(itineraryTemplateItems.dayNumber), asc(itineraryTemplateItems.sortOrder));
  return { ...template, items };
}

export async function createTemplate(data: Omit<NewItineraryTemplateRecord, "id" | "createdAt" | "updatedAt">) {
  const [record] = await db.insert(itineraryTemplates).values(data).returning();
  return record!;
}

export async function updateTemplate(id: string, data: Partial<ItineraryTemplateRecord>) {
  const [existing] = await db.select().from(itineraryTemplates).where(eq(itineraryTemplates.id, id)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "Itinerary template not found" });
  const [updated] = await db.update(itineraryTemplates)
    .set({ ...data, updatedAt: sql`now()` })
    .where(eq(itineraryTemplates.id, id))
    .returning();
  return updated!;
}

export async function deleteTemplate(id: string) {
  const [existing] = await db.select().from(itineraryTemplates).where(eq(itineraryTemplates.id, id)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "Itinerary template not found" });
  await db.delete(itineraryTemplates).where(eq(itineraryTemplates.id, id));
}

export async function listTemplateItems(templateId: string) {
  return db.select().from(itineraryTemplateItems)
    .where(eq(itineraryTemplateItems.templateId, templateId))
    .orderBy(asc(itineraryTemplateItems.dayNumber), asc(itineraryTemplateItems.sortOrder));
}

export async function createTemplateItem(
  templateId: string,
  data: Omit<NewItineraryTemplateItemRecord, "id" | "templateId" | "createdAt" | "updatedAt">,
) {
  const [record] = await db.insert(itineraryTemplateItems).values({ ...data, templateId }).returning();
  return record!;
}

export async function updateTemplateItem(
  itemId: string,
  data: Partial<Omit<NewItineraryTemplateItemRecord, "id" | "templateId" | "createdAt" | "updatedAt">>,
) {
  const [existing] = await db.select().from(itineraryTemplateItems).where(eq(itineraryTemplateItems.id, itemId)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "Itinerary item not found" });
  const [updated] = await db.update(itineraryTemplateItems)
    .set({ ...data, updatedAt: sql`now()` })
    .where(eq(itineraryTemplateItems.id, itemId))
    .returning();
  return updated!;
}

export async function deleteTemplateItem(itemId: string) {
  const [existing] = await db.select().from(itineraryTemplateItems).where(eq(itineraryTemplateItems.id, itemId)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "Itinerary item not found" });
  await db.delete(itineraryTemplateItems).where(eq(itineraryTemplateItems.id, itemId));
}

export async function bulkReplaceTemplateItems(
  templateId: string,
  items: Omit<NewItineraryTemplateItemRecord, "id" | "templateId" | "createdAt" | "updatedAt">[],
) {
  await db.delete(itineraryTemplateItems).where(eq(itineraryTemplateItems.templateId, templateId));
  if (items.length === 0) return [];
  const inserted = await db.insert(itineraryTemplateItems)
    .values(items.map((item) => ({ ...item, templateId })))
    .returning();
  return inserted;
}
