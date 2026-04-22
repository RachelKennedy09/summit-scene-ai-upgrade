# SummitScene – The Story & Purpose Behind the App

## The Mission

Small mountain towns like Banff, Canmore, and Lake Louise are vibrant, creative, and full of life — but their event discovery is scattered everywhere.

Locals hear about events from:

- Instagram Stories that disappear after 24 hours

- Posters taped to coffee shop windows

- Word-of-mouth that never reaches the right people

- Crowded Discords and Facebook groups

- Random tourism websites that aren’t geared to locals at all

SummitScene was built to solve this.

## What SummitScene Really Is

SummitScene isn’t “just an events app.”
It’s designed to be the digital heartbeat of small mountain communities — a single place where:

- locals

- seasonal workers

- artists

- musicians

- small businesses

- guides

- and mountain-loving travelers

can connect, share, and discover what’s happening in their backyard.

It's an app created for the mountains, by someone who lives in them.

## The Why

Because connection is what keeps small towns alive.

Because creativity deserves a platform.

Because a community scattered across 10 apps, posters, and inboxes deserves better.

Because locals should know what’s happening before the tourists do.

Because business owners shouldn’t have to rely on the algorithm to reach the people who live right down the street.

_And because I believe every mountain community deserves a modern, beautiful, inclusive digital space that celebrates local life._

SummitScene also supports a bigger goal:

**Helping mountain towns balance tourism + local needs.**

When events are easy to find:

- tourists spread out instead of crowding the same spaces

- businesses get fair exposure

- small venues get discovered

- people find activities that truly fit their vibe

- locals reclaim ownership of their community’s culture

Everyone wins.

## What It Will Become

SummitScene is already a fully functioning full-stack application, but the long-term vision is even bigger:

- A hyperlocal events + community hub

- A map-first discovery experience

- Easy posting tools for small businesses

- Community boards for rideshares, event buddies, and conditions

- Push notifications for real-time updates

- A future blog + storytelling space for local creators

- SEO-driven content so events reach people beyond social media

SummitScene aims to become the place where:

“What’s happening tonight?” → becomes one tap away.

“Who’s around?” → becomes easy to answer.

“How do I share this?” → becomes frictionless.

---


# SummitScene — Mobile Events, Community, & Map App

A full-stack React Native mobile application for Banff, Canmore, and Lake Louise.

SummitScene is a location-aware events and community app designed for mountain towns.
It features an event hub, live map, community posts, user profiles, and role-based permissions for local vs business users.

This project includes:

- React Native + Expo mobile client
- Node.js + Express REST API
- MongoDB Atlas database
- JWT authentication
- Business-only event posting
- Full community system (posts, replies, likes)
- Theming, avatars, and clean UI

## Running the Project Locally

You can run both the backend and mobile client locally if desired.

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd SummitSceneMobileApp
```

### 2. Set up the Backend (Node + Express)

```bash
cd server
npm install
```

Create a `.env` file inside `server/` (see .env.example):

```env
MONGODB_URI=your_mongo_uri
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

Start the server:

```bash
npm start
```

You should see:

Connected to MongoDB: summitScene (cluster: xyz.mongodb.net)
SummitScene API listening on port 4000

### 3. Run the Mobile App (Expo)

Open a second terminal:

```bash
cd ..
npm install
expo start
```

Scan the QR code with your phone or run on an emulator.

For physical phone testing with Expo Go, tunnel mode is often the most reliable option:

```bash
npm run start:tunnel
```

Use this if Expo Go says it cannot connect to the server after scanning the QR code.

If Metro has stale state or Expo keeps reconnecting to the wrong dev server, clear it first:

```bash
npm run start:clear
```

Tunnel mode is especially useful when local network discovery, router settings, or Windows firewall rules interfere with a normal Expo connection.

If you prefer the default Expo startup flow, you can still run:

```bash
expo start
```

By default the app uses:

```javascript
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
```

To use your local backend, run Expo with:

```bash
EXPO_PUBLIC_API_BASE_URL="http://YOUR_LOCAL_IP:4000" expo start
```

### 4. Production Deployment

SummitScene is fully deployed:

- **Backend (Render):** https://summit-scene-backend.onrender.com
- **Mobile App (Expo):** [Add Expo link here]

## Architecture

