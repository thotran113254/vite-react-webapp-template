# Phase 2: Image Upload & UI Enhancements

## Overview
- **Priority**: HIGH
- **Effort**: 2-3 days (ACTUAL: completed)
- **Status**: completed
- **Depends on**: Phase 1 (schema migrations for propertyCode, transport images)
- **FBs**: FB-06, FB-07 (UI), FB-03 (UI), FB-05, FB-02.1

Enhance existing data entry forms: add image upload to attractions/transport, property amenity checkboxes, property card view, markets stat card.

## Key Insights
- `ImageManager` component at `image-manager.tsx` is fully reusable (props: `images`, `onChange`, `disabled`, `maxImages`) — used in property detail already
- `market_attractions` schema already has `images: jsonb` — only UI missing
- Attractions form dialog in `attractions-tab.tsx` is inline (not a separate dialog component) — add ImageManager after text fields
- Transport provider form is extracted to `transport-provider-form-dialog.tsx` — clean separation
- Properties table in `properties-tab.tsx` uses inline form with `FormState` — needs `propertyCode` + amenities rework
- `amenities` in `market_properties` is `jsonb` storing array — perfect for checkbox tags
- Dashboard stat cards use a hardcoded array of 8 cards in `dashboard-stat-cards.tsx` — add 9th for markets

## Requirements

### FB-06: Attractions Image Upload
- Add `ImageManager` to attraction edit/create dialog
- Wire images to save payload (already in schema: `market_attractions.images`)
- Ensure API attraction CRUD passes through `images` field

### FB-07 UI: Transport Provider Images + Pricing Note
- Add `ImageManager` to `transport-provider-form-dialog.tsx`
- Add `pricingNotes` textarea field to form
- Update form state type + save payload to include `images` + `pricingNotes`
- Ensure API passes through new fields

### FB-03 UI: Property Form Enhancements
- Add `propertyCode` input field to property create/edit form
- Change amenities from `Textarea` to checkbox tag picker
- Predefined amenity list: Bai bien, Wifi mien phi, Ho boi, Phong hop, Nha hang, Spa, Gym, Dieu hoa, Bep, San vuon
- Allow custom amenities via text input + Enter to add
- Better notes display with clear label "Luu y khach san"

### FB-05: Property Card Grid View
- New component: card grid with hotel-style cards (photo, stars, type, amenity icons)
- View mode toggle (Table / Cards) in properties tab header
- Card shows: first image, name, type badge, star rating, amenity icons, status, AI toggle

### FB-02.1: Dashboard Markets Stat Card
- Add "Tong thi truong" stat card to dashboard
- Backend: add `markets` count to dashboard stats API response
- Frontend: add 9th card with Globe icon

## Related Code Files

### Files to Modify
| File | Change |
|------|--------|
| `/home/automation/project-template/apps/web/src/components/market-data/attractions-tab.tsx` | Add ImageManager + images to form state + save payload |
| `/home/automation/project-template/apps/web/src/components/market-data/transport-provider-form-dialog.tsx` | Add ImageManager + pricingNotes field + update form type |
| `/home/automation/project-template/apps/web/src/components/market-data/transport-providers-tab.tsx` | Pass images + pricingNotes through save mutation |
| `/home/automation/project-template/apps/web/src/components/market-data/properties-tab.tsx` | Add propertyCode to FormState + amenities checkbox picker + view toggle |
| `/home/automation/project-template/apps/web/src/components/market-data/property-detail-dialog.tsx` | Show propertyCode in info grid |
| `/home/automation/project-template/apps/web/src/components/dashboard/dashboard-stat-cards.tsx` | Add markets count stat card |
| `/home/automation/project-template/apps/web/src/pages/dashboard-page.tsx` | Pass markets stat to DashboardStatCards |
| `/home/automation/project-template/apps/api/src/routes/index.ts` | Verify dashboard stats endpoint returns markets count |

### Files to Create
| File | Purpose |
|------|---------|
| `/home/automation/project-template/apps/web/src/components/market-data/property-card-grid.tsx` | Hotel-style card grid view for properties |
| `/home/automation/project-template/apps/web/src/components/market-data/amenity-tag-picker.tsx` | Reusable checkbox tag picker for amenities |

