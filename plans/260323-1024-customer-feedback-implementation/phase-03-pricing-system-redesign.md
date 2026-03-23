# Phase 3: Pricing System Redesign

## Overview
- **Priority**: HIGH
- **Effort**: 5-7 days
- **Status**: pending
- **Depends on**: Phase 1 (combo types disabled)
- **FBs**: FB-04 (room pricing redesign), FB-04 (role-based visibility), FB-10.2 (profit margins)

Most complex phase. Complete UI redesign of room pricing form from combo-based to period-based per-night pricing. Custom child surcharge age ranges. Role-based price visibility. Profit margin analysis.

## Key Insights

### Schema Analysis (room_pricing)
Current schema already has `seasonStart: date` and `seasonEnd: date` — but UI ignores them. Current unique index: `(roomId, comboType, dayType, seasonName)`. After removing combos, index must change.

Key existing fields that map to new design:
- `seasonStart` / `seasonEnd` -> period date ranges (already exist!)
- `seasonName` -> period label (already exists!)
- `dayType` -> day type within period (already exists!)
- `price` / `discountPrice` -> listed/discount per night (already exist!)
- `standardGuests` -> standard guest count (already exists!)
- `extraAdultSurcharge` -> adult surcharge (already exists!)
- `includedAmenities` -> needs checkbox conversion (text -> tags)

Fields that need change:
- `comboType` -> hardcode to "per_night" for all new records
- `extraChildSurcharge` (single integer) -> need `surchargeRules: jsonb` for age-based array
- No `maxCapacity` display field (but `property_rooms.capacity` serves this purpose)

### UI Redesign Scope
Current form: flat form with combo dropdown + day type dropdown + price fields.
New form: accordion/collapsible periods, each with date range + price per day type, plus global settings (standard guests, max capacity, amenities, surcharges).

### Role-Based Visibility
Current: `isAdmin` check in `room-pricing-form-dialog.tsx` only hides discount section.
Need: staff (user role) should not see ANY price numbers in pricing overview + forms.

## Requirements

### FB-04.1: Schema Changes
- Add `surchargeRules: jsonb("surcharge_rules").default([])` to `room_pricing` table
  - Format: `[{ label: "Tre em < 5 tuoi", ageMin: 0, ageMax: 5, price: 0 }, { label: "Tre em > 5 tuoi", ageMin: 5, ageMax: 18, price: 100000 }]`
- Update unique index from `(roomId, comboType, dayType, seasonName)` to `(roomId, dayType, seasonName)` since comboType will always be "per_night"
- Keep `extraChildSurcharge` for backward compat; new records use `surchargeRules`

### FB-04.2: Period-Based Pricing Form Redesign
Customer-specified layout:
```
+-- Cai dat gia theo giai doan --------------------------------+
| Giai doan 1: [22/03] -> [30/04]          [x Xoa giai doan]  |
|   Dem T2->T5: [500,000]  |  Dem T6+CN: [700,000]            |
|   Dem T7: [900,000]                                          |
|                                                              |
| Giai doan 2: [30/04] -> [10/05]          [x Xoa giai doan]  |
|   Dem T2->T5: [700,000]  |  Dem T6+CN: [900,000]            |
|   Dem T7: [1,100,000]                                        |
|                                                              |
| [+ Them giai doan gia moi]                                   |
+--------------------------------------------------------------+
| Gia niem yet: [1,800,000]  |  Gia chiet khau: [1,600,000]   |
| So luong tieu chuan: [2] nguoi                               |
| Tien ich dich vu: [An sang] [Ho boi] [Wifi]                  |
| So luong toi da: [4] nguoi  (from property_rooms.capacity)   |
+--------------------------------------------------------------+
| Phu thu:                                                     |
|  Truong hop        |  Gia phu thu                             |
|  Nguoi lon         |  [500,000]                               |
|  [Tre em < 5 tuoi] |  [0]                   [x]              |
|  [Tre em > 5 tuoi] |  [100,000]             [x]              |
|  [+ Them quy tac phu thu]                                    |
+--------------------------------------------------------------+
```

### FB-04.3: Role-Based Pricing Visibility
- API: middleware or response filter to strip `price`, `discountPrice`, surcharge fields when `user.role !== "admin"`
- Frontend: conditional rendering — staff sees "Lien he admin" placeholder instead of prices
- Pricing management page should be admin-only or read-only for staff

### FB-10.2: Profit Margin Analysis
- Formula: `margin% = (niem_yet - chiet_khau) / niem_yet * 100`
- Per room, per property, per market aggregation
- Display in pricing management page as a summary section

## Related Code Files

