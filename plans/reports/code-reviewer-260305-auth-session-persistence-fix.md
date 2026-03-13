# Code Review: Auth Session Persistence Fix

**Date:** 2026-03-05
**Files:** `apps/web/src/lib/api-client.ts`, `apps/web/src/hooks/use-auth.tsx`
**Scope:** 2 files, ~35 lines changed
**Focus:** Login session persistence after page refresh

---

## Overall Assessment

The fix is **directionally correct** and solves the stated problem cleanly. The core logic — replacing the broad `/auth/` URL substring check with a specific allowlist — is the right approach. The hydration change in `use-auth.tsx` correctly unblocks the "refresh-only token" scenario. However, there are **three meaningful bugs** that survive the fix and one **medium security concern** that warrants attention.

---

## What the Fix Gets Right

1. **Correct allowlist approach.** `NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"]` is explicit and reviewable. The old wildcard `/auth/` inadvertently blocked `/auth/me`, `/auth/profile`, and `/auth/change-password` from ever triggering a token refresh.

2. **Concurrent request queuing is present.** The `isRefreshing` flag + `pendingRequests` array correctly serializes concurrent 401 responses so only one refresh call is made. This is a well-known pattern and it is implemented.

3. **Refresh token rotation.** The backend (`auth-service.ts` L112-113) blacklists the old refresh token on rotation. The client stores the new pair on success (L95-96). These align correctly.

4. **Hydration fix logic is sound.** Checking `!token && !refreshToken` before bailing out allows the case where only a refresh token exists (access token expired and cleared, or never stored) to proceed to `/auth/me`, which the interceptor can now recover.

---

## Critical Issues

None. No data-loss or auth-bypass defects introduced by this diff.

---

## High Priority Issues

### H1 — `isRefreshing` never reset on the queued-request path (race condition / hang)

**File:** `apps/web/src/lib/api-client.ts`, L73-83

**Problem:** When `isRefreshing === true`, new 401s are pushed to `pendingRequests`. But `isRefreshing = false` is only set in the `finally` block of the FIRST request's refresh flow (L109). If the refresh succeeds, queued requests resolve correctly. However, if the promise inside the queue callback itself throws (e.g., `apiClient(originalRequest)` fails with a non-401), the rejection propagates but `pendingRequests` has already been cleared (L100). That part is fine. The real risk is: if `isRefreshing` is still `true` after a failed page navigation or HMR reload in dev, subsequent app lifetime requests are silently queued forever. In production this is unlikely, but in dev with hot-reload it can produce hard-to-diagnose "stuck" states.

More concretely: the `pendingRequests` array and `isRefreshing` are **module-level singletons**. They survive React re-renders and hot module replacement but are reset on full page reload, so the blast radius is one session lifetime. It's not a regression from the fix but worth documenting.

**No code change needed for this review**, but worth a comment on why it is acceptable.

### H2 — `clearAuth()` called on 401 from credential endpoints even when no redirect is safe

**File:** `apps/web/src/lib/api-client.ts`, L63

```ts
if (
  error.response?.status !== 401 ||
  originalRequest._retry ||
  isCredentialEndpoint(originalRequest.url)
) {
  if (error.response?.status === 401) clearAuth();  // <-- fires for login/register 401s
  return Promise.reject(error);
}
```

When `POST /auth/login` returns 401 (wrong password), `isCredentialEndpoint` is `true`, so the outer `if` is entered. Then `clearAuth()` is called, which runs `localStorage.removeItem` for both tokens AND may redirect to `/login` if not already there.

**Impact:** On the login page itself, `clearAuth()` fires on every failed login attempt. The `!window.location.pathname.startsWith("/login")` guard prevents the redirect loop, but the `localStorage.removeItem` calls still execute. This is harmless when tokens don't exist yet, but if a user already has a valid session (e.g., opens a second tab, goes to login page directly, enters wrong creds), both stored tokens are wiped — effectively logging them out of all other tabs.

**Fix:**

```ts
// Only call clearAuth when we are NOT on a credential endpoint
if (
  error.response?.status !== 401 ||
  originalRequest._retry ||
  isCredentialEndpoint(originalRequest.url)
) {
  if (error.response?.status === 401 && !isCredentialEndpoint(originalRequest.url)) {
    clearAuth();
  }
  return Promise.reject(error);
}
```

### H3 — Refresh response destructuring assumes shape without guard

**File:** `apps/web/src/lib/api-client.ts`, L94

```ts
const { accessToken, refreshToken: newRefresh } = res.data.data;
```

If the API returns an unexpected shape (e.g., 200 with non-standard body due to a proxy, CDN, or a future API change), this destructuring silently produces `undefined` values. `localStorage.setItem(ACCESS_TOKEN_KEY, undefined)` stores the string `"undefined"`, which the request interceptor then sends as `Authorization: Bearer undefined`, causing every subsequent request to 401 permanently until the user clears storage.

**Fix:** Add a guard before storing:

```ts
const { accessToken, refreshToken: newRefresh } = res.data.data;
if (!accessToken || !newRefresh) {
  throw new Error("Malformed refresh response");
}
```

---

## Medium Priority Issues

### M1 — `isCredentialEndpoint` uses `includes()`, not exact match — path traversal risk

**File:** `apps/web/src/lib/api-client.ts`, L41

```ts
return NO_REFRESH_PATHS.some((path) => url?.includes(path));
```

`url?.includes("/auth/logout")` would match a hypothetical URL like `/api/v1/admin/auth/logout-users`. This is low risk in the current route structure but will silently exempt future paths that contain any of these substrings.

**Fix:** Use `endsWith` or prefix-check the path segment:

