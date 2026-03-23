# Phase 5: Admin Analytics & Reporting

## Overview
- **Priority**: MEDIUM
- **Effort**: 5-7 days
- **Status**: pending
- **Depends on**: No hard dependency on Phases 2-4 (only uses existing chat_sessions + chat_messages tables)
- **FBs**: FB-02.2 (FAQ aggregation), FB-02.3 (staff usage tracking), FB-02.4 (admin view staff chat)

Admin-facing analytics: aggregate FAQ from chat history, track staff usage time, allow admin to view any staff member's chat sessions.

## Key Insights

### Chat Schema Analysis
- `chat_sessions`: id, userId, title, isPinned, createdAt — NO `updatedAt`, NO duration fields
- `chat_messages` schema (from `chat-messages-schema.ts`): need to verify fields — likely id, sessionId, role, content, createdAt
- `chat-routes.ts` currently filters sessions by `userId` from JWT — admin endpoint needs to bypass this
- No existing analytics infrastructure; all new

### FAQ Aggregation Approach
Simple approach (KISS): extract user messages from `chat_messages`, group by similarity or keyword extraction. Full NLP overkill — use basic text analysis: common question prefixes ("gia bao nhieu", "lam sao", "cho toi biet"), keyword frequency, or Gemini-powered summarization of top questions.

Recommended: batch analysis via Gemini cheap model. Periodically (or on-demand) send last N user messages to Gemini with prompt "Group these into FAQ categories and rank by frequency."

### Staff Usage Tracking
Need to add `lastMessageAt` to `chat_sessions` to calculate session duration. Alternative: derive from `MAX(chat_messages.createdAt)` per session — no schema change needed but slower query.

Recommended: add `lastMessageAt` to `chat_sessions` (updated on each new message) + compute duration as `lastMessageAt - createdAt`.

## Requirements

### FB-02.2: FAQ Aggregation
- Aggregate questions across all user chat messages
- Group by topic/category
- Rank by frequency
- Display as admin analytics table
- Approach options:
  - **Option A** (simple): keyword extraction + frequency counting — fast, no AI cost
  - **Option B** (smart): batch Gemini analysis — better grouping, costs tokens
- Recommend: Option A for MVP, Option B as enhancement

### FB-02.3: Staff Usage Tracking
- Per user: total sessions, total messages, estimated active time
- Time calculation: sum of (lastMessageAt - createdAt) per session
- Display as admin analytics table with user name, sessions, messages, time
- Period filter: last 7d, 30d, 90d, all

### FB-02.4: Admin View Staff Chat Sessions
- Admin can browse any staff member's chat sessions
- Read-only chat viewer (admin cannot send messages)
- Filter by user, date range
- Shows full message history per session

## Related Code Files

### Files to Modify
| File | Change |
|------|--------|
| `/home/automation/project-template/apps/api/src/db/schema/chat-sessions-schema.ts` | Add `lastMessageAt` timestamp field |
| `/home/automation/project-template/apps/api/src/modules/chat/chat-service.ts` | Update `lastMessageAt` on new message |
| `/home/automation/project-template/apps/api/src/modules/chat/chat-routes.ts` | Update lastMessageAt in message save flow |
| `/home/automation/project-template/apps/api/src/routes/index.ts` | Mount admin analytics routes |
| `/home/automation/project-template/apps/web/src/components/layout/sidebar.tsx` | Add admin analytics nav items |
| `/home/automation/project-template/apps/web/src/components/dashboard/dashboard-stat-cards.tsx` | Optional: link stat cards to analytics pages |

### Files to Create

**API:**
| File | Purpose |
|------|---------|
| `/home/automation/project-template/apps/api/src/modules/admin-analytics/analytics-routes.ts` | Admin analytics endpoints |
| `/home/automation/project-template/apps/api/src/modules/admin-analytics/analytics-service.ts` | Analytics queries + aggregation |
| `/home/automation/project-template/apps/api/src/modules/admin-analytics/faq-aggregator.ts` | FAQ extraction + grouping logic |

**Frontend:**
| File | Purpose |
|------|---------|
| `/home/automation/project-template/apps/web/src/pages/admin-analytics-page.tsx` | Analytics dashboard with tabs |
| `/home/automation/project-template/apps/web/src/components/admin/faq-analytics-tab.tsx` | FAQ aggregation display |
| `/home/automation/project-template/apps/web/src/components/admin/staff-usage-tab.tsx` | Staff usage tracking table |
| `/home/automation/project-template/apps/web/src/components/admin/staff-chat-viewer-tab.tsx` | Admin chat session browser |
| `/home/automation/project-template/apps/web/src/components/admin/chat-session-viewer-dialog.tsx` | Read-only chat message viewer |