### High-Level Architecture Diagram

               ┌────────────────────────────┐
               │    React Native App       │
               │        (Expo)             │
               │  - Hub / Map / Post       │
               │  - Community / Account    │
               └────────────┬──────────────┘
                            │
                            │  HTTPS (fetch, JSON)
                            ▼
               ┌────────────────────────────┐
               │   Node.js + Express API    │
               │        (Render)            │
               │  Routes:                   │
               │   - /api/auth              │
               │   - /api/events            │
               │   - /api/community         │
               │                            │
               │  Middleware:               │
               │   - authMiddleware         │
               │   - isBusiness             │
               └────────────┬──────────────┘
                            │
                            │  Mongoose (ODM)
                            ▼
               ┌────────────────────────────┐
               │      MongoDB Atlas         │
               │  Collections:              │
               │   - users                  │
               │   - events                 │
               │   - communityposts         │
               └────────────────────────────┘

### Folder Structure

```
SummitSceneMobileApp/
├── App.js
├── app.json
├── package.json
├── assets/
│ ├── avatars/
│ │ └── avatarConfig.js
│ ├── logo.png
│ ├── splash.png
│ └── icon.png
├── screens/
│ ├── auth/
│ ├── hub/
│ ├── map/
│ ├── events/
│ ├── community/
│ └── account/
├── components/
│ ├── account/
│ ├── cards/
│ ├── events/
│ ├── hub/
│ ├── map/
│ ├── common/
│ └── register/
├── navigation/
│ ├── RootNavigator.js
│ └── TabNavigator.js
├── context/
│ ├── AuthContext.js
│ └── ThemeContext.js
├── services/
│ ├── eventsApi.js
│ ├── communityApi.js
│ └── authApi.js
├── theme/
│ ├── colors.js
│ └── themes.js
└── server/
├── index.js
├── package.json
├── routes/
├── controllers/
├── models/
├── middleware/
├── config/
└── test/
```

### User Roles & App Features

**Local users**

- Browse events (Hub + Map)

- View event details

- View business profiles (event hosts)

- Create & manage community posts (Highway Conditions, Ride Share, Event Buddy)

- Reply to posts

- Like/unlike community posts

- Edit profile & switch theme

**Business users**

- Create events

- Edit events they own

- Delete events they own
- Manage their event listings under My Events
- Role-based permissions are enforced in both UI and backend.

## Demo Accounts (for grading)

The deployed SummitScene app is backed by a MongoDB Atlas database.  
To make it easy to explore without creating new users, the following demo accounts are pre-created in the production database:

### Business Demo Account

- **Email:** `rockies.coffee.banff@test.com`
- **Password:** `Password123!`
- **Role:** Business
- **Town:** Banff

**What you can test with this account:**

- Create, edit, and delete events from the **Post** tab.
- View your events in the **Account → View My Events** screen (split into Upcoming / Past).
- Confirm that business-created events appear in:
  - The **Hub** feed
  - The **Map** tab as pins
  - The **My Events** management screen

### Local Demo Account

- **Email:** `rachel.local@test.com`
- **Password:** `Password123!`
- **Role:** Local
- **Town:** Lake Louise

**What you can test with this account:**

- Create new posts on the **Community** tab for:
  - Highway conditions
  - Ride share
  - Event buddy
- See how local accounts differ from business accounts (no My Events / event posting).

> The Hub and Community tabs are public once the app is running, so you can also browse events and posts without logging in. Logging in as the demo users unlocks account-specific features like “My Events” and posting to the community boards.

## Tech Stack

### 1. Mobile Client (React Native + Expo)

- Built with React Native & Expo
- React Navigation for screen navigation
- AsyncStorage for token persistence
- Context API for state management (Auth, Theme)

### 2. Backend (Node.js + Express)

#### API Route Structure

| Route Group      | Description                         |
| ---------------- | ----------------------------------- |
| `/api/auth`      | Register, login, get current user   |
| `/api/events`    | Event CRUD + My Events              |
| `/api/community` | Posts, replies, likes               |
| `/api/users`     | Update profile, upgrade to business |

#### Authentication

- JWT-based
- `authMiddleware` validates token & attaches `req.user`
- `isBusiness` restricts event creation/editing

#### Controllers

Handled through structured controller files:

- `eventController.js`
- `communityController.js`

#### Models (Mongoose)

- `User`
- `Event`
- `CommunityPost`

