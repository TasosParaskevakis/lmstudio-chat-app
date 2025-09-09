LM Studio Chat — Full‑Stack App

Overview
- React + TypeScript + Vite frontend with Tailwind and Zustand
- Node.js + Express + TypeScript backend with Prisma + SQLite
- Streams assistant replies via SSE, maintains multi‑chat history
- Mockable Model Manager simulates load/unload with progress

Prerequisites
- Node.js 18+

Server setup
1) Configure environment (optional)
   - Create `server/.env` with:
     - `PORT=3001` (default)
     - `DATABASE_URL="file:./dev.db"` (default)
     - `LMSTUDIO_BASE_URL=http://localhost:1234/v1` (LM Studio default)
     - `CORS_ORIGIN=http://localhost:5173`

2) Install deps and create DB
   - `cd server`
   - `npm i`
   - `npx prisma migrate dev`
   - `npm run dev`

Frontend setup
1) Configure environment (optional)
   - Create `web/.env` with:
     - `VITE_API_BASE=http://localhost:3001`

2) Install and run
   - `cd web`
   - `npm i`
   - `npm run dev`

Using the app
- Open http://localhost:5173
- In the top bar, open the model selector, choose a model
  - The Model Manager will simulate loading with progress; Send is disabled until idle
- Create new chats from the sidebar, rename or delete as needed
- Messages stream live; history persists across reloads
- Switching models mid‑chat keeps history and uses it for context

One‑command dev startup
- From repo root: `npm run dev`
  - Runs server and web in parallel using `run-dev.sh`
  - First run installs missing dependencies and ensures Vite React plugin is present
  - Press Ctrl+C to stop both

Access from another device (LAN)
- Ensure your dev machine IP is reachable, e.g. `10.1.1.9` on the same network
- Vite dev server now binds to all interfaces (0.0.0.0); open `http://10.1.1.9:5173`
- API base defaults to `http://<current-hostname>:3001` if `VITE_API_BASE` is empty or `auto`
  - To use auto detection, set `web/.env`: `VITE_API_BASE=auto`
- CORS: set multiple origins or wildcard in `server/.env`, e.g.:
  - `CORS_ORIGIN=http://localhost:5173,http://10.1.1.9:5173` or `CORS_ORIGIN=*`
- Firewall: allow inbound 5173 (Vite) and 3001 (server) on your OS firewall

LM Studio integration
- The app calls LM Studio’s OpenAI‑compatible API at `LMSTUDIO_BASE_URL`
  - `GET /v1/models` for available models
  - `POST /v1/chat/completions` with `stream: true` for inference
- If LM Studio is not running, the Models list falls back to a short mock list

Model Manager (mock) implementation
- File: `server/src/modelManager.ts`
- Behavior:
  - Tracks `{ activeModelName, status, progress }` in memory
  - `load(name)`: simulates progress 0→100% over ~3–8s, sets active model
  - `unload()`: quick unload
  - Persists last active model in `Setting` table
- TODOs to wire real load/unload:
  - Replace the mock timer with actual LM Studio control (CLI, HTTP, or IPC)
  - On successful load, set `activeModelName` and persist

API endpoints
- Models
  - `GET  /api/models/available` → `{ models: string[] }`
  - `GET  /api/models/loaded` → `{ model, status, progress }`
  - `POST /api/models/load` `{ name }` → `202` and begin loading
  - `POST /api/models/unload` → `202` begin unload
  - `GET  /api/models/status` → `{ model, status, progress }`
- Chats
  - `POST /api/chat` `{ chatId, message }` → SSE stream of tokens
  - `POST /api/chats` `{ title?, model? }` → `{ chat }`
  - `GET  /api/chats` → `{ chats }`
  - `GET  /api/chats/:id` → `{ chat, messages }`
  - `PATCH /api/chats/:id` `{ title?, model?, systemPrompt? }`
  - `DELETE /api/chats/:id` → `204`
  - `POST /api/chats/:id/messages` `{ role, content }` → `{ message }`
  - `DELETE /api/chats/:id/messages/:mid` → `204`

Notes
- SSE format: backend forwards tokens as `data: <token>`, ends with `data: [DONE]`
- Context window: simple sliding window by approximate token count (4 chars/token)
- CORS is enabled for development