## Implementation Steps

### Step 1: FB-06 — Attractions Image Upload
1. Open `attractions-tab.tsx` (210 lines)
2. Add to `FormState`:
   ```ts
   images: string[];
   ```
3. Update `EMPTY_FORM`: add `images: []`
4. Import `ImageManager` from `./image-manager`
5. In dialog form grid, add after `suitableFor` field (before `</div>` closing grid):
   ```tsx
   <div className="col-span-2">
     <label className="text-sm font-medium">Hinh anh</label>
     <ImageManager
       images={form.images}
       onChange={(imgs) => setForm(s => ({ ...s, images: imgs }))}
       maxImages={8}
     />
   </div>
   ```
6. Update `openEdit` to populate images: `images: (item.images as string[]) ?? []`
7. Update `saveMutation` payload to include `images: form.images`
8. Verify API endpoint `PATCH /markets/:id/attractions/:aid` accepts `images` field — check attraction module service

### Step 2: FB-07 UI — Transport Provider Form
1. Open `transport-provider-form-dialog.tsx` (119 lines)
2. Update `TransportProviderFormState`:
   ```ts
   images: string[];
   pricingNotes: string;
   ```
3. Update `EMPTY_PROVIDER_FORM`: add `images: [], pricingNotes: ""`
4. Import `ImageManager` from `./image-manager`
5. Add ImageManager section after notes field:
   ```tsx
   <div className="col-span-2 flex flex-col gap-1.5">
     <label className="text-sm font-medium">Hinh anh</label>
     <ImageManager images={form.images} onChange={(imgs) => setForm(s => ({ ...s, images: imgs }))} maxImages={6} />
   </div>
   ```
6. Add pricing notes textarea before notes field:
   ```tsx
   <div className="col-span-2 flex flex-col gap-1.5">
     <label className="text-sm font-medium">Ghi chu gia (chiet khau, niem yet, phu thu TE)</label>
     <textarea ... value={form.pricingNotes} onChange={...} placeholder="VD: Chiet khau 10% cho doan >10 nguoi..." />
   </div>
   ```
7. Open `transport-providers-tab.tsx` — update save mutation to include `images` + `pricingNotes` in payload
8. Update edit handler to populate new fields from existing record

### Step 3: FB-03 UI — Property Form Enhancements
1. Create `amenity-tag-picker.tsx` (~80 lines):
   ```tsx
   // Props: selectedAmenities: string[], onChange: (amenities: string[]) => void
   // Predefined tags as clickable badges with checkmarks
   // Custom input with Enter-to-add
   const PREDEFINED = [
     "Bai bien", "Wifi mien phi", "Ho boi", "Phong hop",
     "Nha hang", "Spa", "Gym", "Dieu hoa", "Bep", "San vuon",
     "Bua sang", "Dua don san bay", "Cho do xe", "Phong xong hoi"
   ];
   ```
2. Open `properties-tab.tsx` — update `FormState`:
   - Add `propertyCode: string`
   - Change `amenities` type conceptually (currently not in FormState — `amenities` is in schema but form uses textarea-like flow)
   - Add `amenities: string[]` to FormState
3. Update `EMPTY_FORM`: add `propertyCode: ""`, `amenities: []`
4. Add `propertyCode` Input field in create/edit dialog (after name, before type):
   ```tsx
   <div className="flex flex-col gap-1.5">
     <label className="text-sm font-medium">Ma khach san</label>
     <Input value={form.propertyCode} onChange={...} placeholder="VD: HBDNG-001" />
   </div>
   ```
5. Replace amenities textarea with `AmenityTagPicker` component
6. Update save payload to include `propertyCode` + `amenities` as array
7. Update `openEdit` to populate `propertyCode` from property data and `amenities` from jsonb
8. In `property-detail-dialog.tsx`, add propertyCode display in info grid:
   ```tsx
   <div>
     <p className="text-xs text-muted">Ma KS</p>
     <p className="font-medium">{property.propertyCode ?? "—"}</p>
   </div>
   ```