### 3. Database (MongoDB + Mongoose)

Hosted in MongoDB Atlas.

**Main Collections:**

- `User` – stores user accounts (name, email, password hash, role "local" or "business", town, avatar, etc.)
- `Event` – stores local events (title, category, town, date, time, description, createdBy)
- `CommunityPost` – stores community posts and replies (type, town, body, user, likes, replies)

**Relationships:**

- Community posts use `populate("user", "name email role town")` so the frontend can show who posted
- Events reference the User that created them (business accounts)

**Data Flow Example: Creating an Event**

1. A logged-in business user fills out the “Post Event” form in the mobile app.
2. The client calls `createEvent` in `eventsApi.js`, which sends a `POST /api/events` request with the JWT in the `Authorization` header.
3. `authMiddleware` verifies the token and attaches the `userId` and `role` to `req.user`.
4. `isBusiness` checks that `req.user.role` is `"business"` and only then allows the request to continue.
5. The events controller validates the payload, saves an `Event` document in MongoDB, and returns the new event.
6. The frontend updates the UI so the user sees their event in the Hub and Map screens.

**Data Flow Example 2: Local User Browsing and Posting in Community**

1. A logged-in local user opens the **Community** tab and selects a post type (e.g., “Highway Conditions”) and town.
2. The mobile app calls `GET /api/community?type=highwayconditions&town=Banff`.
3. The community controller builds a MongoDB query based on `type` and `town`, fetches matching `CommunityPost` documents, and uses `populate("user", "name town")` so each post shows who wrote it.
4. The mobile app renders a list of posts, each showing the author’s name, town, type, timestamp, and content.
5. If the user creates a new post, the app sends `POST /api/community` with the body, type, and town plus the user’s JWT.
6. `authMiddleware` checks the token, attaches the `userId`, and the controller saves a new `CommunityPost` linked to that user.

## Testing

Backend tests use Mocha, Chai, and Supertest.

#### Covered Areas

- Authentication (register/login)
- Event retrieval
- Business-only protections
- Community post creation + validation

**Run Tests:**

```bash
cd server
npm test
```

### Deployment

**Backend (Render):**

- Environment variables configured in Render dashboard (no secrets committed to GitHub).
- Exposes a public base URL used by the mobile client.
- **Mobile App**: Published via **Expo**
  - Expo project link is included in this README.
  - The app is configured to talk to the deployed Render API rather than a local IP.
- This setup allows the instructor to:
  - Install Expo Go, open the app link, and use SummitScene against the live backend.

**Live API Base URL:**

```
https://summit-scene-backend.onrender.com
```

#### Configuration Details

- **Hosting Provider:** Render (Node Web Service)
- **Root Directory:** `server/` (monorepo structure)
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables:**
  - `MONGODB_URI` – MongoDB Atlas connection string
  - `JWT_SECRET` – Secret used to sign JWT authentication tokens
  - `NODE_ENV=production`
- **Automatic deployments** are triggered on every push to the GitHub `main` branch

The backend connects directly to **MongoDB Atlas**, allowing real-time data storage across events, users, and community posts.

---

### Mobile App Deployment (Expo)

The mobile client is built with **React Native (Expo)** and communicates with the Render backend through an environment variable:

```javascript
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
```

## Developer Logs

This project includes two detailed development logs documenting the full evolution of SummitScene from foundation → features → polish.

### Phase 1 — Building the App

**Sprints 1–13: Architecture, Features, UI, Backend, and Full Integration**

[View DevLog Part 1 (Building The App)](./devlogs/DEVLOG-Part1-BuildingTheApp.md)

### Phase 2 — Upgrades & Polishing

**Sprints 9–15 & Final UI/UX/Theming Improvements**

[View DevLog Part 2 (Upgrades & Polishing)](./devlogs/DEVLOG-Part2-UpgradesAndPolishing.md)

**Each DevLog includes:**

- Detailed sprint goals
- Challenges and solutions
- Backend + frontend changes
- Photos, screenshots, and commits
- Technical learnings

## Final Notes

SummitScene is a full-stack, production-ready mobile app demonstrating:

- Real authentication

- Role-based permissions

- CRUD features

- Interactive map

- Community system

- Theming & custom avatars

- Professional backend architecture

- Clean code, clean logs, and exhaustive documentation
