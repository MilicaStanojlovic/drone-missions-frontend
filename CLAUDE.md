# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Angular 19 application (Angular CLI 19.2.19), standalone components (no `NgModule`). It has grown past the original Mission-CRUD milestone into a role-based marketplace app with an admin back office. Current feature set:

- **Auth** — JWT register / login / profile, with three roles (`DESIGNER` / `PILOT` / `ADMIN`) gating what you can do and see. Each role gets its own nav and its own home route.
- **Missions** — a marketplace (open missions for pilots, filterable by keyword / location / date, with the filters mirrored into the URL) and a designer dashboard (own missions + status tiles), plus a mission planner/editor with a **Leaflet** map (waypoints + circle/polygon geofence) and a role-aware detail view with a status timeline and read-only map. Waypoints carry an `altitude` and a `WaypointAction` collected through `waypoint-dialog`.
- **Bids** — a real backend feature: pilots place/update/withdraw a bid (amount + optional message) from the detail view and see their history on `/my-bids`; designers see incoming bids and Accept one (rejects the rest, awards the mission).
- **Lifecycle** — after award, a mission auto-advances `AWARDED → IN_PROGRESS` once its start date arrives (computed lazily on read). The winning pilot starts it and marks it finished (`→ COMPLETED`); the owning designer can cancel it any time before completion.
- **Ratings** — once a mission is `COMPLETED`, each participant may rate the other **once** (1–5 stars + optional ≤500-char comment) and the rating is final. Averages surface on the mission page, on feed cards next to the designer's name, and on profiles — own (`/profile`) and public (`/users/:id`, no email).
- **Admin** — a back office: platform overview stats, mission moderation (hide/unhide, plus a permanent remove), account suspend/reactivate, creating another admin, and an audit log of every state-changing action with role/action/search filters and paging.
- **Notifications** — a bell + dropdown in the nav (pilot only) shows in-app notifications for bid **accepted / rejected** and **mission overdue**; clicking one marks it read and opens the mission. Backed by `/api/v1/notifications` and polled every 45 s while a pilot is signed in. The backend also sends app-styled **emails** (new bid → designer; accepted/rejected/overdue → pilot).
- **Toasts** — a single-toast notification bus mounted at app root (client-side only, ~2.8 s).

File map (under `src/app/`):

