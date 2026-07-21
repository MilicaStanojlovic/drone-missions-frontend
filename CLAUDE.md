# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Angular 19 application (Angular CLI 19.2.19), standalone components (no `NgModule`). It has grown past the original Mission-CRUD milestone into a small role-based marketplace app. Current feature set:

- **Auth** — JWT register / login / profile, with two roles (`DESIGNER` / `PILOT`) gating what you can do and see.
- **Missions** — a marketplace (open missions for pilots) and a designer dashboard (own missions), plus a mission planner/editor with a **Leaflet** map (waypoints + circle/polygon geofence) and a role-aware detail view with a status timeline and read-only map.
- **Bids** — a bids panel on the detail view (pilots place, designers award). **Client-only demo — no backend** (see the note under Backend integration).
- **Toasts** — a single-toast notification bus mounted at app root.

File map (under `src/app/`):

- `models/` — `mission.model.ts` (`Mission`, `MissionStatus` + status consts, `LatLng`, `Geofence`, `MissionPayload`), `user.model.ts` (`UserRole`, `UserResponse`, `RegisterPayload`, `LoginPayload`).
- `services/` — `auth.service.ts`, `mission.service.ts`, `bid.service.ts` (client-only), `toast.service.ts`, `auth.interceptor.ts` (functional `HttpInterceptorFn`).
- `guards/auth.guard.ts` — exports `authGuard`, `designerGuard`, `landingGuard` (functional `CanActivateFn`s).
- `components/` — `landing`, `login`, `register`, `profile`, `mission-list`, `mission-detail`, `mission-form`, `mission-map` (Leaflet — interactive in the editor/detail, and a static `[interactive]="false"` thumbnail on list cards), `confirm-dialog`, `toast`.
- `util/geo.ts` — framework-free geo helpers (haversine distance/duration, centroid, geofence build/clamp, in-zone tests); `DEFAULT_CENTER` / `DEFAULT_ZOOM`.

The Spring backend is expected at `http://localhost:8085`; the frontend fails gracefully (loading/error states) when it is down.

## Commands

```bash
npm start            # ng serve — dev server at http://localhost:4200 (development config, no optimization, source maps)
npm run build        # ng build — production build to dist/drone-missions-frontend
npm run watch        # ng build --watch, development configuration
npm test             # ng test — Karma + Jasmine, launches Chrome
ng test --include='**/foo.component.spec.ts'   # run a single test file
ng generate component <name>                   # scaffold a component (also: service, directive, pipe, ...)
```

There is no lint target configured and no e2e framework installed.

## Architecture

Standalone-component architecture (no `NgModule`). Key wiring:

- `src/main.ts` → `bootstrapApplication(AppComponent, appConfig)` is the entry point.
- `src/app/app.config.ts` → `appConfig` is where application-wide providers go. Currently `provideZoneChangeDetection({ eventCoalescing: true })`, `provideRouter(routes)`, and `provideHttpClient(withInterceptors([authInterceptor]))` — the auth interceptor is already wired here. Register further global HTTP interceptors in the same `withInterceptors([...])` array.
- `src/app/app.routes.ts` → the router configuration (`routes`), guard-protected (see the route table below). Define lazy/eager routes here.
- Components declare their dependencies via the standalone `imports` array in the `@Component` decorator, not through modules.

### Auth & security (how it actually works)

- **Token:** the JWT is read from the **`Authorization` response header** of `POST /auth/login` (strip the `Bearer ` prefix) and stored in `localStorage` under the key **`dm_token`**. `AuthService.logout()` clears it.
- **Outbound:** `authInterceptor` attaches `Authorization: Bearer <token>` to any request whose URL starts with `http://localhost:8085` when a token is present. On a **401** (except `/api/v1/auth/*` calls) it logs out and redirects to `/login`.
- **Client-side claims:** `AuthService` decodes the JWT *payload* (base64url) to read `sub` (userId), `role`, and `exp` — `isLoggedIn` / `isDesigner` / `isPilot` derive from it. This is **not** a signature check; it's convenience only, the backend still validates.
- **Profile:** cached in-memory via a `BehaviorSubject` (`profile$`); re-fetched from `GET /api/v1/users/me` once after a reload while logged in.

## Conventions

- **Never surface raw IDs to the user.** Database/entity identifiers (`user.id`, `mission.id`, `userId`, etc.) are for wiring routes and API calls only — do **not** render them in any user-facing page (no "Account ID", no "#123" labels, no ID columns). Use human-meaningful fields instead (name, username, email, status). IDs may live in URLs and `[routerLink]` params, but never in visible text.
- Component selector prefix is `app` (e.g. `app-root`), enforced by `angular.json`.
- TypeScript runs in `strict` mode with additional strictness: `noImplicitOverride`, `noPropertyAccessFromIndexSignature` (index-signature properties must use bracket access), `noImplicitReturns`, `noFallthroughCasesInSwitch`. Angular `strictTemplates` is on.
- Production build enforces bundle budgets: 500 kB initial (warn) / 1 MB (error), and 4 kB / 8 kB per component stylesheet — keep an eye on these when adding dependencies.
- Static assets go in `public/` (served at root).

