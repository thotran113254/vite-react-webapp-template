# Phase 4: New Modules

## Overview
- **Priority**: MEDIUM
- **Effort**: 5-7 days
- **Status**: pending
- **Depends on**: Phase 1 (branding in sidebar for new menu items)
- **FBs**: FB-08 (market knowledge updates), FB-09 (experience activities), FB-13 (knowledge contribution workflow)

Three entirely new modules. FB-08 and FB-09 follow the same pattern as existing market tabs (schema + API CRUD + tab component). FB-13 is a workflow system building on FB-08's table.

## Key Insights
- Market detail page currently has 11 tabs in a `TABS` array in `market-detail-page.tsx` — adding 2 more tabs (knowledge, experiences)
- Existing tab pattern: each tab is a self-contained component with `{ marketId, isAdmin }` props, own useQuery/useMutation, own dialog forms
- `knowledge_base` table already exists for admin KB articles — FB-08 is DIFFERENT (market-specific knowledge updates, not general KB)
- FB-13 extends FB-08's table with approval workflow fields; design FB-08 table to accommodate FB-13 upfront (YAGNI exception: adding status/review fields now saves a migration later)
- Sidebar `NAV_ITEMS` array in `sidebar.tsx` needs new staff-visible item for FB-13

## Requirements

### FB-08: Market Knowledge Updates
- New table `market_knowledge_updates` with fields for market-specific knowledge
- CRUD API under `/markets/:marketId/knowledge-updates`
- New tab "Kien thuc TT" (12th tab) in market detail page
- Admin creates/edits knowledge entries per market
- Each entry: aspect (e.g., "Van hoa", "Khi hau", "Giao thong") + knowledge text
- Design table to support FB-13 workflow fields from the start

### FB-09: Experience Activities
- New table `market_experiences` — separate from `market_attractions`
- CRUD API under `/markets/:marketId/experiences`
- New tab "Trai nghiem" (13th tab) in market detail page
- Fields: activityName, cost, description, images, notes
- AI context integration: include experiences in market overview skill

### FB-13: Knowledge Contribution Workflow
- Staff can submit knowledge contributions (new sidebar menu item)
- Submissions go through approval: `draft -> pending_review -> approved/rejected`
- Admin review queue page: list pending submissions, approve/reject with notes
- Approved entries auto-sync to AI knowledge context
- Uses `market_knowledge_updates` table (same as FB-08)

## Related Code Files

### Files to Modify
| File | Change |
|------|--------|
| `/home/automation/project-template/apps/api/src/db/schema/index.ts` | Export new schemas |
| `/home/automation/project-template/apps/api/src/db/schema/market-data-relations.ts` | Add relations for new tables |
| `/home/automation/project-template/apps/api/src/routes/index.ts` | Mount new route modules |
| `/home/automation/project-template/apps/web/src/pages/market-detail-page.tsx` | Add 2 new tabs to TABS array + imports |
| `/home/automation/project-template/apps/web/src/components/layout/sidebar.tsx` | Add "Dong gop kien thuc" nav item for staff |
| `/home/automation/project-template/apps/api/src/modules/chat/skills/index.ts` | Add experience data to context builder |
| `/home/automation/project-template/apps/api/src/modules/chat/skills/overview-search-skill.ts` | Include experiences in market overview |

### Files to Create

**Schema:**
| File | Purpose |
|------|---------|
| `/home/automation/project-template/apps/api/src/db/schema/market-knowledge-updates-schema.ts` | Knowledge updates table |
| `/home/automation/project-template/apps/api/src/db/schema/market-experiences-schema.ts` | Experience activities table |

**API modules:**
| File | Purpose |
|------|---------|
| `/home/automation/project-template/apps/api/src/modules/market-data/knowledge-updates-routes.ts` | CRUD routes for knowledge updates |
| `/home/automation/project-template/apps/api/src/modules/market-data/knowledge-updates-service.ts` | Service layer |
| `/home/automation/project-template/apps/api/src/modules/market-data/experiences-routes.ts` | CRUD routes for experiences |
| `/home/automation/project-template/apps/api/src/modules/market-data/experiences-service.ts` | Service layer |
| `/home/automation/project-template/apps/api/src/modules/knowledge-review/knowledge-review-routes.ts` | Admin review queue + staff submit endpoints |
| `/home/automation/project-template/apps/api/src/modules/knowledge-review/knowledge-review-service.ts` | Approval workflow logic |

**Frontend components:**
| File | Purpose |
|------|---------|
| `/home/automation/project-template/apps/web/src/components/market-data/knowledge-updates-tab.tsx` | Tab for market knowledge entries |
| `/home/automation/project-template/apps/web/src/components/market-data/knowledge-update-form-dialog.tsx` | Create/edit knowledge entry form |
| `/home/automation/project-template/apps/web/src/components/market-data/experiences-tab.tsx` | Tab for experience activities |
| `/home/automation/project-template/apps/web/src/components/market-data/experience-form-dialog.tsx` | Create/edit experience form (with ImageManager) |
| `/home/automation/project-template/apps/web/src/pages/knowledge-contribution-page.tsx` | Staff submit knowledge page |
| `/home/automation/project-template/apps/web/src/pages/knowledge-review-page.tsx` | Admin review queue page |