- `models/` — `mission.model.ts` (`Mission`, `MissionStatus` + status consts, `MissionModeration`, `LatLng`, `Waypoint`, `WaypointAction` + label/icon consts, `Geofence`, `MissionPayload`), `bid.model.ts` (`Bid`, `BidStatus` + status consts, `BidPayload`), `user.model.ts` (`UserRole` + label/colour consts, `UserResponse`, `PublicUser`, `RegisterPayload`, `NewAdminPayload`, `LoginPayload`), `rating.model.ts` (`Rating`, `RatingSummary`, `UserRatings`, `RatingPayload`), `notification.model.ts` (`AppNotification`, `NotificationType`), `audit.model.ts` (`AuditLogEntry`, `AuditAction` + sentence/label consts, `AuditTargetType`), `stats.model.ts` (`PlatformStats`, `TopMission`), `page.model.ts` (`PagedModel<T>`).
- `services/` — `auth.service.ts`, `mission.service.ts`, `bid.service.ts`, `rating.service.ts`, `notification.service.ts`, `user.service.ts`, `audit-log.service.ts`, `platform-stats.service.ts`, `toast.service.ts`, `auth.interceptor.ts` (functional `HttpInterceptorFn`).
- `guards/auth.guard.ts` — exports `authGuard`, `designerGuard`, `pilotGuard`, `adminGuard`, `landingGuard` (functional `CanActivateFn`s).
- `components/` — `landing`, `login`, `register`, `profile`, `user-profile` (anyone else's public profile), `mission-list`, `mission-detail`, `mission-form`, `waypoint-dialog` (altitude + action modal), `my-bids` (pilot bid history), `notification-bell` (nav bell + dropdown), `mission-map` (Leaflet — interactive in the editor/detail, and a static `[interactive]="false"` thumbnail on list cards), `rating-form` / `rating-list` / `rating-note` / `rating-stars`, `admin-overview` / `admin-missions` / `admin-users` / `admin-register` / `admin-audit-log`, `confirm-dialog`, `toast`.
- `util/geo.ts` — framework-free geo helpers (haversine distance/duration, centroid, geofence build/clamp, in-zone tests); `DEFAULT_CENTER` / `DEFAULT_ZOOM`.

Note the two notification-ish systems are **not** the same thing: `NotificationService` is backend-backed, pilot-only and persistent; `ToastService` is a transient client-side confirmation bus. Don't route one through the other.

The Spring backend is expected at `http://localhost:8085`; the frontend fails gracefully (loading/error states) when it is down.

## Commands

```bash
npm start            # ng serve — dev server at http://localhost:4200 (development config, no optimization, source maps)
npm run build        # ng build — production build to dist/drone-missions-frontend
npm run watch        # ng build --watch, development configuration
npm test             # ng test — Karma + Jasmine, launches Chrome
npm run lint         # ng lint — ESLint 9 flat config (eslint.config.js) via angular-eslint; TS + templates
ng test --include='**/foo.component.spec.ts'   # run a single test file
ng generate component <name>                   # scaffold a component (also: service, directive, pipe, ...)
```

There is no e2e framework installed. Unit-test coverage is thin — four spec files (`app.component`, `audit-log.service`, `platform-stats.service`, `user.service`).

## Architecture

Standalone-component architecture (no `NgModule`). Key wiring:

- `src/main.ts` → `bootstrapApplication(AppComponent, appConfig)` is the entry point.
- `src/app/app.config.ts` → `appConfig` is where application-wide providers go. Currently `provideZoneChangeDetection({ eventCoalescing: true })`, `provideRouter(routes)`, and `provideHttpClient(withInterceptors([authInterceptor]))` — the auth interceptor is already wired here. Register further global HTTP interceptors in the same `withInterceptors([...])` array.
- `src/app/app.routes.ts` → the router configuration (`routes`), guard-protected (see the route table below). Define lazy/eager routes here.
- Components declare their dependencies via the standalone `imports` array in the `@Component` decorator, not through modules.

### Auth & security (how it actually works)

- **Token:** the JWT is read from the **`Authorization` response header** of `POST /auth/login` (strip the `Bearer ` prefix) and stored in `localStorage` under the key **`dm_token`**. `AuthService.logout()` clears it.
- **Outbound:** `authInterceptor` attaches `Authorization: Bearer <token>` to any request whose URL starts with `http://localhost:8085` when a token is present. On a **401** (except `/api/v1/auth/*` calls) it logs out and redirects to `/login`.
- **Client-side claims:** `AuthService` decodes the JWT *payload* (base64url) to read `sub` (userId), `role`, and `exp` — `isLoggedIn` / `isDesigner` / `isPilot` / `isAdmin` derive from it. This is **not** a signature check; it's convenience only, the backend still validates.
- **Profile:** cached in-memory via a `BehaviorSubject` (`profile$`); re-fetched from `GET /api/v1/users/me` once after a reload while logged in. Someone else's profile comes from `GET /api/v1/users/{id}` as a `PublicUser` — deliberately **no email**, so don't reach for `UserResponse` there.

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

# Feature guidance

Conventions for extending any feature in this app — they grew out of the Mission CRUD work and every feature since (bids, ratings, notifications, admin) follows them. Where current code already follows a pattern it is noted; where a pattern is recommended but not yet applied everywhere, that is called out so you don't assume it exists.

## 1. Backend integration

- All API access goes through `HttpClient`, provided once in `app.config.ts` via `provideHttpClient()`. Do **not** import `HttpClientModule` (deprecated, module-based).
- **Base URL:** the REST API is rooted at `http://localhost:8085/api/v1`. Mission endpoints live under `/missions` (`MissionService.baseUrl`). When adding a new resource, follow the same `${API}/<resource>` shape.
- The URL is a hard-coded `private readonly baseUrl` string in **every** service — the literal is now duplicated nine times over. Promoting the root (`http://localhost:8085/api/v1`) to `src/environments/environment.ts` (Angular's `ng generate environments`) is the obvious outstanding cleanup; there is no `src/environments/` folder yet.
- **CORS / proxy:** the backend must allow origin `http://localhost:4200`, or add a `proxy.conf.json` and run `ng serve --proxy-config` so `/api` is same-origin. There is no proxy config yet.
- Timestamps (`Instant`) cross the wire as ISO-8601 strings — keep them typed as `string` in models and convert at the edges (see the form's `datetime-local` helpers).
- **Bids API.** `BidService` talks to the real backend, rooted at `/api/v1/bids`: `POST /bids/mission/{missionId}` (place/update own bid), `GET /bids/mission/{missionId}` (owner sees all, a pilot only their own), `GET /bids/my`, `DELETE /bids/{bidId}` (withdraw pending), `POST /bids/{bidId}/accept` (award — rejects the rest, mission → `AWARDED`). One bid per pilot per mission; the first bid flips a `PUBLISHED` mission to `BIDDING`. Note the two shapes under `/bids`: a `{bidId}` segment always identifies a bid, while a mission is reached via the explicit `/mission/{missionId}` sub-path — so `/bids/5` is never ambiguous.
- **Lifecycle API.** `POST /missions/{id}/start` (winning pilot, `AWARDED → IN_PROGRESS`), `/complete` (winning pilot, `→ COMPLETED`) and `/cancel` (owning designer, any time before completion). `GET /missions/my-jobs` returns the pilot's awarded missions — note it is implemented on `MissionService` but **not currently called from any component**. The `AWARDED → IN_PROGRESS` step is also applied server-side on read once `startTime` has passed — there is no scheduler, so status is only ever advanced when a mission is fetched.
- **Ratings API.** `POST /ratings/mission/{missionId}` (rate the other side of a completed mission — write-once, no update endpoint), `GET /ratings/mission/{missionId}`, `GET /ratings/user/{userId}` (returns `UserRatings`: average, count and the individual ratings).
- **Notifications API.** `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`. Unlike the other services, `NotificationService` deliberately **breaks the cold-observable rule** — it owns a `BehaviorSubject`, subscribes internally and polls on a timer, because the bell is a long-lived ambient widget rather than a per-view fetch. Don't copy that shape for ordinary resources.
- **Admin APIs.** Missions: `GET /missions/all?page&q` (paged + searchable), `POST /missions/{id}/hide` / `/unhide` / `/remove` (remove is a permanent delete, not a state). Users: `GET /users?page&role`, `POST /users/{id}/suspend` / `/reactivate`, `POST /users/admins` (the backend forces the `ADMIN` role — `NewAdminPayload` carries no role field). Plus `GET /audit-log?page&role&action&q` and `GET /platform-stats`.
- **Paging.** Paginated endpoints return Spring Data's `PagedModel` envelope — typed as `PagedModel<T>` (`page.model.ts`). `page.number` is **0-based** on the wire while the admin screens show and route on a 1-based `?page` query param; convert at the component boundary.

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
| `my-bids` | `MyBidsComponent` | `authGuard`, `pilotGuard` |
| `admin/overview` | `AdminOverviewComponent` | `authGuard`, `adminGuard` |
| `admin/missions` | `AdminMissionsComponent` | `authGuard`, `adminGuard` |
| `admin/users` | `AdminUsersComponent` | `authGuard`, `adminGuard` |
| `admin/users/new` | `AdminRegisterComponent` | `authGuard`, `adminGuard` |
| `admin/audit-log` | `AdminAuditLogComponent` | `authGuard`, `adminGuard` |
| `profile` | `ProfileComponent` | `authGuard` |
| `users/:id` | `UserProfileComponent` | `authGuard` |
| `**` | → redirect to `''` | — |

- **Order matters:** literal/segment routes (`missions/new`, `missions/mine`, `missions/:id/edit`, `admin/users/new`) must precede their parametric siblings (`missions/:id`), or `new`/`mine` is captured as an `:id`.
- **Guards** (`src/app/guards/auth.guard.ts`, functional `CanActivateFn`s): `authGuard` requires a valid token (else → `/login`); `designerGuard` additionally requires the `DESIGNER` role (others → `/missions`); `pilotGuard` requires `PILOT` (others → `/missions/mine`); `adminGuard` requires `ADMIN` (designers → `/missions/mine`, pilots → `/missions`); `landingGuard` bounces already-logged-in users off `''` to their role home (ADMIN → `/admin/overview`, DESIGNER → `/missions/mine`, PILOT → `/missions`). `MissionListComponent` switches between marketplace and dashboard based on `route.data.mine`.
- **Query params carry view state**, so filtered lists stay deep-linkable and survive a reload: the feed uses `?keyword&location&date`, the admin lists `?page&q&role&action`, the mission detail `?from=my-bids` (plus the replayed feed filters) to aim the back button, `login` shows a banner on `?registered=1`, and `register` prefills the role from `?role=DESIGNER|PILOT`. Keep new filters in the URL rather than in component-only state.
- Navigate declaratively with `[routerLink]="['/missions', id]"` in templates; use `Router.navigate(...)` for post-action redirects (e.g. after save → detail, after delete → list).
- Read params reactively with `route.paramMap.pipe(switchMap(...))` when the same component instance may be reused for different ids; `route.snapshot` is fine for read-once cases like the form.
- As routes grow, split them into a `missions.routes.ts` and lazy-load with `loadChildren`.

## 5. Models & DTOs

- All shared TypeScript types live in `src/app/models/` (one file per domain entity, e.g. `mission.model.ts`).
- Keep the interface a faithful mirror of the backend entity; document serialization quirks in a comment (e.g. `Instant → ISO string`).
- Express enums as **string-literal union types** (`MissionStatus`) plus a companion `readonly` array (`MISSION_STATUSES`) as the single source of truth for dropdowns — never re-list the values in a template. `MissionStatus` is the 7-value lifecycle `DRAFT → PUBLISHED → BIDDING → AWARDED → IN_PROGRESS → COMPLETED`, plus `CANCELLED`. Companion consts carry the presentation and ordering: `MISSION_STATUS_LABELS`, `MISSION_STATUS_COLORS`, and `MISSION_LIFECYCLE` (the ordered path, excluding `CANCELLED`) — reuse these, don't hard-code labels/colors in templates.
- `Mission` carries flight-plan fields beyond the CRUD basics: `location`, `startTime` / `endTime`, `biddingDeadline` (a `yyyy-MM-dd` date string), `waypoints` (`Waypoint[]`), and `geofence` (a `Geofence` union — `CIRCLE` with `center`/`radiusMeters`, or `POLYGON` with `points`). All optional; the map components produce/consume them.
- `Waypoint extends LatLng` with `altitude` (metres, backend caps at 120), `action` (a `WaypointAction`) and `hoverDurationSeconds` (only meaningful for `HOVER`). The three are **optional on the type** so missions saved before the fields existed still typecheck — but `waypoint-dialog` requires them for every new or edited point. Presentation lives in `WAYPOINT_ACTION_LABELS` and `WAYPOINT_ACTION_ICONS` (inline SVG markup for the map marker badge); reuse them rather than re-listing actions.
- `MissionModeration` (`VISIBLE` / `HIDDEN`) is an **admin axis orthogonal to `MissionStatus`** — don't fold it into the lifecycle. Hiding is reversible; an admin *remove* is a permanent delete, not a state. `Mission` also carries admin-view flags (`designerSuspended`) and server-resolved display fields (`designerName`, `designerEmail`, `designerRating` / `designerRatingCount`, `awardedPilotId`).
- Other domains follow the same shape: `Rating` / `RatingSummary` / `UserRatings` / `RatingPayload`; `AppNotification` + `NotificationType`; `AuditLogEntry` + `AuditAction` (18 values) with `AUDIT_ACTION_SENTENCES` / `AUDIT_ACTION_LABELS` and `AuditTargetType`; `PlatformStats` + `TopMission`; `PagedModel<T>`. `UserRole` is a three-value union (`DESIGNER` / `PILOT` / `ADMIN`) with `USER_ROLE_LABELS` / `USER_ROLE_COLORS`.
- **Server-resolved names, not ids.** DTOs deliberately carry `missionName`, `pilotName`, `raterName`, `designerName`, `actorUsername` alongside the ids precisely so the UI can honour the ID-hiding rule. When you add a resource, ask the backend for the display name rather than resolving ids client-side.
- Derive request DTOs from the entity with `Omit<>` (`MissionPayload = Omit<Mission, 'id' | 'userId' | 'designerEmail' | 'designerName' | 'designerSuspended' | 'designerRating' | 'designerRatingCount' | 'moderation' | 'createdAt' | 'updatedAt'>`) so server-owned fields — including `userId`, set from the token server-side — can't leak into a create/update body.

## 6. Component patterns

- **Async pipe first:** prefer `observable$ | async` in the template over manual `subscribe()` where it's natural (list, detail). `MissionListComponent` and `MissionDetailComponent` follow this.
- Use the built-in control flow (`@if` / `@for` / `@switch`) — this project targets Angular 19; do not use the legacy `*ngIf` / `*ngFor` structural directives.
- **Standard subscriptions are fine for now.** Imperative `subscribe()` for delete/form load/submit is acceptable and intentional — keep things simple.
- Model view state as a single object (`{ status: 'loading' | 'loaded' | 'error', data }`) streamed through the async pipe — see `MissionDetailComponent`'s `vm$` built with `startWith` + `catchError` — rather than juggling several boolean flags in the template.

> **Deferred by decision — do NOT add yet:** `ChangeDetectionStrategy.OnPush`, `takeUntilDestroyed()` subscription cleanup, and a global HTTP error interceptor. Their absence is a standing deliberate choice in favour of simple, un-optimized code, not an oversight — they remain a later refactor to be taken on all at once. Don't introduce them as you touch components unless explicitly asked.

## 7. Error handling

- HTTP errors surface through the Observable's error channel. Handle them close to the user: either `catchError` mapping to an error view-state (detail view) or the `error` callback of `subscribe` setting a message flag (form/list).
- Always give user feedback and log the raw error: show a friendly message (`saveError`, "Mission not found") and `console.error(err)` for diagnostics. Never swallow errors silently.
- A global HTTP error interceptor is **intentionally deferred** (see the note in Component patterns). For now, handle errors per call at the component boundary. A functional `HttpInterceptorFn` via `provideHttpClient(withInterceptors([...]))` is the eventual home for cross-cutting concerns — add it later when explicitly requested.
- Distinguish states in the UI: **loading** vs **empty** (`length === 0`) vs **error** are three different renders, not one — the list and detail views already separate them.