## Design

- The app's visual design is authored in **Claude Design** and imported through the **`claude_design` MCP** server (`https://api.anthropic.com/v1/design/mcp`; authenticate with `/design-login` before using its tools).
- **Source of truth:** the design project is `DroneMissions` — `https://claude.ai/design/p/bfa48adc-abf3-48a1-8976-6b1d2a992da8?file=DroneMissions.dc.html`. The canvas file to implement is **`DroneMissions.dc.html`**.
- When implementing or updating the UI, import from that design project via the MCP and translate `DroneMissions.dc.html` into the standalone Angular components — keep the existing component/style structure and conventions above (design tokens, colors, and spacing come from the canvas, not ad-hoc values).

---

# Mission CRUD feature guidance

Conventions for extending the Mission feature (and shaping future features the same way). Where current code already follows a pattern it is noted; where a pattern is recommended but not yet applied everywhere, that is called out so you don't assume it exists.

## 1. Backend integration

- All API access goes through `HttpClient`, provided once in `app.config.ts` via `provideHttpClient()`. Do **not** import `HttpClientModule` (deprecated, module-based).
- **Base URL:** the REST API is rooted at `http://localhost:8085/api/v1`. Mission endpoints live under `/missions` (`MissionService.baseUrl`). When adding a new resource, follow the same `${API}/<resource>` shape.
- The URL is currently a hard-coded `private readonly baseUrl` string in the service. If a second service needs the same host, promote the root (`http://localhost:8085/api/v1`) to `src/environments/environment.ts` (Angular's `ng generate environments`) rather than duplicating the literal.
- **CORS / proxy:** the backend must allow origin `http://localhost:4200`, or add a `proxy.conf.json` and run `ng serve --proxy-config` so `/api` is same-origin. There is no proxy config yet.
- Timestamps (`Instant`) cross the wire as ISO-8601 strings — keep them typed as `string` in models and convert at the edges (see the form's `datetime-local` helpers).
- **Bids are client-only.** `BidService` has **no backend** — it persists to `localStorage` under the prefix `dm_bids_<missionId>`. Treat it as a demo/placeholder; if/when a real bids API lands, swap the storage calls for `HttpClient` and keep the same method shapes. Don't assume a `/bids` endpoint exists.

## 2. Service layer patterns

- Services are `@Injectable({ providedIn: 'root' })` singletons and use the `inject()` function (not constructor params) — matches `MissionService`.
- **Every method returns a cold `Observable<T>` and does nothing else** — no `.subscribe()` inside the service, no state caching. Subscription (and therefore the actual HTTP call) is the caller's responsibility. This keeps services thin and testable.
- Type each call with the response shape: `this.http.get<Mission[]>(...)`, `post<Mission>(...)`, `delete<void>(...)`.
- Use the DTO type (`MissionPayload`) for request bodies and the full entity (`Mission`) for responses — never send server-owned fields (`id`, timestamps) back on create/update.
- Prefer RxJS operators (`map`, `switchMap`, `catchError`) over nested subscribes. Import operators from `rxjs/operators` and creation functions (`of`) from `rxjs`.

## 3. Reactive Forms

- Use **Reactive Forms** (`ReactiveFormsModule` in the component `imports`), not template-driven forms. `MissionFormComponent` is the reference.
- Build forms with `inject(FormBuilder)` and **`fb.nonNullable.group({...})`** so controls are typed non-null and reset to their initial value, not `null`.
- Validators come from `@angular/forms` `Validators` (`required`, `maxLength(200)`, …). Mirror backend constraints on the client (e.g. name is required, max 200).
- **One shared component for create and edit:** detect mode from the route (`route.snapshot.paramMap.get('id')`), `patchValue` in edit mode, and branch `create()` vs `update()` on submit.
- Form state: guard submit with `if (this.form.invalid) { this.form.markAllAsTouched(); return; }`; drive error messages off `control.touched && control.hasError(...)`; track an in-flight flag (`submitting`) to disable the submit button. Read values with `getRawValue()` (includes disabled controls).

## 4. Routing

Feature routes are declared in `src/app/app.routes.ts`:

| Path | Component | Guard / data |
|------|-----------|--------------|
| `''` | `LandingComponent` | `landingGuard` (logged-in → role home) |
| `login` | `LoginComponent` | — |
| `register` | `RegisterComponent` | — |
| `missions` | `MissionListComponent` | `authGuard` (marketplace) |
| `missions/mine` | `MissionListComponent` | `authGuard`, `data: { mine: true }` (dashboard) |
| `missions/new` | `MissionFormComponent` | `authGuard`, `designerGuard` |
| `missions/:id/edit` | `MissionFormComponent` | `authGuard`, `designerGuard` |
| `missions/:id` | `MissionDetailComponent` | `authGuard` |
| `profile` | `ProfileComponent` | `authGuard` |
| `**` | → redirect to `''` | — |

- **Order matters:** literal/segment routes (`missions/new`, `missions/mine`, `missions/:id/edit`) must precede the parametric `missions/:id`, or `new`/`mine` is captured as an `:id`.
- **Guards** (`src/app/guards/auth.guard.ts`, functional `CanActivateFn`s): `authGuard` requires a valid token (else → `/login`); `designerGuard` additionally requires the `DESIGNER` role (pilots → `/missions`); `landingGuard` bounces already-logged-in users off `''` to their role home (DESIGNER → `/missions/mine`, PILOT → `/missions`). `MissionListComponent` switches between marketplace and dashboard based on `route.data.mine`.
- Navigate declaratively with `[routerLink]="['/missions', id]"` in templates; use `Router.navigate(...)` for post-action redirects (e.g. after save → detail, after delete → list).
- Read params reactively with `route.paramMap.pipe(switchMap(...))` when the same component instance may be reused for different ids; `route.snapshot` is fine for read-once cases like the form.
- As routes grow, split them into a `missions.routes.ts` and lazy-load with `loadChildren`.

## 5. Models & DTOs

- All shared TypeScript types live in `src/app/models/` (one file per domain entity, e.g. `mission.model.ts`).
- Keep the interface a faithful mirror of the backend entity; document serialization quirks in a comment (e.g. `Instant → ISO string`).
- Express enums as **string-literal union types** (`MissionStatus`) plus a companion `readonly` array (`MISSION_STATUSES`) as the single source of truth for dropdowns — never re-list the values in a template. `MissionStatus` is the 7-value lifecycle `DRAFT → PUBLISHED → BIDDING → AWARDED → IN_PROGRESS → COMPLETED`, plus `CANCELLED`. Companion consts carry the presentation and ordering: `MISSION_STATUS_LABELS`, `MISSION_STATUS_COLORS`, and `MISSION_LIFECYCLE` (the ordered path, excluding `CANCELLED`) — reuse these, don't hard-code labels/colors in templates.
- `Mission` carries flight-plan fields beyond the CRUD basics: `location`, `startTime` / `endTime`, `biddingDeadline` (a `yyyy-MM-dd` date string), `waypoints` (`LatLng[]`), and `geofence` (a `Geofence` union — `CIRCLE` with `center`/`radiusMeters`, or `POLYGON` with `points`). All optional; the map components produce/consume them.
- Derive request DTOs from the entity with `Omit<>` (`MissionPayload = Omit<Mission, 'id' | 'userId' | 'createdAt' | 'updatedAt'>`) so server-owned fields — including `userId`, set from the token server-side — can't leak into a create/update body.

## 6. Component patterns

- **Async pipe first:** prefer `observable$ | async` in the template over manual `subscribe()` where it's natural (list, detail). `MissionListComponent` and `MissionDetailComponent` follow this.
- Use the built-in control flow (`@if` / `@for` / `@switch`) — this project targets Angular 19; do not use the legacy `*ngIf` / `*ngFor` structural directives.
- **Standard subscriptions are fine for now.** Imperative `subscribe()` for delete/form load/submit is acceptable and intentional — keep things simple.
- Model view state as a single object (`{ status: 'loading' | 'loaded' | 'error', data }`) streamed through the async pipe — see `MissionDetailComponent`'s `vm$` built with `startWith` + `catchError` — rather than juggling several boolean flags in the template.

> **Deferred by decision — do NOT add yet:** `ChangeDetectionStrategy.OnPush`, `takeUntilDestroyed()` subscription cleanup, and a global HTTP error interceptor. The focus is getting Mission CRUD (list/create/edit/delete) working with simple, un-optimized code; these are a deliberate later refactor, not an oversight. Don't introduce them as you touch components unless explicitly asked.

## 7. Error handling

- HTTP errors surface through the Observable's error channel. Handle them close to the user: either `catchError` mapping to an error view-state (detail view) or the `error` callback of `subscribe` setting a message flag (form/list).
- Always give user feedback and log the raw error: show a friendly message (`saveError`, "Mission not found") and `console.error(err)` for diagnostics. Never swallow errors silently.
- A global HTTP error interceptor is **intentionally deferred** (see the note in Component patterns). For now, handle errors per call at the component boundary. A functional `HttpInterceptorFn` via `provideHttpClient(withInterceptors([...]))` is the eventual home for cross-cutting concerns — add it later when explicitly requested.
- Distinguish states in the UI: **loading** vs **empty** (`length === 0`) vs **error** are three different renders, not one — the list and detail views already separate them.
