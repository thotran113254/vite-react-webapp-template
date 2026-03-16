import { eq, asc, and, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../../db/connection.js";
import { pricingOptions } from "../../db/schema/index.js";
import type { NewPricingOptionRecord, PricingOptionRecord } from "../../db/schema/index.js";

export async function listByCategory(category: string) {
  return db.select().from(pricingOptions)
    .where(eq(pricingOptions.category, category))
    .orderBy(asc(pricingOptions.sortOrder));
}

export async function listActive(category: string) {
  return db.select().from(pricingOptions)
    .where(and(eq(pricingOptions.category, category), eq(pricingOptions.isActive, true)))
    .orderBy(asc(pricingOptions.sortOrder));
}

export async function listAll() {
  return db.select().from(pricingOptions).orderBy(asc(pricingOptions.category), asc(pricingOptions.sortOrder));
}

export async function create(data: Omit<NewPricingOptionRecord, "id" | "createdAt" | "updatedAt">) {
  const [record] = await db.insert(pricingOptions).values(data).returning();
  return record!;
}

export async function update(id: string, data: Partial<PricingOptionRecord>) {
  const [existing] = await db.select().from(pricingOptions).where(eq(pricingOptions.id, id)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "Pricing option not found" });
  const [updated] = await db.update(pricingOptions)
    .set({ ...data, updatedAt: sql`now()` })
    .where(eq(pricingOptions.id, id))
    .returning();
  return updated!;
}

export async function remove(id: string) {
  const [existing] = await db.select().from(pricingOptions).where(eq(pricingOptions.id, id)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "Pricing option not found" });
  await db.delete(pricingOptions).where(eq(pricingOptions.id, id));
}