### Step 4: FB-05 — Property Card Grid View
1. Create `property-card-grid.tsx` (~120 lines):
   ```tsx
   interface PropertyCardGridProps {
     properties: MarketProperty[];
     isAdmin: boolean;
     onView: (property: MarketProperty) => void;
     onEdit: (property: MarketProperty) => void;
   }
   // Each card: first image as cover, name, type badge, star rating as stars,
   // amenity icons (pool, wifi, restaurant), status badge, AI toggle
   // Responsive grid: 1col mobile, 2col sm, 3col lg
   ```
2. Use Card component from `@/components/ui/card`
3. Use `ImageThumbnail` from `image-manager.tsx` for cover image (larger size)
4. Map amenity strings to lucide icons (Waves=pool, Wifi=wifi, UtensilsCrossed=restaurant, etc.)
5. In `properties-tab.tsx`, add view mode state:
   ```tsx
   const [viewMode, setViewMode] = useState<"table" | "cards">("table");
   ```
6. Add toggle buttons (Table icon / Grid icon) next to "Them moi" button
7. Conditionally render existing table OR new PropertyCardGrid based on viewMode
8. Import `LayoutGrid, List` icons from lucide for toggle buttons

### Step 5: FB-02.1 — Dashboard Markets Stat Card
1. Locate dashboard stats API in route handler (likely `apps/api/src/routes/index.ts` or a dashboard module)
2. Add markets count query:
   ```ts
   const marketsCount = await db.select({ count: count() }).from(markets);
   ```
3. Add to stats response: `markets: { total: marketsCount }`
4. In `dashboard-stat-cards.tsx`:
   - Import `Globe` from lucide
   - Add to `DashboardStats` interface: `markets: { total: number }`
   - Add 9th card:
     ```ts
     { label: "Thi truong", value: stats.markets.total, icon: Globe,
       colorClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" }
     ```
5. In `dashboard-page.tsx`, verify stats data shape includes markets

### Step 6: Verify
1. `pnpm typecheck` — ensure no TS errors from new props/types
2. Test attractions form — create with images, edit with images
3. Test transport provider form — images + pricing notes save
4. Test property form — propertyCode input, amenity tag picker
5. Test property view toggle — table and card views
6. Test dashboard — 9 stat cards visible for admin

## Todo List
- [x] FB-06: Add ImageManager to attractions form dialog
- [x] FB-06: Wire images to save mutation payload
- [x] FB-06: Verify API accepts images field on attraction CRUD
- [x] FB-07: Add ImageManager + pricingNotes to transport provider form
- [x] FB-07: Update transport-providers-tab save mutation
- [x] FB-03: Create amenity-tag-picker.tsx component
- [x] FB-03: Add propertyCode field to property form
- [x] FB-03: Replace amenities textarea with AmenityTagPicker
- [x] FB-03: Show propertyCode in property detail dialog
- [x] FB-05: Create property-card-grid.tsx component
- [x] FB-05: Add view mode toggle to properties-tab
- [x] FB-02.1: Add markets count to dashboard stats API
- [x] FB-02.1: Add Globe stat card to dashboard-stat-cards.tsx
- [x] Run `pnpm typecheck` and test all changes

## Success Criteria
- [x] Attractions form shows image upload area; images persist on save
- [x] Transport provider form shows image upload + pricing notes field
- [x] Property form has propertyCode input + amenity checkbox tags
- [x] Properties tab has Table/Card toggle; card view shows hotel-style cards
- [x] Dashboard shows 9 stat cards including "Thi truong" count
- [x] All existing functionality still works (table view, CRUD operations)

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| ImageManager in attractions dialog makes it too tall | Low | Dialog already has max-h-85vh overflow-y-auto |
| Amenity tag picker predefined list doesn't match customer needs | Low | Allow custom tags via text input |
| Property card grid layout breaks on small screens | Medium | Use responsive grid cols (1/2/3) |
| Dashboard stats API change breaks existing frontend | Low | Add field, don't remove; frontend handles undefined gracefully |

## Security Considerations
- Image upload uses existing `/upload` endpoint with auth middleware — no new attack surface
- No role changes; admin-only CRUD stays admin-only