### Files to Modify
| File | Change |
|------|--------|
| `/home/automation/project-template/apps/api/src/db/schema/room-pricing-schema.ts` | Add `surchargeRules` jsonb; update unique index |
| `/home/automation/project-template/apps/web/src/components/market-data/room-pricing-form-dialog.tsx` | **FULL REWRITE** to period-based layout |
| `/home/automation/project-template/apps/web/src/components/market-data/room-pricing-table.tsx` | Update table to show periods instead of combo columns |
| `/home/automation/project-template/apps/web/src/components/pricing/pricing-room-overview-tab.tsx` | Add margin summary section; adjust for per-night only |
| `/home/automation/project-template/apps/web/src/components/pricing/pricing-price-matrix.tsx` | Simplify to per-night only; add margin column |
| `/home/automation/project-template/apps/web/src/pages/pricing-management-page.tsx` | Add role-based visibility check |
| `/home/automation/project-template/apps/api/src/modules/chat/skills/pricing-search-skill.ts` | Update mapping rules for new period structure |

### Files to Create
| File | Purpose |
|------|---------|
| `/home/automation/project-template/apps/web/src/components/market-data/room-pricing-period-editor.tsx` | Period date range + day-type prices sub-form |
| `/home/automation/project-template/apps/web/src/components/market-data/surcharge-rules-editor.tsx` | Dynamic surcharge rules (age ranges + prices) |
| `/home/automation/project-template/apps/web/src/components/pricing/pricing-margin-summary.tsx` | Profit margin display per property/market |

## Implementation Steps

### Step 1: Schema Changes
1. In `room-pricing-schema.ts`, add after `extraChildSurcharge` field:
   ```ts
   surchargeRules: jsonb("surcharge_rules").default([]),
   ```
2. Update unique index — change from:
   ```ts
   uniqueIndex("room_pricing_combo_day_season_idx").on(table.roomId, table.comboType, table.dayType, table.seasonName)
   ```
   to:
   ```ts
   uniqueIndex("room_pricing_room_day_season_idx").on(table.roomId, table.dayType, table.seasonName, table.seasonStart)
   ```
   Note: include `seasonStart` to allow multiple periods with same dayType
3. Run `pnpm db:push`
4. Migrate existing data: set `comboType = 'per_night'` for all existing records (or leave as-is for history)
5. Update shared types in `packages/shared/` if `RoomPricing` type is manually defined

### Step 2: Create Surcharge Rules Editor
Create `surcharge-rules-editor.tsx` (~90 lines):
```tsx
interface SurchargeRule {
  label: string;    // "Tre em < 5 tuoi"
  ageMin: number;
  ageMax: number;
  price: number;    // 0 or positive integer
}

interface SurchargeRulesEditorProps {
  rules: SurchargeRule[];
  onChange: (rules: SurchargeRule[]) => void;
  adultSurcharge: string;       // existing field
  onAdultSurchargeChange: (v: string) => void;
}
// Renders: Adult surcharge input + dynamic list of child rules
// Each rule row: [label input] [price input] [x delete]
// [+ Them quy tac phu thu] button at bottom
// Default child rules: [{label:"Tre em < 5 tuoi", ageMin:0, ageMax:5, price:0}, {label:"Tre em > 5 tuoi", ageMin:5, ageMax:18, price:100000}]
```

### Step 3: Create Period Editor Component
Create `room-pricing-period-editor.tsx` (~120 lines):
```tsx
interface PricingPeriod {
  seasonName: string;
  seasonStart: string;  // YYYY-MM-DD
  seasonEnd: string;
  dayPrices: Record<string, { price: string; discountPrice: string }>;
  // keys: "weekday", "friday", "saturday", "sunday", "holiday"
}

interface PeriodEditorProps {
  periods: PricingPeriod[];
  onChange: (periods: PricingPeriod[]) => void;
  dayOptions: PricingOption[];  // active day types from pricing_options
}
// Renders collapsible cards per period
// Each card: date pickers (start/end) + price inputs per active dayType
// [+ Them giai doan gia moi] button
// [x Xoa giai doan] per card
```
- Date inputs use native `<input type="date">` for simplicity
- Price inputs use existing `CurrencyInput` component
- Each period generates multiple `room_pricing` rows on save (one per dayType)

### Step 4: Rewrite Room Pricing Form Dialog
Rewrite `room-pricing-form-dialog.tsx` — new structure:
1. Remove combo type selector entirely
2. Replace flat form with three sections:
   - **Section 1: Periods** — `PeriodEditor` component
   - **Section 2: Room settings** — standardGuests, maxCapacity (read-only from room), includedAmenities (checkbox tags via `AmenityTagPicker` from Phase 2)
   - **Section 3: Surcharges** — `SurchargeRulesEditor` component
3. Form state changes from flat to structured:
   ```ts
   type RoomPricingFormState = {
     periods: PricingPeriod[];
     standardGuests: string;
     includedAmenities: string[];
     extraAdultSurcharge: string;
     surchargeRules: SurchargeRule[];
     notes: string;
   };
   ```
4. Save logic: for each period, for each dayType with a price, create/update a `room_pricing` record:
   ```ts
   {
     roomId, comboType: "per_night",
     dayType, seasonName: period.seasonName,
     seasonStart: period.seasonStart, seasonEnd: period.seasonEnd,
     price: dayPrice.price, discountPrice: dayPrice.discountPrice,
     standardGuests, extraAdultSurcharge,
     surchargeRules, includedAmenities: amenities.join(", "),
   }
   ```
5. Load logic: group existing `room_pricing` records by `seasonName` into periods

