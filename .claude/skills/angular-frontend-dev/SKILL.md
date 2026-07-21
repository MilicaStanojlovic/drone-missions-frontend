---
name: angular-frontend-dev
description: Build, run, and test the drone-missions Angular 19 frontend following this repo's conventions. Use when starting the dev server, building, running tests (single or full), or adding standalone components, services, models, routes, or reactive forms.
---

# Angular Frontend Dev Workflow

Conventions and commands for the drone-missions Angular 19 frontend (standalone components, no `NgModule`; Reactive Forms; Leaflet maps; talks to the Spring backend at `http://localhost:8085`). Full conventions live in `CLAUDE.md` — this skill is the quick action reference; read `CLAUDE.md` for the detailed patterns.

## Commands

Run from the frontend project root. Uses npm scripts / the Angular CLI (`ng`).

```bash
npm start          # ng serve — dev server at http://localhost:4200 (development config)
npm run build      # ng build — production build to dist/drone-missions-frontend
npm run watch      # ng build --watch, development configuration
npm test           # ng test — Karma + Jasmine, launches Chrome
ng test --include='**/foo.component.spec.ts'   # run a single spec file
ng generate component components/<name>        # scaffold a standalone component (also: service, guard, ...)
```

There is no lint target and no e2e framework configured.

## Backend prerequisite

The app calls the Spring backend at `http://localhost:8085/api/v1`. Start the backend (see the backend repo's `spring-boot-dev` skill) before exercising anything that loads data. The UI degrades gracefully (loading / error / empty states) when the backend is down, but writes will fail. The backend must allow CORS origin `http://localhost:4200` (or add a `proxy.conf.json` and serve with `--proxy-config`).

## Architecture (standalone, no NgModule)

- Entry point: `src/main.ts` → `bootstrapApplication(AppComponent, appConfig)`.
- App-wide providers: `src/app/app.config.ts` (`provideRouter`, `provideHttpClient(withInterceptors([...]))`, etc.) — register global interceptors here.
- Routes: `src/app/app.routes.ts`. **Literal routes before parametric ones** (`missions/new` before `missions/:id`).
- Components declare deps in the `@Component` `imports` array — there are no modules.
- Auth is JWT: `services/auth.service.ts`, `services/auth.interceptor.ts` (attaches the bearer token), `guards/auth.guard.ts`. The login response carries the token in the `Authorization` header.

## Conventions (match existing code)

- **TypeScript strict mode** is on with extra strictness (`noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`) and Angular `strictTemplates`. Use bracket access for index-signature props.
- **Control flow:** use built-in `@if` / `@for` / `@switch` — not legacy `*ngIf` / `*ngFor`.
- **Services:** `@Injectable({ providedIn: 'root' })`, dependencies via `inject()` (not constructor params). Each method returns a cold `Observable<T>` and does nothing else — no `.subscribe()`, no state caching in the service. Type every call (`get<Mission[]>`, `post<Mission>`).
- **Reactive Forms only** (`ReactiveFormsModule`): build with `inject(FormBuilder)` + `fb.nonNullable.group({...})`; mirror backend validators; one shared component handles create + edit (mode from the route param). See `components/mission-form`.
- **Models:** one file per entity in `src/app/models/`. Enums as string-literal unions plus a companion `readonly` array as the single source for dropdowns. Derive request DTOs with `Omit<>` so server-owned fields (`id`, timestamps) can't leak.
- **Prefer the async pipe** (`obs$ | async`) for list/detail views; model view state as one `{ status, data }` object streamed through it rather than juggling booleans.
- Component selector prefix is `app`. Static assets go in `public/`.

## Deferred by decision — do NOT add unless asked

`ChangeDetectionStrategy.OnPush`, `takeUntilDestroyed()` cleanup, and a global HTTP **error** interceptor are intentionally deferred. Handle errors per call at the component boundary (`catchError` → error view-state, or the `subscribe` error callback) and always give user feedback + `console.error(err)`.

## After changes

Confirm it compiles / type-checks with `npm run build` (strict templates catch a lot), and run the relevant `ng test --include=...` spec. Start `npm start` to verify behavior in the running app when the change has a runtime surface.