**Shared types:**
| File | Purpose |
|------|---------|
| `/home/automation/project-template/packages/shared/src/types/knowledge-update.ts` | Shared types + Zod schemas |
| `/home/automation/project-template/packages/shared/src/types/experience.ts` | Shared types + Zod schemas |

## Implementation Steps

### Step 1: FB-08 — Schema: market_knowledge_updates
Create `market-knowledge-updates-schema.ts`:
```ts
export const marketKnowledgeUpdates = pgTable("market_knowledge_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
  aspect: varchar("aspect", { length: 100 }).notNull(),
    // e.g., "Van hoa", "Khi hau", "Giao thong", "An ninh", "Dich vu"
  knowledge: text("knowledge").notNull(),
  // -- FB-13 workflow fields (added upfront) --
  status: varchar("status", { length: 20 }).notNull().default("approved"),
    // Values: draft, pending_review, approved, rejected
  createdBy: uuid("created_by").notNull().references(() => users.id),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNotes: text("review_notes"),
  aiVisible: boolean("ai_visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("market_knowledge_market_id_idx").on(table.marketId),
  index("market_knowledge_status_idx").on(table.status),
  index("market_knowledge_created_by_idx").on(table.createdBy),
]);
```

Predefined aspect categories (configurable later):
```ts
const KNOWLEDGE_ASPECTS = [
  "Van hoa", "Khi hau", "Giao thong", "An ninh",
  "Dich vu", "Gia ca", "Mua sam", "Am thuc",
  "Luu tru", "Hoat dong", "Khac"
];
```

### Step 2: FB-09 — Schema: market_experiences
Create `market-experiences-schema.ts`:
```ts
export const marketExperiences = pgTable("market_experiences", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
  activityName: varchar("activity_name", { length: 255 }).notNull(),
  cost: text("cost"),           // text for flexible format: "500,000 VND/nguoi" or "Mien phi"
  description: text("description"),
  images: jsonb("images").default([]),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  aiVisible: boolean("ai_visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("market_experiences_market_id_idx").on(table.marketId),
]);
```

### Step 3: Register Schemas
1. Export both schemas from `index.ts`
2. Add relations in `market-data-relations.ts`:
   ```ts
   // markets -> marketKnowledgeUpdates (one-to-many)
   // markets -> marketExperiences (one-to-many)
   ```
3. Add shared types in `packages/shared/`:
   - `MarketKnowledgeUpdate` type + `createKnowledgeUpdateSchema` Zod schema
   - `MarketExperience` type + `createExperienceSchema` Zod schema
4. Run `pnpm db:push`

### Step 4: FB-08 — API: Knowledge Updates CRUD
Create `knowledge-updates-routes.ts` + `knowledge-updates-service.ts`:
- `GET /markets/:marketId/knowledge-updates` — list by market (admin: all statuses; staff: approved only)
- `POST /markets/:marketId/knowledge-updates` — create (admin: status=approved; staff: status=pending_review)
- `PATCH /markets/:marketId/knowledge-updates/:id` — update
- `DELETE /markets/:marketId/knowledge-updates/:id` — delete (admin only)

Service layer follows existing pattern (see market-attractions or similar module for reference).

### Step 5: FB-09 — API: Experiences CRUD
Create `experiences-routes.ts` + `experiences-service.ts`:
- `GET /markets/:marketId/experiences` — list by market
- `POST /markets/:marketId/experiences` — create (admin only)
- `PATCH /markets/:marketId/experiences/:id` — update
- `DELETE /markets/:marketId/experiences/:id` — delete
- Include images handling (same pattern as attractions)

### Step 6: FB-08 — Frontend: Knowledge Updates Tab
Create `knowledge-updates-tab.tsx` (~150 lines, following attractions-tab pattern):
- Table: Aspect | Knowledge (truncated) | Status badge | AI toggle | Actions
- Admin: full CRUD buttons
- Staff: read-only view of approved entries

Create `knowledge-update-form-dialog.tsx` (~80 lines):
- Form: aspect (select from predefined list) + knowledge (textarea)
- Admin sees status selector; staff submits as pending_review

Add to `market-detail-page.tsx`:
```ts
// In TABS array:
{ id: "knowledge", label: "Kien thuc TT" },

// In imports:
import { KnowledgeUpdatesTab } from "@/components/market-data/knowledge-updates-tab";

// In tab content:
{activeTab === "knowledge" && <KnowledgeUpdatesTab marketId={market.id} isAdmin={isAdmin} />}
```

### Step 7: FB-09 — Frontend: Experiences Tab
Create `experiences-tab.tsx` (~160 lines, following attractions-tab pattern):
- Table: Hoat dong | Chi phi | Mo ta (truncated) | Hinh anh count | AI toggle | Actions
- Card display option with images if present

Create `experience-form-dialog.tsx` (~100 lines):
- Form: activityName, cost, description (textarea), images (ImageManager), notes
- Same dialog pattern as attractions form