```ts
function isCredentialEndpoint(url?: string): boolean {
  if (!url) return false;
  // Strip query string before matching
  const path = url.split("?")[0];
  return NO_REFRESH_PATHS.some((p) => path.endsWith(p));
}
```

### M2 — Hydration clearTokens() call after interceptor already cleared them

**File:** `apps/web/src/hooks/use-auth.tsx`, L60-64

```ts
.catch(() => {
  // Interceptor already clears tokens and redirects on unrecoverable 401.
  // Clear any remaining tokens to stay consistent.
  clearTokens();
})
```

The comment is accurate but the double-clear is worth noting: if the interceptor successfully refreshes and retries `/auth/me` but the retry also fails (e.g., user deleted server-side between refresh and retry), the interceptor's `catch` path (L104-108 in api-client.ts) calls `clearAuth()` (which does the removals), then the `use-auth.tsx` catch also calls `clearTokens()` — same removals again. No bug, but redundant.

The bigger concern: if the error caught here is a **network error** (not 401 — e.g., `ERR_NETWORK`), `clearTokens()` still fires, logging the user out despite having valid tokens. This is a regression risk on flaky connections.

**Fix:**

```ts
.catch((err) => {
  // Only clear tokens on auth failure, not transient network errors
  if (err?.response?.status === 401) {
    clearTokens();
  }
  // For network errors, leave tokens intact — user can retry on next load
})
```

### M3 — `logout()` in use-auth.tsx sends refresh token in fire-and-forget but does not clear in-flight token state

**File:** `apps/web/src/hooks/use-auth.tsx`, L88-94

```ts
const logout = useCallback((): void => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  apiClient.post("/auth/logout", { refreshToken: refreshToken ?? "" }).catch(() => {});
  clearTokens();
  setUser(null);
}, []);
```

`clearTokens()` runs synchronously before the fire-and-forget POST completes. If any in-flight request (queued in `pendingRequests`) resolves after logout, it receives a now-cleared access token in its retry header — which will 401 again. This creates one spurious error in the console but no session leakage.

More importantly: `apiClient.post("/auth/logout", ...)` uses the apiClient interceptor. `/auth/logout` IS in `NO_REFRESH_PATHS`, so a 401 on this call (e.g., expired access token at logout time) will call `clearAuth()` again on top of the already-cleared state. Harmless but redundant. No action needed, but document the behavior.

---

## Edge Cases Verified

| Scenario | Behavior | Status |
|---|---|---|
| Both tokens missing on load | Hydration bails immediately, no API call | Correct |
| Only refresh token in storage | Hydration proceeds to `/auth/me`, interceptor refreshes on 401, retries | **Now correct** (was broken before fix) |
| Only access token (normal) | Hydration proceeds, token attached, success | Correct |
| Access token expired, refresh valid | `/auth/me` 401 -> interceptor refreshes -> retries -> succeeds | Correct |
| Both tokens expired | `/auth/me` 401 -> refresh 401 -> `clearAuth()` -> redirect to `/login` | Correct |
| Concurrent requests during refresh | All queued in `pendingRequests`, replayed with new token | Correct |
| Wrong password on `/auth/login` | 401 returned, `clearAuth()` fires unnecessarily | Bug H2 |
| Redirect loop | `clearAuth()` checks `startsWith("/login")` guard | Correct |
| Refresh returns malformed body | Silent `undefined` stored as "undefined" token string | Bug H3 |
| Network error during hydration | Tokens cleared despite still being valid | Bug M2 |

---

## Security Assessment

- **Token storage:** localStorage — known XSS exposure surface, consistent with existing architecture. No regression here.
- **Refresh token rotation:** Backend correctly blacklists old token on rotation. Client stores new pair.
- **No secret leakage** in client code.
- **Redirect loop protection:** `clearAuth()` guards against recursive redirects to `/login`.
- **`/auth/refresh` in NO_REFRESH_PATHS:** Correctly prevents infinite refresh loops where the refresh call itself 401s.

---

## Positive Observations

- The explicit `NO_REFRESH_PATHS` constant is self-documenting and easy to extend.
- Comment on L37 explaining WHY protected auth endpoints should refresh is excellent — this will prevent future regressions.
- Backend token rotation (blacklist old jti) is solid.
- `ProtectedRoute` correctly gates on `isLoading` before rendering or redirecting — no flash of redirect.
- The `isRefreshing` concurrency guard was already present before this diff and is correct.

---

## Recommended Actions (Priority Order)

1. **Fix H2** — Do not call `clearAuth()` for credential endpoint 401s. One-line guard addition.
2. **Fix H3** — Guard the refresh response destructuring before storing tokens.
3. **Fix M2** — Only call `clearTokens()` on 401, not network errors, in the hydration catch.
4. **Fix M1** — Use `endsWith` instead of `includes` in `isCredentialEndpoint`.
5. **Document** — Add inline comment explaining that `clearAuth()` in the outer early-return block (L63) should only run for non-credential 401s (cross-reference with H2 fix).

---

## Metrics

- Type coverage: No regressions. Types are explicit (`AxiosError`, `InternalAxiosRequestConfig`).
- Linting: No new issues visible.
- Test coverage: Zero tests for this module — the interceptor logic is entirely untested.
- File sizes: `api-client.ts` = 116 lines (within 200-line limit). `use-auth.tsx` = 119 lines (within limit).

---

## Unresolved Questions

- What are the configured `JWT_ACCESS_EXPIRES_IN` and `JWT_REFRESH_EXPIRES_IN` values? Short-lived access tokens (< 5 min) make the refresh-on-hydration path critical and increase the blast radius of H3.
- Is there a plan to add integration tests for the interceptor behavior? The concurrent-refresh path in particular is hard to reason about without a test.
