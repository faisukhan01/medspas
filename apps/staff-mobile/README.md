# Auralis Staff ✦

Premium React Native (Expo) companion app for **Auralis Aesthetics Group** providers
and front desk: run the day from your pocket — check the schedule, confirm and
check in appointments, look up patients, book follow-ups and switch branches.

> Fictional demo data. Not a real medspa. ✦

## Stack

- **Expo SDK ~52** + **Expo Router ~4** (file-based routing, typed screens)
- **NativeWind ^4** (Tailwind 3.4 classes on RN) — emerald-700 / stone palette, white rounded cards
- **TypeScript (strict)**, lucide-react-native icons, expo-linear-gradient hero cards
- **AsyncStorage**-persisted session (user + active branch survive app restarts)

## Getting started

```bash
cd apps/staff-mobile
npm install           # or bun install / pnpm install

# Point the app at the Auralis web backend (Next.js at repo root).
# Default is http://localhost:3000 if the env var is unset.
# Android emulators must use the host alias instead of localhost:
export EXPO_PUBLIC_API_URL=http://10.0.2.2:3000   # Android emulator
# export EXPO_PUBLIC_API_URL=http://localhost:3000 # iOS simulator / web

npx expo start        # then press i / a / w
```

Or copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` there.

The backend must be running with the seeded demo database:

```bash
# repo root
npx prisma db push && npx tsx prisma/seed.ts   # once
npm run dev
```

## Demo credentials (email + password)

All demo accounts use the password **`demo1234`** — the login screen has
quick-fill chips for each:

| Staff member   | Email                      | Role                  |
| -------------- | -------------------------- | --------------------- |
| Amara Okafor   | `owner@auralis.demo`       | Owner — full access   |
| Sophie Turner  | `admin@auralis.demo`       | Administrator         |
| Ella Brooks    | `reception@auralis.demo`   | Front desk            |
| Dr. Priya Nair | `priya@auralis.demo`       | Provider (NP)         |
| Noah Bennett   | `marketing@auralis.demo`   | Growth marketing      |

Providers land on a **Mine / All branch** toggle for the day sheet; everyone
else sees the whole branch by default.

## Screens & features

1. **Login** — branded ✦ Auralis Staff sign-in (email + password, show/hide
   password, demo chips, friendly error states).
2. **Today (My day)** — 7-day date strip with per-day load dots, Mine/All-branch
   scope, stats row (booked · completed · revenue), pull-to-refresh, and the
   full appointment flow with **optimistic updates**:
   `Confirm → Check in → Start treatment → Complete visit`, plus **Cancel with
   reason** (bottom sheet). Failed PATCHes revert the optimistic flip.
3. **Patients** — debounced search (name / email / phone / tag), paginated
   infinite list, avatar initials with brand color, tag chips, visit counts.
4. **Patient profile** — contact card (tap-to-call / mail), allergy flag,
   lifetime spend + appointment/no-show stats, active membership, upcoming
   appointments, recent visits, latest invoices — and **Book follow-up**:
   treatment → day (14 days) → hourly slot grid → confirm. Slot conflicts (409)
   surface the server's message inline.
5. **Profile** — gradient identity card (role, title, rating, specialties),
   **branch switcher** (drives `branchId` on every query, persisted), today's
   branch stats, sign-out, "Auralis OS v1.0" footer.
6. **Week overview** — simple 7-day grid of appointment counts, completions and
   revenue with volume bars (Today highlighted).

## API surface used

| Endpoint                          | Purpose                                        |
| --------------------------------- | ---------------------------------------------- |
| `POST /api/auth/login`            | email + password → session cookie + user       |
| `GET /api/auth/me`                | current session user                           |
| `GET /api/bootstrap`              | tenant, branches, services, categories (cached)|
| `GET /api/branches`               | branches + rooms + 30-day performance          |
| `GET /api/appointments?from=&to=&branchId=&providerId=` | day / week lists      |
| `POST /api/appointments`          | create booking (`source: "STAFF_APP"`, 409 on conflict) |
| `PATCH /api/appointments/[id]`    | status moves, cancel reason, notes, deposits   |
| `GET /api/patients?q=&page=&pageSize=` | searchable, paginated directory          |
| `GET /api/patients/[id]`          | 360° EMR payload (appointments, invoices, stats)|

## Project layout

```
app/
  _layout.tsx          root stack + auth gate (session → tabs, else /login)
  index.tsx            entry redirect
  login.tsx            branded sign-in
  schedule.tsx         week overview
  patient/[id].tsx     patient 360° + follow-up booking
  (tabs)/
    _layout.tsx        Today · Patients · Profile
    today.tsx          my day + appointment flow
    patients.tsx       patient directory
    profile.tsx        account + branch switcher
src/
  lib/api.ts           typed fetch client (credentials: include)
  lib/types.ts         API payload contracts
  lib/format.ts        money / date / initials / day helpers
  lib/constants.ts     status colors, lifecycle actions, roles, demo accounts
  store/session.tsx    persisted session context (AsyncStorage)
  components/          Avatar, StatusPill, StatCard, DateStrip, AppointmentCard,
                       SectionCard, EmptyState, LoadingView, ErrorView
```

## Screenshots

> _Placeholder — drop captures here before distributing._
>
> - `docs/screenshots/login.png`
> - `docs/screenshots/today.png`
> - `docs/screenshots/patient-detail.png`
> - `docs/screenshots/profile.png`

## Notes

- Appointment prices are **already stored in branch currency** (the backend
  converts USD→GBP at booking), so the app displays them as-is; service menu
  prices from `/api/bootstrap` are USD and are converted for display at the
  backend's 0.79 GBP rate.
- The web backend sets an httpOnly session cookie (`auralis_session`, 7 days);
  React Native's fetch cookie store replays it via `credentials: "include"`.
- Sessions persist locally in AsyncStorage — sign out from **Profile** to clear.
- Cancels use `PATCH` with a `cancellationReason` so the audit log keeps the
  staff-entered reason.