Add to `market-detail-page.tsx`:
```ts
{ id: "experiences", label: "Trai nghiem" },
```

### Step 8: FB-13 — Knowledge Contribution Workflow

#### 8a: Staff Submit Page
Create `knowledge-contribution-page.tsx` (~120 lines):
- Market selector dropdown (all markets)
- Aspect selector (predefined list)
- Knowledge textarea
- Submit button -> POST to knowledge-updates API with `status: pending_review`
- "My submissions" list: staff's own entries with status badges
- Filter by status: all / pending / approved / rejected

#### 8b: Admin Review Queue Page
Create `knowledge-review-page.tsx` (~150 lines):
- List all `pending_review` entries across all markets
- Each entry shows: market name, aspect, knowledge preview, submitted by, date
- Actions: Approve (sets status=approved, aiVisible=true) / Reject (sets status=rejected)
- Approve/Reject dialog: optional review notes textarea
- After approval: entry becomes visible in market knowledge tab + AI context

#### 8c: API: Review Endpoints
Create `knowledge-review-routes.ts` + `knowledge-review-service.ts`:
- `GET /admin/knowledge-reviews` — list pending_review entries (admin only)
- `PATCH /admin/knowledge-reviews/:id/approve` — set status=approved, reviewedBy, reviewedAt
- `PATCH /admin/knowledge-reviews/:id/reject` — set status=rejected + reviewNotes

#### 8d: Sidebar Update
In `sidebar.tsx`, add staff-visible nav item:
```ts
{ to: "/knowledge-contribute", label: "Dong gop kien thuc", icon: BookPlus, section: "Cong cu" },
```
Add admin nav item:
```ts
{ to: "/knowledge-reviews", label: "Duyet kien thuc", icon: ClipboardCheck, adminOnly: true },
```

#### 8e: Route Registration
- Add pages to React Router in app routes
- Mount API routes in `routes/index.ts`

### Step 9: AI Context Integration
1. In `overview-search-skill.ts` or the tool that builds market context, include approved knowledge updates:
   ```ts
   // Query approved knowledge for the market
   const knowledge = await db.select().from(marketKnowledgeUpdates)
     .where(and(eq(marketKnowledgeUpdates.marketId, marketId),
                eq(marketKnowledgeUpdates.status, "approved"),
                eq(marketKnowledgeUpdates.aiVisible, true)));
   ```
2. Similarly include experiences in market context
3. In skills `index.ts`, add tool mapping for new data if needed

### Step 10: Verify & Test
1. `pnpm typecheck`
2. Test knowledge tab: create, edit, delete entries as admin
3. Test experiences tab: create with images, edit, delete
4. Test staff contribution: submit as user, verify shows as pending
5. Test admin review: approve/reject, verify status change
6. Test AI context: ask about market knowledge, verify AI uses approved entries
7. Test sidebar: staff sees "Dong gop kien thuc", admin sees "Duyet kien thuc"

## Todo List
- [ ] Create market-knowledge-updates-schema.ts
- [ ] Create market-experiences-schema.ts
- [ ] Export schemas in index.ts + add relations
- [ ] Add shared types + Zod schemas in packages/shared
- [ ] Run pnpm db:push
- [ ] Create knowledge-updates API routes + service
- [ ] Create experiences API routes + service
- [ ] Create knowledge-updates-tab.tsx + form dialog
- [ ] Create experiences-tab.tsx + form dialog
- [ ] Add 2 new tabs to market-detail-page.tsx
- [ ] Create knowledge-contribution-page.tsx (staff submit)
- [ ] Create knowledge-review-page.tsx (admin review queue)
- [ ] Create knowledge-review API routes + service
- [ ] Add sidebar nav items for knowledge contribute/review
- [ ] Register new routes in React Router
- [ ] Mount new API routes in routes/index.ts
- [ ] Integrate approved knowledge + experiences into AI context
- [ ] Test full workflow: submit -> review -> approve -> AI uses it
- [ ] pnpm typecheck passes

## Success Criteria
- Market detail page has 13 tabs (11 existing + Knowledge + Experiences)
- Knowledge tab shows entries with CRUD for admin
- Experiences tab shows activities with images, CRUD for admin
- Staff can submit knowledge contributions from dedicated page
- Admin can approve/reject from review queue
- Approved entries appear in market knowledge tab
- AI chat includes approved knowledge + experiences in context
- All list/form patterns consistent with existing tabs

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| 13 tabs may overflow on small screens | Low | Already using overflow-x-auto scroll |
| Staff spam submissions | Medium | Rate limit on submit endpoint; admin can reject |
| AI context too large with all knowledge entries | Medium | Limit to recent N entries per market; use aiVisible toggle |
| Approval workflow edge cases (re-edit after approval) | Low | Approved entries become editable by admin only |

## Security Considerations
- Staff can only create entries with `status: pending_review` — enforce server-side
- Staff cannot update/delete others' entries — filter by createdBy in API
- Admin review endpoints require admin role middleware
- Knowledge entries respect `aiVisible` flag for AI context inclusion
- Review notes are admin-only; staff sees only approve/reject status
