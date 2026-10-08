# AGENTS.md — iDEAL Care Frontend Instructions

This file is for any AI model (Codex, Claude, Copilot, Cursor, etc.) working in
the iDEAL Care frontend. Read it in full before writing or modifying code.
The backend has its own `AGENTS.md`; this file does not replace it, and the
backend rules (EF Core, repositories, etc.) do not apply here.

---

## 1. What this project is

iDEAL Care is a multi-tenant SaaS platform for independent nursing-care
providers, clinics, and healthcare facilities. This app is the tenant-facing
web client (staff, patients, guardians). Each tenant is reached through its
own domain and should feel like a dedicated deployment. Users must never be
made aware that the platform is shared.

The Product Requirements Specification (PRS) is the source of truth for
*what* the system does. It lives in the backend repo at
`docs/iDEAL_Care_PRS.docx` (including Addendum A on account/tenant scoping).
Read the relevant section before building a feature. If a task contradicts
the PRS or this file, stop and flag it instead of improvising.

**Out of scope for this app:** the platform-admin console (iDEAL Smart
Solution's internal staff). It will be a separate app. Do not build
platform-admin screens or login here.

---

## 2. Stack

React 19, Vite, TypeScript, React Router 7 (BrowserRouter), Zustand, Axios,
Vitest + jsdom + Testing Library. Plain CSS with custom properties. **No UI
component library is installed. Do not add one without approval.**

---

## 3. Structure and layering

```
src/types/      TypeScript types mirroring backend DTOs exactly
src/lib/        apiClient.ts (the ONLY Axios instance), authStorage.ts,
                navigationRef.ts
src/api/        one service file per backend module (authApi.ts, ...)
src/stores/     Zustand stores (authStore, subscriptionStore, ...)
src/routes/     ProtectedRoute and route guards
src/layouts/    AppLayout (sidebar, header, subscription banner, outlet)
src/pages/      route-level screens
src/components/ shared presentational components
src/data/       mock data, dev only
src/test/       Vitest tests
```

Rules:
- **Components and pages never call Axios directly.** They call functions in
  `src/api/*`, which use the single `apiClient`. No `fetch`, no second Axios
  instance, anywhere.
- Business rules do not live in components. Components render state and
  dispatch actions; stores and api modules own the logic.
- To add a feature: types in `src/types/`, api module in `src/api/`, page in
  `src/pages/`, route under the `<AppLayout>` block in `App.tsx`, real
  `<NavLink>` in the sidebar, mock data in `src/data/` only for dev.

---

## 4. Non-negotiable invariants

### 4.1 The frontend is never the security boundary
- Every authorization, permission, subscription and business-rule check is
  enforced by the backend. Hiding a button or route in the UI is UX only.
- Never implement "can this user do X" purely client-side and treat it as
  protection. If the backend would reject the call, the UI must still handle
  the rejection correctly.
- Never trust or send a client-chosen tenant ID, patient ID or role as
  authority. Identity and tenant come from the authenticated session.

### 4.2 One API client, one interceptor chain
`src/lib/apiClient.ts` has a single response interceptor. Do not add
competing interceptors or per-page handling of these cases:
- **401** (outside the login request itself, and when not already on
  `/login`): `authStore.logout()`, `subscriptionStore.clearBlocked()`, then
  redirect to `/login` via `navigationRef`. A 401 from the login request is
  a form error, handled by `LoginPage`.
- **402**: parse the reason code and message, call
  `subscriptionStore.setBlocked(...)`. Do NOT log out, do NOT redirect, do
  NOT touch auth state. Re-throw the error afterward.
- **2xx**: clear `subscriptionStore.blockState` if one is set. Skip the write
  when it is already null.

### 4.3 Subscription reason codes (verbatim backend contract)
A 402 body is `{ "error": "<code>", "message": "..." }`:
- `subscription_required`: tenant never subscribed. Show the initial
  subscription flow.
- `subscription_expired` / `subscription_cancelled`: show a renewal prompt.
- `subscription_admin_only`: a non-admin hit a subscription route while the
  tenant is blocked. Show "contact your administrator", never a renewal
  action.

`SubscriptionBlockedBanner` in `AppLayout` shows these app-wide. It is a
banner, not a blocking overlay. Reason codes from other backend modules
(for example admission precondition 409s) must be taken from the backend
contract. Do not guess or invent code strings.

### 4.4 Tenant and account model
- One user belongs to exactly one tenant. There is **no tenant switcher**
  and no list of memberships. The login response carries one tenant.
- Login sends the frontend's own hostname as `domain`
  (`window.location.hostname`). The backend resolves the tenant from it.
  `VITE_DEV_TENANT_DOMAIN` may override it, only behind
  `import.meta.env.DEV`, never in a production build.
- Patients can self-register on the tenant's domain
  (`POST /api/patients/register-account`).
- Login and registration failures are generic. Never write UI copy or logic
  that distinguishes unknown domain, unknown email and wrong password.

### 4.5 Error semantics
- `404`: show a neutral "not found". It can mean missing OR another tenant's.
  Never imply which.
- `403`: the resource exists and is yours, but you lack a specific permission
  or assignment. Show a clear "no permission" state.
- `409` with a reason code: show the specific message for that code, not a
  generic error.
- Handle network failure, loading and empty states on every data screen.

### 4.6 Money, records and PHI
- The server computes all amounts, balances and totals. The UI displays
  them. Never compute an authoritative total, balance or fee client-side,
  and never let a client-edited amount drive a charge.
- Care records are immutable. There is no "edit" UI for them. A correction is
  a new record that references the original.
- Patient health data (PHI) must never go into `localStorage`, URL query
  strings, console logs, error reports or analytics. The only things
  persisted client-side are the access token and its expiry, through
  `authStorage`.
- Token storage goes through `src/lib/authStorage.ts` only. Do not read or
  write `localStorage` for auth anywhere else.

### 4.7 Dev bypass and mocks
- `VITE_DEV_BYPASS_AUTH=true` returns mock auth with no network calls. It
  must never be enabled in a production build. `.env.local` is never
  committed.
- Mock data lives in `src/data/` and is used only in dev. Real API modules
  must work with the bypass turned off, and every feature must be verified
  against the real backend contract before it is called done.

---

## 5. Types and the backend contract

- `src/types/` mirrors backend DTOs field-for-field, camelCase as
  serialized. If you are unsure of a DTO's shape, check the backend OpenAPI
  document or ask. Do not guess field names.
- Claim names, if you ever decode the JWT, are `tenant_id` and
  `tenant_role`. Prefer using the login response over decoding the token.
  Define the claim names once, in one place.
- Role names mirror the backend `TenantRole` enum. Do not invent roles.

---

## 6. Styling

- Plain CSS with the custom-property tokens in `src/index.css`. Reuse the
  existing tokens; do not introduce new colors or fonts ad hoc.
- Light and dark mode both work via `prefers-color-scheme`. Check both.
- Per-tenant branding (logo, colors) is a planned separate feature. Do not
  hardcode "iDEAL Care" branding into places a tenant would need to
  override.

---

## 7. Before you consider a task "done"

- [ ] Typecheck, lint and build pass
- [ ] Vitest suite passes, with tests for the new behavior (loading, empty,
      error and the relevant 401/402/403/404/409 paths)
- [ ] No component or page calls Axios or `fetch` directly
- [ ] Types match the backend DTO/OpenAPI exactly
- [ ] No PHI in storage, URLs or logs
- [ ] Works against the real backend with `VITE_DEV_BYPASS_AUTH=false`
      (when a live backend is available; otherwise say it is unverified)
- [ ] CI is green on the branch (once frontend CI exists), not just local

---

## 8. Never do this

- Never add a second Axios instance or call `fetch` for API traffic.
- Never handle 401/402 per page. The interceptor owns it.
- Never log out or redirect on a 402.
- Never build a tenant switcher or assume a user has multiple tenants.
- Never put authorization logic only in the UI.
- Never compute authoritative money values client-side.
- Never store PHI client-side, or log it.
- Never add an edit flow for care records.
- Never add a UI library, state library or router change without approval.
- Never leave `VITE_DEV_BYPASS_AUTH` enabled for a production build.
- Never invent reason-code strings, DTO fields or role names.

---

## 9. When in doubt, stop and ask

- The backend contract for an endpoint is unclear or missing
- A change would touch `apiClient.ts`, `authStore`, `ProtectedRoute` or the
  interceptor behavior
- A feature seems to need a new dependency
- A task would need platform-admin functionality
- Anything that seems to need bypassing a rule in Section 4 "just this once"