### Step 5: Update Room Pricing Table Display
Update `room-pricing-table.tsx`:
- Group rows by seasonName/period
- Show: period date range, then prices per dayType within
- Remove comboType column
- Add period headers as row separators

### Step 6: Role-Based Pricing Visibility
1. In pricing management page and room pricing components, check user role:
   ```tsx
   const { user } = useAuth();
   const isAdmin = user?.role === "admin";
   ```
2. If not admin, replace price values with "---" or "Lien he admin"
3. API option (stronger): add middleware to strip price fields from response for non-admin:
   ```ts
   // In pricing route handler or response transformer
   if (user.role !== "admin") {
     delete record.price; delete record.discountPrice;
     delete record.extraAdultSurcharge; delete record.surchargeRules;
   }
   ```
4. Pricing management page route in sidebar is already `adminOnly: true` — but room pricing table in property detail is visible to all. Add conditional rendering there.

### Step 7: Profit Margin Analysis (FB-10.2)
1. Create `pricing-margin-summary.tsx` (~100 lines):
   ```tsx
   // Props: rooms with pricing data for a property
   // Calculate per room: margin = (price - discountPrice) / price * 100
   // Average across all rooms for property margin
   // Display as table: Room | Listed | Discount | Margin%
   // Color-code: green >20%, yellow 10-20%, red <10%
   ```
2. Add margin column to `pricing-price-matrix.tsx`:
   - After price cells, add "Bien LN" column showing calculated margin %
3. Add property-level margin summary at top of `pricing-room-overview-tab.tsx`:
   ```tsx
   <div className="grid grid-cols-3 gap-4 mb-4">
     <Card>Bien LN TB thi truong: {avgMarketMargin}%</Card>
     <Card>KS cao nhat: {maxProperty} ({maxMargin}%)</Card>
     <Card>KS thap nhat: {minProperty} ({minMargin}%)</Card>
   </div>
   ```
4. API: add margin calculation endpoint or compute client-side from existing pricing data
   - Client-side preferred (KISS): pricing data already fetched, margin is simple arithmetic

### Step 8: Update AI Pricing Skill
1. In `pricing-search-skill.ts`, update mapping rules:
   - Remove combo type mappings ("2N1D"->2n1d, "3N2D"->3n2d)
   - Add period awareness: "gia thang 4" -> filter by seasonStart/seasonEnd range
   - Keep dayType mappings intact

### Step 9: Verify & Test
1. `pnpm typecheck`
2. Test period creation: add 2 periods with different date ranges
3. Test surcharge rules: add custom child age ranges
4. Test role visibility: login as user, verify prices hidden
5. Test margin display: verify calculations correct
6. Test AI chat: ask pricing question, verify period-aware response

## Todo List
- [ ] Add `surchargeRules` jsonb to room_pricing schema
- [ ] Update unique index to remove comboType dependency
- [ ] Run `pnpm db:push` for schema changes
- [ ] Create surcharge-rules-editor.tsx component
- [ ] Create room-pricing-period-editor.tsx component
- [ ] Rewrite room-pricing-form-dialog.tsx with period-based layout
- [ ] Update save logic: periods -> multiple room_pricing rows
- [ ] Update load logic: group records into periods
- [ ] Update room-pricing-table.tsx display (period grouping)
- [ ] Implement role-based pricing visibility (frontend)
- [ ] Implement role-based pricing visibility (API response filter)
- [ ] Create pricing-margin-summary.tsx component
- [ ] Add margin column to pricing-price-matrix.tsx
- [ ] Add market-level margin summary to pricing-room-overview-tab.tsx
- [ ] Update pricing-search-skill.ts for period awareness
- [ ] Test all scenarios: create, edit, delete periods
- [ ] Test role-based access: admin vs user
- [ ] `pnpm typecheck` passes

## Success Criteria
- Room pricing form shows period-based layout matching customer mockup
- Periods have date ranges with per-dayType pricing within each
- No combo type selector visible; all records are per-night
- Custom child surcharge age ranges work (add/remove/edit)
- Staff (user role) cannot see price numbers anywhere
- Profit margins displayed per room and per property
- Existing pricing data still accessible (backward compat)

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Unique index change breaks existing data | HIGH | Create new index first, drop old; migrate comboType to per_night |
| Period overlap (two periods with same dates) | Medium | Validate date ranges don't overlap on save |
| Large number of pricing records per room | Medium | Pagination or virtual scroll if >50 periods |
| Role-based API filter misses some endpoints | Medium | Audit all pricing endpoints; centralize filter logic |
| Backward compat: old combo records | Medium | Keep old data; UI groups by seasonName regardless of comboType |

## Security Considerations
- **Critical**: Role-based price hiding must be enforced at API level, not just frontend
- Staff should not be able to access raw pricing data through browser DevTools/network tab
- API pricing endpoints: add role check middleware that strips sensitive fields for non-admin
- Ensure pricing management page (`/pricing`) route guard is admin-only

## Next Steps
- After this phase, AI pricing skill should be re-tested with real period-based data
- Consider adding pricing history/audit log in a future phase