## Implementation Steps

### Step 1: Schema — Add lastMessageAt
1. In `chat-sessions-schema.ts`, add:
   ```ts
   lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
   ```
2. Run `pnpm db:push`
3. Backfill existing sessions — SQL:
   ```sql
   UPDATE chat_sessions cs
   SET last_message_at = (
     SELECT MAX(cm.created_at) FROM chat_messages cm WHERE cm.session_id = cs.id
   )
   WHERE cs.last_message_at IS NULL;
   ```
4. In `chat-service.ts` or `chat-routes.ts`, update `lastMessageAt` when saving a new message:
   ```ts
   await db.update(chatSessions)
     .set({ lastMessageAt: new Date() })
     .where(eq(chatSessions.id, sessionId));
   ```

### Step 2: FB-02.2 — FAQ Aggregation (Option A: Keyword-based)
Create `faq-aggregator.ts` (~100 lines):
```ts
interface FaqEntry {
  question: string;      // representative question text
  count: number;         // frequency
  category: string;      // auto-categorized
  examples: string[];    // sample messages (max 3)
}

// Logic:
// 1. Query user-role messages from chat_messages (role = "user")
// 2. Filter to questions (contains "?", starts with question words)
// 3. Normalize: lowercase, remove punctuation, trim
// 4. Group by keyword similarity:
//    - Extract key phrases: "gia phong", "combo", "xe di", "diem tham quan", etc.
//    - Category mapping: { "gia|bao nhieu|chi phi": "Gia ca", "xe|tau|di chuyen": "Van chuyen", ... }
// 5. Sort by count descending
// 6. Return top 20 FAQ entries
```

API endpoint: `GET /admin/analytics/faq?period=30d`

### Step 3: FB-02.3 — Staff Usage Tracking
Create analytics service functions:
```ts
interface StaffUsageEntry {
  userId: string;
  userName: string;
  userEmail: string;
  totalSessions: number;
  totalMessages: number;
  estimatedMinutes: number;  // sum of session durations
  lastActive: string;        // most recent lastMessageAt
}

// Query:
// SELECT u.id, u.name, u.email,
//   COUNT(DISTINCT cs.id) as sessions,
//   COUNT(cm.id) as messages,
//   SUM(EXTRACT(EPOCH FROM (cs.last_message_at - cs.created_at)) / 60) as minutes,
//   MAX(cs.last_message_at) as last_active
// FROM users u
// JOIN chat_sessions cs ON cs.user_id = u.id
// JOIN chat_messages cm ON cm.session_id = cs.id
// WHERE cs.created_at > :periodStart
// GROUP BY u.id, u.name, u.email
// ORDER BY messages DESC
```

API endpoint: `GET /admin/analytics/usage?period=30d`

### Step 4: FB-02.4 — Admin Staff Chat Viewer
API endpoints:
- `GET /admin/chat/sessions?userId=:userId&page=1&limit=20` — list sessions for any user
- `GET /admin/chat/sessions/:sessionId/messages` — get all messages in a session

Both require admin role middleware. Reuse existing chat service queries but remove userId filter (or accept userId as param instead of from JWT).

Implementation in `analytics-routes.ts`:
```ts
// GET /admin/chat/sessions
app.get("/admin/chat/sessions", adminMiddleware, async (c) => {
  const userId = c.req.query("userId");
  const page = Number(c.req.query("page") ?? 1);
  const sessions = await chatService.getSessionsByUser(userId, page);
  return c.json({ data: sessions });
});

// GET /admin/chat/sessions/:id/messages
app.get("/admin/chat/sessions/:id/messages", adminMiddleware, async (c) => {
  const messages = await chatService.getSessionMessages(c.req.param("id"));
  return c.json({ data: messages });
});
```

### Step 5: Frontend — Analytics Page Shell
Create `admin-analytics-page.tsx` (~60 lines):
- Three tabs: "FAQ" | "Su dung nhan su" | "Chat nhan vien"
- Each tab renders respective component
- Admin-only route

### Step 6: Frontend — FAQ Analytics Tab
Create `faq-analytics-tab.tsx` (~100 lines):
- Period selector: 7d / 30d / 90d / All
- Table: # | Cau hoi | Danh muc | So lan hoi | Vi du
- Sort by frequency
- Optional: bar chart visualization (simple CSS bars, no chart library needed)

