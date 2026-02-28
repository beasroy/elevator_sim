# Elevator Simulator — Frontend

A React + TypeScript single-page application that visualises the elevator simulation in real time. It polls the backend REST API and renders an animated building view, live metrics, a passenger request list, and simulation controls.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Installation](#installation)
5. [Running the App](#running-the-app)
6. [Available Scripts](#available-scripts)
7. [Backend Connection](#backend-connection)
8. [Key Components](#key-components)

---

## Prerequisites

| Requirement                    | Minimum Version   | Notes                                                                                             |
| ------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------- |
| [Node.js](https://nodejs.org/) | **18.x** or later | LTS recommended                                                                                   |
| [npm](https://www.npmjs.com/)  | **9.x** or later  | Bundled with Node.js                                                                              |
| **Backend server**             | —                 | Must be running before starting the frontend — see [`../backend/README.md`](../backend/README.md) |

> Confirm your versions before proceeding:
>
> ```bash
> node -v
> npm -v
> ```

---

## Tech Stack

| Layer      | Technology                   | Purpose                                              |
| ---------- | ---------------------------- | ---------------------------------------------------- |
| UI library | React 19                     | Component-based rendering                            |
| Language   | TypeScript 5 (strict)        | Type-safe components, hooks, and API types           |
| Build tool | Vite 7                       | Lightning-fast HMR dev server and production bundler |
| Styling    | Tailwind CSS 4               | Utility-first CSS (via `@tailwindcss/vite` plugin)   |
| Linting    | ESLint 9 + typescript-eslint | Code quality and type-aware lint rules               |

---

## Directory Structure

```
frontend/
├── public/                         # Static assets served as-is
├── src/
│   ├── main.tsx                    # React app entry point (mounts <App />)
│   ├── App.tsx                     # Root component — layout and state wiring
│   ├── index.css                   # Global styles / Tailwind directives
│   ├── api/
│   │   └── client.ts               # Fetch wrappers for all backend API calls
│   ├── components/
│   │   ├── Building.tsx            # Animated building + shaft canvas
│   │   ├── ElevatorCar.tsx         # Individual elevator car visual
│   │   ├── FloorPanel.tsx          # Per-floor call indicator
│   │   ├── ControlsPanel.tsx       # Start / Stop / Reset / Configure UI
│   │   ├── MetricsPanel.tsx        # Live performance metrics display
│   │   ├── RequestList.tsx         # Pending and completed request list
│   │   └── BiasesInfo.tsx          # Rush-hour bias explanation panel
│   ├── hooks/
│   │   └── useSimulation.ts        # Polling hook — fetches state every 300–1000 ms
│   └── types/
│       └── index.ts                # Shared TypeScript interfaces (MetricsResponse, etc.)
├── index.html                      # HTML shell — single <div id="root">
├── vite.config.ts                  # Vite config: React plugin, Tailwind, API proxy
├── tsconfig.json                   # Project-level TS config (references app + node)
├── tsconfig.app.json               # App source TypeScript config
├── tsconfig.node.json              # Vite config file TypeScript config
├── eslint.config.js                # ESLint flat config
└── package.json
```

---

## Installation

```bash
# From the repo root
cd frontend

# Install all dependencies
npm install
```

This installs:

- **Runtime deps:** `react`, `react-dom`
- **Dev deps:** `vite`, `typescript`, `tailwindcss`, `eslint`, `@vitejs/plugin-react`, and all `@types/*` packages

---

## Running the App

### Development (recommended)

```bash
npm run dev
```

Starts the Vite development server with Hot Module Replacement (HMR). Default URL: **http://localhost:5173**

> The backend must be running at the proxied address before you open the app. See [Backend Connection](#backend-connection) below.

### Production build + preview

```bash
# 1. Type-check and bundle for production
npm run build

# 2. Preview the production bundle locally
npm run preview
```

Built files are output to `dist/`. The preview server runs on a randomly assigned port — check the terminal output.

---

## Available Scripts

| Script    | Command                | Description                                |
| --------- | ---------------------- | ------------------------------------------ |
| `dev`     | `vite`                 | Start the HMR dev server                   |
| `build`   | `tsc -b && vite build` | Type-check then bundle for production      |
| `preview` | `vite preview`         | Serve the production `dist/` build locally |
| `lint`    | `eslint .`             | Run ESLint across all source files         |

---

## Backend Connection

The Vite dev server is configured to proxy all `/api` requests to the backend in `vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': 'http://localhost:8000',
  },
},
```

### Changing the backend port

If your backend runs on a different port (the backend defaults to **3001**), update the proxy target in `vite.config.ts`:

```ts
proxy: {
  '/api': 'http://localhost:3001',   // ← match your backend PORT
},
```

Then restart `npm run dev` for the change to take effect.

### Starting both servers together

Open two terminal windows (or use a split terminal):

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

---

## Key Components

| Component       | Description                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Building`      | Renders the full building shaft with all elevator cars in animated positions                                        |
| `ElevatorCar`   | Single elevator car — shows direction, current floor, and load                                                      |
| `FloorPanel`    | Floor row with up/down call indicators and destination highlights                                                   |
| `ControlsPanel` | Start, Stop, Reset buttons; sliders for speed, frequency, floors, and elevator count                                |
| `MetricsPanel`  | Live stats — average wait time, average travel time, elevator utilisation                                           |
| `RequestList`   | Scrollable list of active and recently completed passenger requests                                                 |
| `BiasesInfo`    | Explains the rush-hour request-generation bias currently in effect                                                  |
| `useSimulation` | React hook that polls `GET /api/metrics` every 300 ms (running) or 1 000 ms (stopped) and exposes control callbacks |
