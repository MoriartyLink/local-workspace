# Local Workspace

<img width="1200" height="900" alt="image" src="https://github.com/user-attachments/assets/60c769ca-48ce-4ffd-ba33-5045d3ed7c0d" />

A **local-first desktop workspace** for journaling, task tracking, projects, meetings, and people management. All your data lives as plain Markdown (`.md`) files with YAML frontmatter — inspired by Obsidian — so it is fully yours, readable, and portable.

## Why this app exists

Most productivity tools lock your notes and tasks inside a cloud account. Local Workspace is built so your data never leaves your machine: it is stored as human-readable `.md` files you can open, edit, search, and back up with any tool. It gives you a structured, app-like experience on top of a plain-text vault.

## Who should use it

- People who journal daily and want reflection prompts plus task tracking in one place.
- Individuals managing projects with Kanban boards and milestones.
- Anyone who prefers **local-first, private** storage over cloud accounts.
- Linux (especially Manjaro / GNOME) users who want a native desktop app.

## Features

- **Journal** — daily entries with tasks, physical/mental status, and reflection prompts.
- **Projects** — Kanban boards with milestones, priorities, and tags; cards completed in *Done* auto-archive to History after 24h.
- **Meeting** — agenda, minutes, participants, and Telegram bot reminders.
- **People** — contacts, relationships, goals, and a brainstorming whiteboard.
- **Search** — full-text search across journals, projects, meetings, and people.
- **History** — timeline of completed tasks and milestones.
- **Local Vault** — everything as `.md` files, Obsidian-compatible.

## How to use it

1. Launch **Local Workspace** from your app menu (or run the AppImage).
2. Your **vault** is created automatically (default `~/vault`). Open or switch it from the sidebar.
3. Use the sidebar to move between Journal, Projects, Meeting, People, Search, and History.
4. **Back up / restore** with Export / Import in the sidebar (a JSON snapshot of the vault).
5. Edit any `.md` file directly — the app picks up the change.

### Telegram meeting reminders

1. Create a Telegram bot with `@BotFather` and copy its bot token.
2. Send the new bot a message from the Telegram chat that should receive reminders.
3. In **Meetings → Telegram meeting reminders**, paste the token and select **Find chat**.
4. Send a test, enable reminders, and save the settings.
5. Turn on **Reminder** for a meeting and optionally choose when it should be sent.

Local Workspace must be running at reminder time. Bot credentials stay in the desktop app settings and use operating-system encryption when Electron secure storage is available.

Vault layout:

```
vault/
├── journal/YYYY-MM-DD.md
├── projects/<id>.md
├── meetings/<id>.md
├── people/<id>.md
└── profile.md
```

## How it was built

- **Desktop:** Electron (main process + a preload context-bridge).
- **UI:** React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui components, Recharts for charts.
- **Storage:** the main process reads/writes `.md` files over IPC; the renderer never touches the filesystem directly.
- **Packaging:** `electron-builder` produces an AppImage (and `.deb`) for Linux.
- **Tests:** Vitest + React Testing Library.

```bash
npm install
npm run dev            # browser dev mode (localStorage fallback)
npm run dev:electron   # Electron dev mode
npm run build:electron # production AppImage + .deb
```

## Components

- `electron/main.cjs` — window, vault I/O, IPC handlers, file watching.
- `electron/preload.cjs` — exposes a safe `electronAPI` to the renderer.
- `src/App.tsx` — routing (HashRouter) + providers.
- `src/contexts/` — `DataContext` (state + IPC) and `SidebarContext`.
- `src/components/` — `Sidebar` and reusable UI components.
- `src/pages/` — Journal, Project, Meeting, People, Search, History.
- `src/types/` — shared TypeScript types.

Data flow:

```
[React UI] -> [DataContext] -> [electronAPI] -> [IPC] -> [main] -> [.md files]
```

## What to be careful about

- **Your data is plain files.** Deleting or corrupting a `.md` can lose data — use Export for backups.
- **Vault location:** it is created in the launcher's working directory (usually your home). Use "Switch" in the sidebar to move it.
- **Linux / Manjaro (GNOME/Wayland):** Electron can hit a `GTK 2/3 vs GTK 4` crash. The installed launcher already passes `GDK_BACKEND=x11 --gtk-version=3`; if you run the AppImage manually, add those flags.
- **Direct edits:** hand-editing `.md` is supported, but keep the YAML frontmatter valid.
- **One vault at a time:** the app targets a single local vault.


## License

MIT