### Step 7: Frontend — Staff Usage Tab
Create `staff-usage-tab.tsx` (~100 lines):
- Period selector: 7d / 30d / 90d / All
- Table: Nhan vien | Email | Phien chat | Tin nhan | Thoi gian (phut) | Hoat dong cuoi
- Sort by messages or time
- Highlight most active users

### Step 8: Frontend — Staff Chat Viewer
Create `staff-chat-viewer-tab.tsx` (~120 lines):
- User selector dropdown (list all non-admin users)
- Sessions list for selected user (title, date, message count)
- Click session to open viewer dialog

Create `chat-session-viewer-dialog.tsx` (~80 lines):
- Reuse `ChatMessageBubble` component from `@/components/chat/chat-message-bubble.tsx`
- Display all messages in read-only scroll view
- Show session title, user name, date at top
- No input area (read-only)

### Step 9: Sidebar + Routing
1. In `sidebar.tsx`, add admin nav item:
   ```ts
   { to: "/admin/analytics", label: "Bao cao & Phan tich", icon: BarChart3, adminOnly: true },
   ```
2. Register route in React Router:
   ```tsx
   <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
   ```
3. Mount API routes in `routes/index.ts`:
   ```ts
   app.route("/admin/analytics", analyticsRoutes);
   app.route("/admin/chat", adminChatRoutes);
   ```

### Step 10: Verify & Test
1. `pnpm typecheck`
2. Test FAQ aggregation: verify questions grouped correctly
3. Test staff usage: verify session/message counts match
4. Test chat viewer: select user, browse sessions, read messages
5. Test period filters: 7d/30d/90d return correct ranges
6. Test admin-only access: non-admin gets 403

## Todo List
- [ ] Add `lastMessageAt` to chat_sessions schema
- [ ] Run pnpm db:push + backfill existing sessions
- [ ] Update chat-service to set lastMessageAt on new messages
- [ ] Create faq-aggregator.ts with keyword-based extraction
- [ ] Create analytics-routes.ts + analytics-service.ts
- [ ] Create admin chat session/message endpoints
- [ ] Create admin-analytics-page.tsx with 3 tabs
- [ ] Create faq-analytics-tab.tsx
- [ ] Create staff-usage-tab.tsx
- [ ] Create staff-chat-viewer-tab.tsx + chat-session-viewer-dialog.tsx
- [ ] Add sidebar nav item for analytics
- [ ] Register frontend route + API routes
- [ ] Test FAQ aggregation with real chat data
- [ ] Test usage tracking calculations
- [ ] Test chat viewer read-only mode
- [ ] Test admin-only access control
- [ ] pnpm typecheck passes

## Success Criteria
- Admin analytics page accessible from sidebar with 3 tabs
- FAQ tab shows aggregated questions ranked by frequency with categories
- Usage tab shows per-staff metrics: sessions, messages, time, last active
- Chat viewer allows admin to browse any staff member's chat history (read-only)
- Period filters work correctly across all tabs
- Non-admin users cannot access analytics endpoints (403)

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| FAQ keyword grouping inaccurate | Medium | Start simple; enhance with Gemini batch later |
| Usage time calculation wrong (session left open) | Medium | Cap max session duration at 2 hours; note as "estimated" |
| Admin chat viewer privacy concerns | HIGH | Document that admin access is for management purposes; log admin views |
| Large chat_messages table slow queries | Medium | Index on session_id + created_at; use pagination |
| lastMessageAt backfill on large dataset | Low | Run as background migration; non-blocking |

## Security Considerations
- **Admin-only**: ALL analytics endpoints require `adminMiddleware` — enforce at route level
- **Privacy**: Admin viewing staff chats is a sensitive feature
  - Consider: audit log when admin views a chat session
  - Consider: staff notification policy (organizational decision, not technical)
- **Data exposure**: FAQ aggregation must not leak raw user messages to other users
  - Only show to admin; truncate examples to prevent full message exposure
- **Rate limiting**: FAQ aggregation query could be expensive — cache results with 5-min TTL
- Chat viewer endpoints must validate sessionId belongs to a real session (prevent enumeration)

## Next Steps
- Future enhancement: Gemini-powered FAQ categorization (Option B)
- Future: export analytics to CSV/PDF
- Future: scheduled email reports to admin
- Future: real-time usage dashboard with WebSocket updates
