# Auralis — Patient App ✦

Premium React Native (Expo) companion app for **Auralis Aesthetics Group** customers:
discover treatments, book appointments, manage visits, track memberships and chat
with **Aura**, the AI front desk.

> Fictional demo data. Not a real medspa. ✦

## Stack

- **Expo SDK ~52** + **Expo Router ~4** (file-based routing, typed screens)
- **NativeWind ^4** (Tailwind 3.4 classes on RN) — emerald-700 / amber-gold / stone palette
- **TypeScript (strict)**, lucide-react-native icons, expo-linear-gradient headers

## Getting started

```bash
cd apps/patient-mobile
npm install            # or bun install / pnpm install

# Point the app at the Auralis web backend (Next.js at repo root).
# Default is http://localhost:3000 if the env var is unset.
# Android emulators must use the host alias instead of localhost:
export EXPO_PUBLIC_API_URL=http://10.0.2.2:3000   # Android emulator
# export EXPO_PUBLIC_API_URL=http://localhost:3000 # iOS simulator / web

npx expo start         # then press i / a / w
```

The backend must be running with the seeded demo database:

```bash
# repo root
npx prisma db push && npx tsx prisma/seed.ts   # once
npm run dev
```

## Demo sign-in (email only — no password)

The patient app uses demo-grade auth (`POST /api/auth/patient`): type an email,
get the profile. Try these seeded patients:

| Patient        | Email                         | Home branch            | Notes                |
| -------------- | ----------------------------- | ---------------------- | -------------------- |
| Ava Thompson   | `ava.thompson@example.com`    | Beverly Hills (US, $)  | VIP + Member tags    |
| Poppy Hughes   | `poppy.hughes@example.com`    | London Mayfair (UK, £) | VIP + Member, UK £   |
| Mia Rodriguez  | `mia.rodriguez@example.com`   | Beverly Hills (US, $)  | Member, package owner |

Or tap **Browse as guest** on the welcome screen — you can browse services and
branches, but booking asks you to sign in.

## Demo flow

1. **Welcome** → gradient hero → *Get started* → email sign-in (hint chips) or guest mode.
2. **Home** — greeting, next-appointment hero card, category chips, popular services, branch cards.
3. **Service detail** — tap any treatment → deposit note, free-consult badge, provider chips → *Book now*.
4. **Book** — 5-step wizard: branch → service → provider (or "Any") → date+time (14 days, hourly 9:00–17:00) → review & confirm. A 409 ("slot just taken") suggests the next hour automatically.
5. **Visits** — upcoming (cancel with confirm, optimistic UI) + history with status pills.
6. **Perks** — membership card, package progress bars, invoices, "Total invested in you ✦".
7. **AI Chat** — Aura concierge (`POST /api/ai/chat`) with quick chips.

## API surface used

| Endpoint                        | Purpose                                    |
| ------------------------------- | ------------------------------------------ |
| `GET /api/bootstrap`            | tenant, branches, services, categories, plans |
| `GET /api/appointments?patientId=&from=&to=` | my appointments               |
| `POST /api/appointments`        | create booking (`source: "ONLINE"`)        |
| `PATCH /api/appointments/[id]`  | cancel (`status: CANCELLED`)               |
| `GET /api/staff`                | providers (filtered client-side)           |
| `POST /api/auth/patient`        | demo login (new route in the web repo)     |
| `GET /api/auth/patient?id=`     | lightweight profile + memberships          |
| `POST /api/ai/chat`             | Aura concierge replies                     |

## Notes

- Prices are stored in USD; **£ branches show GBP at the backend's 0.79 rate** so the app always matches what the server charges.
- Sessions are **in-memory** (logout on app restart) — swap the session store for SecureStore/AsyncStorage + real OTP auth before production.
- Time slots are naive local-time ISO strings, matching the staff app behaviour.
