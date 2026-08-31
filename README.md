# DroneMissions — Frontend

An **Angular 19** single-page app for a drone-mission marketplace. *Mission designers* plan flight
missions on a map and publish them; *pilots* browse open work, bid on it, fly it and get rated; a
*platform admin* moderates missions and accounts.

### 🔗 [Live demo — drone-missions-v2.vercel.app](https://drone-missions-v2.vercel.app/)

![Mission detail](docs/assets/mission.png)

---

## What's inside

| | |
|---|---|
| **Auth** | Register / sign in with JWT, three roles — Designer, Pilot, Admin — each with its own navigation and home screen |
| **Mission planner** | Leaflet map editor: click to add waypoints, set altitude + drone action per point, draw a circle or polygon flight zone, live path length and flight-time estimate |
| **Marketplace** | Open-mission feed for pilots with keyword / location / date filters, and a dashboard of their own missions for designers |
| **Bidding** | One bid per pilot per mission — place, update or withdraw; the designer accepts one and the mission is awarded |
| **Lifecycle** | `DRAFT → PUBLISHED → BIDDING → AWARDED → IN_PROGRESS → COMPLETED`, plus cancellation |
| **Ratings** | After completion each side rates the other once, 1–5 stars; averages show on profiles and feed cards |
| **Notifications** | In-app bell for pilots — bid accepted, bid rejected, mission overdue |
| **Admin panel** | Platform stats, mission moderation, account suspension, and a full audit log |

**Built with:** Angular 19 (standalone components) · TypeScript 5.7 strict · RxJS · Leaflet +
OpenStreetMap · Reactive Forms · Karma/Jasmine · ESLint 9

---

## Getting started

The backend must be running on `http://localhost:8085` and allow CORS from `http://localhost:4200`.

```bash
npm install
npm start          # → http://localhost:4200
```

| Command | What it does |
|---|---|
| `npm start` | Dev server on port 4200 |
| `npm run build` | Production build into `dist/drone-missions-frontend` |
| `npm test` | Karma + Jasmine |
| `npm run lint` | ESLint — TypeScript and templates |

---

## Screens

### Sign in and register

Sign in with email and password, or create an account and pick your side of the marketplace —
Designer or Pilot.

| | |
|---|---|
| ![Sign in](docs/assets/login.png) | ![Register](docs/assets/register.png) |

### Mission planner

Draw the flight path on the map — click to add waypoints, drag to move, right-click to remove. Each
waypoint gets an altitude and an action (photo, start/stop recording, hover). A circle or polygon
flight zone keeps the plan contained, and the footer tracks waypoint count, path length and
estimated flight time as you go.

![New mission](docs/assets/new-mission.png)

### Designer dashboard

A designer's own missions with status tiles, each card showing a map thumbnail of the flight plan,
the flight window and the path length.

![My Missions](docs/assets/my-missions.png)

### Mission detail and bids

The mission page adapts to who is looking. The owning designer sees the status timeline, the flight
plan and every incoming bid, with an Accept button on each.

![Mission detail](docs/assets/mission.png)

A pilot sees the bidding panel instead — place a bid with an optional message, update it, or
withdraw it while it is still pending.

![Placing a bid](docs/assets/mission-bid.png)

### My Bids

A pilot's full bid history with status chips and a Withdraw action on pending bids.

![My Bids](docs/assets/my-bids.png)

### Profile and ratings

Username, role and member-since, plus the reputation earned from completed missions.

![My Profile](docs/assets/my-profile.png)

### Admin panel

Platform-wide stats — missions by status, bids per mission, and the user base by role — alongside
mission moderation, account suspension and an audit log.

![Platform Overview](docs/assets/admin-overview.png)

---

## Project structure

```
src/app/
├── app.config.ts       # providers: router, HttpClient + auth interceptor
├── app.routes.ts       # route table with role guards
├── components/         # landing, auth, missions, bids, ratings, admin, shared UI
├── services/           # auth, mission, bid, rating, notification, user, audit, stats, toast
├── guards/             # authGuard, designerGuard, pilotGuard, adminGuard, landingGuard
├── models/             # mission, bid, rating, notification, user, audit, stats, page
└── util/geo.ts         # distance, path length, geofence helpers
```
