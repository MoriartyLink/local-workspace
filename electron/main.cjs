const { app, BrowserWindow, ipcMain, dialog, shell, Menu, globalShortcut, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const matter = require("gray-matter");
const chokidar = require("chokidar");

// ── Vault path ──
const DEFAULT_VAULT = path.join(process.cwd(), "vault"); // Simple local folder for data storage
let vaultPath = DEFAULT_VAULT;
let watcher = null;

// ── Settings ──
function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function readSettings() {
  try {
    const data = fs.readFileSync(getSettingsPath(), "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function loadSettings() {
  const settings = readSettings();
  if (settings.vaultPath && fs.existsSync(settings.vaultPath)) {
    vaultPath = settings.vaultPath;
  }
  return settings;
}

function saveSettings(settings) {
  const dir = path.dirname(getSettingsPath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
}

// ── Vault directory structure ──
function ensureVault() {
  const dirs = [
    vaultPath,
    path.join(vaultPath, "journal"),
    path.join(vaultPath, "projects"),
    path.join(vaultPath, "meetings"),
    path.join(vaultPath, "people"),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  // Create profile.md if not exists
  const profilePath = path.join(vaultPath, "profile.md");
  if (!fs.existsSync(profilePath)) {
    const defaultProfile = buildProfileMd({ name: "", avatar: "", goals: [], facts: [] });
    fs.writeFileSync(profilePath, defaultProfile, "utf-8");
  }
}

// ── Frontmatter helpers (using gray-matter) ──
function parseFrontmatter(content) {
  try {
    const parsed = matter(content);
    return { meta: parsed.data, body: parsed.content.trim() };
  } catch {
    return { meta: {}, body: content };
  }
}

function buildFrontmatter(meta, body = "") {
  return matter.stringify(body, meta);
}

// ── Journal entry ↔ .md ──
function buildJournalMd(entry) {
  const meta = {
    id: entry.id || "",
    date: entry.date,
    mentalStatus: entry.mentalStatus || { morning: 2, afternoon: 2, night: 2 },
    physicalStatus: entry.physicalStatus || "good",
    physicalNote: entry.physicalNote || "",
    mentalNote: entry.mentalNote || "",
    bestThing: entry.bestThing || "",
    proudThings: entry.proudThings || "",
    lessonLearned: entry.lessonLearned || "",
    lessonChange: entry.lessonChange || "",
    excitedAbout: entry.excitedAbout || "",
    tasks: (entry.tasks || []).map(t => ({
      id: t.id,
      task: t.task,
      outcome: t.outcome,
      system: t.system,
      mission: t.mission,
      completed: t.completed,
    })),
  };
  const body = entry.journal || "";
  return buildFrontmatter(meta, body);
}

function parseJournalMd(content, dateStr) {
  const { meta, body } = parseFrontmatter(content);
  return {
    id: meta.id || "",
    date: meta.date || dateStr,
    tasks: (meta.tasks || []).map(t => {
      if (typeof t === "string") {
        try { return JSON.parse(t); } catch { return { id: "", task: t, outcome: "", system: "", mission: "", completed: false }; }
      }
      return t;
    }),
    mentalStatus: meta.mentalStatus || { morning: 2, afternoon: 2, night: 2 },
    physicalStatus: meta.physicalStatus || "good",
    physicalNote: meta.physicalNote || "",
    mentalNote: meta.mentalNote || "",
    journal: body,
    bestThing: meta.bestThing || "",
    proudThings: meta.proudThings || "",
    lessonLearned: meta.lessonLearned || "",
    lessonChange: meta.lessonChange || "",
    excitedAbout: meta.excitedAbout || "",
  };
}

// ── Profile ↔ .md ──
function buildProfileMd(profile) {
  const meta = {
    name: profile.name || "",
    avatar: profile.avatar || "",
    goals: profile.goals || [],
    facts: profile.facts || [],
  };
  return buildFrontmatter(meta);
}

function parseProfileMd(content) {
  const { meta } = parseFrontmatter(content);
  return {
    name: meta.name || "",
    email: "",
    avatar: meta.avatar || "",
    goals: (meta.goals || []).map(g => typeof g === "string" ? JSON.parse(g) : g),
    facts: (meta.facts || []).map(f => typeof f === "string" ? JSON.parse(f) : f),
  };
}

// ── Project ↔ .md ──
function buildProjectMd(project) {
  const meta = {
    id: project.id,
    title: project.title || "",
    description: project.description || "",
    color: project.color || "#3b82f6",
    archived: project.archived || false,
    createdAt: project.createdAt || new Date().toISOString(),
    milestones: project.milestones || [],
    cards: project.cards || [],
    history: project.history || [],
  };
  return buildFrontmatter(meta);
}

function parseProjectMd(content) {
  const { meta } = parseFrontmatter(content);
  return {
    id: meta.id || "",
    title: meta.title || "",
    description: meta.description || "",
    color: meta.color || "#3b82f6",
    archived: meta.archived === true || meta.archived === "true",
    createdAt: meta.createdAt || "",
    milestones: (meta.milestones || []).map(m => typeof m === "string" ? JSON.parse(m) : m),
    cards: (meta.cards || []).map(c => typeof c === "string" ? JSON.parse(c) : c),
    history: (meta.history || []).map(h => typeof h === "string" ? JSON.parse(h) : h),
  };
}

// ── Meeting ↔ .md ──
function buildMeetingMd(meeting) {
  const meta = {
    id: meeting.id || "",
    title: meeting.title || "",
    date: meeting.date || "",
    time: meeting.time || "",
    reminder: meeting.reminder || false,
    reminderMinutes: Number.isFinite(meeting.reminderMinutes) ? meeting.reminderMinutes : undefined,
    agenda: meeting.agenda || "",
    minutes: meeting.minutes || "",
    transcription: meeting.transcription || "",
    participants: meeting.participants || [],
    relatedProjectId: meeting.relatedProjectId || "",
    createdAt: meeting.createdAt || new Date().toISOString(),
  };
  return buildFrontmatter(meta);
}

function parseMeetingMd(content) {
  const { meta } = parseFrontmatter(content);
  return {
    id: meta.id || "",
    title: meta.title || "",
    date: meta.date || "",
    time: meta.time || "",
    reminder: meta.reminder === true || meta.reminder === "true",
    reminderMinutes: Number.isFinite(Number(meta.reminderMinutes)) ? Number(meta.reminderMinutes) : undefined,
    agenda: meta.agenda || "",
    minutes: meta.minutes || "",
    transcription: meta.transcription || "",
    participants: (meta.participants || []).map(p => typeof p === "string" ? p : String(p)),
    relatedProjectId: meta.relatedProjectId || undefined,
    createdAt: meta.createdAt || "",
  };
}

// ── Person ↔ .md ──
function buildPersonMd(person) {
  const meta = {
    id: person.id || "",
    name: person.name || "",
    relationshipStatus: person.relationshipStatus || "",
    wants: person.wants || "",
    goal: person.goal || "",
    telegramUsername: person.telegramUsername || "",
    email: person.email || "",
    notes: person.notes || "",
    connections: person.connections || [],
    createdAt: person.createdAt || new Date().toISOString(),
  };
  return buildFrontmatter(meta);
}

function parsePersonMd(content) {
  const { meta } = parseFrontmatter(content);
  return {
    id: meta.id || "",
    name: meta.name || "",
    relationshipStatus: meta.relationshipStatus || "",
    wants: meta.wants || "",
    goal: meta.goal || "",
    telegramUsername: meta.telegramUsername || "",
    email: meta.email || "",
    notes: meta.notes || "",
    connections: (meta.connections || []).map(c => typeof c === "string" ? c : String(c)),
    createdAt: meta.createdAt || "",
  };
}

// ── Backlog item ↔ .md ──
function buildBacklogMd(item) {
  const meta = {
    id: item.id || "",
    content: item.content || "",
    type: item.type || "braindump",
    cynefinDomain: item.cynefinDomain || "disorder",
    createdAt: item.createdAt || new Date().toISOString(),
    tags: item.tags || [],
    done: item.done || false,
  };
  return buildFrontmatter(meta);
}

function parseBacklogMd(content) {
  const { meta } = parseFrontmatter(content);
  return {
    id: meta.id || "",
    content: meta.content || "",
    type: meta.type || "braindump",
    cynefinDomain: meta.cynefinDomain || "disorder",
    createdAt: meta.createdAt || "",
    tags: (meta.tags || []).map(t => typeof t === "string" ? t : String(t)),
    done: meta.done === true || meta.done === "true",
  };
}

// ── Safe filename ──
function safeFilename(str) {
  return str.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 80);
}

// ── Telegram meeting reminders ──
const DEFAULT_REMINDER_MINUTES = 15;
let reminderTimer = null;
let reminderCheckRunning = false;

function normalizeReminderMinutes(value, fallback = DEFAULT_REMINDER_MINUTES) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return fallback;
  return Math.min(10080, Math.max(0, Math.round(minutes)));
}

function getStoredTelegramToken(settings = readSettings()) {
  const telegram = settings.telegram || {};
  if (telegram.botTokenEncrypted && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(telegram.botTokenEncrypted, "base64"));
    } catch (err) {
      console.error("Could not decrypt the Telegram bot token:", err.message);
    }
  }
  return typeof telegram.botToken === "string" ? telegram.botToken : "";
}

function hasProtectedSafeStorage() {
  if (!safeStorage.isEncryptionAvailable()) return false;
  if (process.platform !== "linux" || typeof safeStorage.getSelectedStorageBackend !== "function") return true;
  try {
    return safeStorage.getSelectedStorageBackend() !== "basic_text";
  } catch {
    return false;
  }
}

function telegramSettingsForRenderer(settings = readSettings()) {
  const telegram = settings.telegram || {};
  return {
    enabled: telegram.enabled === true,
    chatId: typeof telegram.chatId === "string" ? telegram.chatId : "",
    defaultReminderMinutes: normalizeReminderMinutes(telegram.defaultReminderMinutes),
    botConfigured: Boolean(getStoredTelegramToken(settings)),
    secureStorageAvailable: hasProtectedSafeStorage(),
  };
}

function validateBotToken(botToken) {
  return typeof botToken === "string" && /^\d+:[A-Za-z0-9_-]{20,}$/.test(botToken.trim());
}

async function telegramRequest(botToken, method, payload = {}) {
  if (!validateBotToken(botToken)) {
    throw new Error("Enter a valid Telegram bot token from @BotFather.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken.trim()}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(result?.description || `Telegram request failed (${response.status}).`);
    }
    return result.result;
  } catch (err) {
    if (err?.name === "AbortError") throw new Error("Telegram did not respond in time.");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendTelegramMessage(botToken, chatId, text) {
  if (!String(chatId || "").trim()) {
    throw new Error("Enter or discover a Telegram chat ID.");
  }
  return telegramRequest(botToken, "sendMessage", {
    chat_id: String(chatId).trim(),
    text,
  });
}

function loadMeetingsFromVault() {
  const dir = path.join(vaultPath, "meetings");
  if (!fs.existsSync(dir)) return [];
  const list = [];
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith(".md"))) {
    try {
      list.push(parseMeetingMd(fs.readFileSync(path.join(dir, file), "utf-8")));
    } catch (err) {
      console.error(`Failed to parse meetings/${file}:`, err.message);
    }
  }
  return list.sort((a, b) =>
    (a.date || "").localeCompare(b.date || "") || (a.time || "").localeCompare(b.time || "")
  );
}

function formatReminderLead(minutes) {
  if (minutes === 0) return "starting now";
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `in ${days} day${days === 1 ? "" : "s"}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `in ${minutes} minutes`;
}

function buildMeetingReminderMessage(meeting, reminderMinutes) {
  const meetingDate = new Date(`${meeting.date}T${meeting.time || "00:00"}`);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(meetingDate);
  const lines = [
    "⏰ Meeting reminder",
    "",
    meeting.title || "Untitled Meeting",
    `Starts ${formatReminderLead(reminderMinutes)}`,
    formattedDate,
  ];
  const agenda = String(meeting.agenda || "").trim().replace(/\s+/g, " ");
  if (agenda) lines.push("", `Agenda: ${agenda.slice(0, 300)}`);
  return lines.join("\n");
}

function meetingReminderKey(meeting, reminderMinutes) {
  return `${meeting.id}:${meeting.date}T${meeting.time}:${reminderMinutes}`;
}

async function checkMeetingReminders() {
  if (reminderCheckRunning) return;
  reminderCheckRunning = true;
  try {
    const settings = readSettings();
    const telegram = settings.telegram || {};
    const botToken = getStoredTelegramToken(settings);
    const chatId = String(telegram.chatId || "").trim();
    if (telegram.enabled !== true || !botToken || !chatId) return;

    const now = Date.now();
    const sentKeys = new Set(Array.isArray(telegram.sentReminderKeys) ? telegram.sentReminderKeys : []);
    for (const meeting of loadMeetingsFromVault()) {
      if (!meeting.reminder || !meeting.date || !meeting.time) continue;
      const meetingTime = new Date(`${meeting.date}T${meeting.time}`).getTime();
      if (!Number.isFinite(meetingTime)) continue;
      const reminderMinutes = normalizeReminderMinutes(
        meeting.reminderMinutes,
        normalizeReminderMinutes(telegram.defaultReminderMinutes),
      );
      const reminderTime = meetingTime - reminderMinutes * 60_000;
      const key = meetingReminderKey(meeting, reminderMinutes);
      const isDue = now >= reminderTime && now <= meetingTime + 60_000;
      if (!isDue || sentKeys.has(key)) continue;

      try {
        await sendTelegramMessage(
          botToken,
          chatId,
          buildMeetingReminderMessage(meeting, reminderMinutes),
        );
        sentKeys.add(key);
        const latestSettings = readSettings();
        const latestTelegram = latestSettings.telegram || {};
        const latestKeys = new Set(
          Array.isArray(latestTelegram.sentReminderKeys) ? latestTelegram.sentReminderKeys : [],
        );
        latestKeys.add(key);
        saveSettings({
          ...latestSettings,
          telegram: {
            ...latestTelegram,
            sentReminderKeys: Array.from(latestKeys).slice(-200),
          },
        });
      } catch (err) {
        console.error(`Telegram reminder failed for meeting ${meeting.id}:`, err.message);
      }
    }
  } finally {
    reminderCheckRunning = false;
  }
}

function startReminderScheduler() {
  if (reminderTimer) clearInterval(reminderTimer);
  void checkMeetingReminders();
  reminderTimer = setInterval(() => void checkMeetingReminders(), 30_000);
}

// ── File watcher ──
function startWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }

  watcher = chokidar.watch(vaultPath, {
    persistent: true,
    ignoreInitial: true,
    depth: 2,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
    ignored: [
      /(^|[/\\])\../, // dotfiles
      /node_modules/,
    ],
  });

  // Debounce: batch events within 600ms window
  let debounceTimer = null;
  const notifyChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("vault:changed");
      }
    }, 600);
  };

  watcher
    .on("add", notifyChange)
    .on("change", notifyChange)
    .on("unlink", notifyChange);
}

// ── Application menu ──
function buildAppMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "New Entry for Today",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            if (mainWindow) mainWindow.webContents.send("menu:newEntry");
          },
        },
        { type: "separator" },
        {
          label: "Change Vault...",
          click: () => {
            if (mainWindow) mainWindow.webContents.send("menu:changeVault");
          },
        },
        {
          label: "Open Vault Folder",
          click: () => shell.openPath(vaultPath),
        },
        { type: "separator" },
        {
          label: "Export Backup...",
          click: () => {
            if (mainWindow) mainWindow.webContents.send("menu:exportBackup");
          },
        },
        {
          label: "Import Backup...",
          click: () => {
            if (mainWindow) mainWindow.webContents.send("menu:importBackup");
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Sidebar",
          accelerator: "CmdOrCtrl+B",
          click: () => {
            if (mainWindow) mainWindow.webContents.send("menu:toggleSidebar");
          },
        },
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "resetZoom" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Go",
      submenu: [
        {
          label: "Journal",
          accelerator: "CmdOrCtrl+1",
          click: () => {
            if (mainWindow) mainWindow.webContents.send("menu:navigate", "/");
          },
        },
        {
          label: "Projects",
          accelerator: "CmdOrCtrl+2",
          click: () => {
            if (mainWindow) mainWindow.webContents.send("menu:navigate", "/projects");
          },
        },
        {
          label: "Insights",
          accelerator: "CmdOrCtrl+3",
          click: () => {
            if (mainWindow) mainWindow.webContents.send("menu:navigate", "/insights");
          },
        },
        {
          label: "Meetings",
          accelerator: "CmdOrCtrl+4",
          click: () => {
            if (mainWindow) mainWindow.webContents.send("menu:navigate", "/meeting");
          },
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About Local Workspace",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About Local Workspace",
              message: "Local Workspace",
              detail: `Version ${app.getVersion()}\n\nLocal-first desktop app for daily journaling, task tracking, and project management.\n\nAll data stored as .md files in your local vault.`,
            });
          },
        },
        {
          label: "Open Vault Folder",
          click: () => shell.openPath(vaultPath),
        },
      ],
    },
  ];

  // macOS app menu
  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Main window ──
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#000000",
    titleBarStyle: "hiddenInset",
    frame: process.platform === "darwin" ? false : true,
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "..", "public", "icon.png"),
  });

  // Load from Vite dev server or built files
  const isDev = process.env.ELECTRON_DEV === "true";
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(() => {
  loadSettings();
  ensureVault();
  buildAppMenu();
  createWindow();
  startWatcher();
  startReminderScheduler();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (watcher) watcher.close();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (reminderTimer) clearInterval(reminderTimer);
});

// ── IPC Handlers ──

// Get vault path
ipcMain.handle("vault:getPath", () => vaultPath);

// Change vault path
ipcMain.handle("vault:changePath", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"],
    title: "Choose Vault Directory",
  });
  if (!result.canceled && result.filePaths[0]) {
    vaultPath = result.filePaths[0];
    saveSettings({ ...readSettings(), vaultPath });
    ensureVault();
    startWatcher(); // Restart watcher for new vault
    void checkMeetingReminders();
    return vaultPath;
  }
  return null;
});

// Open vault in file manager
ipcMain.handle("vault:openInExplorer", () => {
  shell.openPath(vaultPath);
});

// ── Journal entries ──
ipcMain.handle("entries:loadAll", () => {
  const journalDir = path.join(vaultPath, "journal");
  if (!fs.existsSync(journalDir)) return {};
  const files = fs.readdirSync(journalDir).filter(f => f.endsWith(".md"));
  const entries = {};
  for (const file of files) {
    try {
      const dateStr = file.replace(".md", "");
      const content = fs.readFileSync(path.join(journalDir, file), "utf-8");
      entries[dateStr] = parseJournalMd(content, dateStr);
    } catch (err) {
      console.error(`Failed to parse journal/${file}:`, err.message);
    }
  }
  return entries;
});

ipcMain.handle("entries:save", (_event, date, entry) => {
  const journalDir = path.join(vaultPath, "journal");
  if (!fs.existsSync(journalDir)) fs.mkdirSync(journalDir, { recursive: true });
  const filePath = path.join(journalDir, `${date}.md`);
  const content = buildJournalMd(entry);
  fs.writeFileSync(filePath, content, "utf-8");
  return true;
});

ipcMain.handle("profile:save", (_event, profile) => {
  const profilePath = path.join(vaultPath, "profile.md");
  const content = buildProfileMd(profile);
  fs.writeFileSync(profilePath, content, "utf-8");
  return true;
});

// ── Projects ──
ipcMain.handle("projects:loadAll", () => {
  const projectsDir = path.join(vaultPath, "projects");
  if (!fs.existsSync(projectsDir)) return [];
  const files = fs.readdirSync(projectsDir).filter(f => f.endsWith(".md"));
  const projects = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(projectsDir, file), "utf-8");
      projects.push(parseProjectMd(content));
    } catch (err) {
      console.error(`Failed to parse projects/${file}:`, err.message);
    }
  }
  return projects.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
});

ipcMain.handle("projects:save", (_event, project) => {
  const projectsDir = path.join(vaultPath, "projects");
  if (!fs.existsSync(projectsDir)) fs.mkdirSync(projectsDir, { recursive: true });
  const filename = `${safeFilename(project.id)}.md`;
  const filePath = path.join(projectsDir, filename);
  const content = buildProjectMd(project);
  fs.writeFileSync(filePath, content, "utf-8");
  return true;
});

ipcMain.handle("projects:delete", (_event, projectId) => {
  const projectsDir = path.join(vaultPath, "projects");
  const filename = `${safeFilename(projectId)}.md`;
  const filePath = path.join(projectsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return true;
});

// ── Meetings ──
ipcMain.handle("meetings:loadAll", () => {
  return loadMeetingsFromVault();
});

ipcMain.handle("meetings:save", (_event, meeting) => {
  const dir = path.join(vaultPath, "meetings");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${safeFilename(meeting.id)}.md`;
  fs.writeFileSync(path.join(dir, filename), buildMeetingMd(meeting), "utf-8");
  void checkMeetingReminders();
  return true;
});

ipcMain.handle("meetings:delete", (_event, meetingId) => {
  const dir = path.join(vaultPath, "meetings");
  const filename = `${safeFilename(meetingId)}.md`;
  const filePath = path.join(dir, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
});

ipcMain.handle("telegram:getSettings", () => telegramSettingsForRenderer());

ipcMain.handle("telegram:saveSettings", (_event, update) => {
  const currentSettings = readSettings();
  const currentTelegram = currentSettings.telegram || {};
  const nextTelegram = {
    ...currentTelegram,
    enabled: update?.enabled === true,
    chatId: String(update?.chatId || "").trim().slice(0, 100),
    defaultReminderMinutes: normalizeReminderMinutes(update?.defaultReminderMinutes),
  };
  const newToken = typeof update?.botToken === "string" ? update.botToken.trim() : "";
  if (newToken) {
    if (!validateBotToken(newToken)) throw new Error("Enter a valid Telegram bot token from @BotFather.");
    if (safeStorage.isEncryptionAvailable()) {
      nextTelegram.botTokenEncrypted = safeStorage.encryptString(newToken).toString("base64");
      delete nextTelegram.botToken;
    } else {
      nextTelegram.botToken = newToken;
      delete nextTelegram.botTokenEncrypted;
    }
  }
  saveSettings({ ...currentSettings, telegram: nextTelegram });
  void checkMeetingReminders();
  return telegramSettingsForRenderer();
});

ipcMain.handle("telegram:test", async (_event, tokenOverride, chatIdOverride) => {
  try {
    const settings = readSettings();
    const botToken = String(tokenOverride || "").trim() || getStoredTelegramToken(settings);
    const chatId = String(chatIdOverride || "").trim() || String(settings.telegram?.chatId || "").trim();
    await sendTelegramMessage(
      botToken,
      chatId,
      `✅ Local Workspace Telegram reminders are connected.\n\nTest sent ${new Date().toLocaleString()}.`,
    );
    return { ok: true, message: "Test reminder sent to Telegram." };
  } catch (err) {
    return { ok: false, message: err.message || "Could not send the Telegram test reminder." };
  }
});

ipcMain.handle("telegram:findChat", async (_event, tokenOverride) => {
  try {
    const settings = readSettings();
    const botToken = String(tokenOverride || "").trim() || getStoredTelegramToken(settings);
    const updates = await telegramRequest(botToken, "getUpdates", {
      limit: 100,
      timeout: 0,
      allowed_updates: ["message", "channel_post", "my_chat_member"],
    });
    const latestChat = [...updates].reverse().map(update =>
      update.message?.chat || update.channel_post?.chat || update.my_chat_member?.chat
    ).find(Boolean);
    if (!latestChat) {
      return {
        ok: false,
        message: "No chat found. Send your bot a message in Telegram, then try again.",
      };
    }
    const title = latestChat.title
      || [latestChat.first_name, latestChat.last_name].filter(Boolean).join(" ")
      || latestChat.username
      || "Telegram chat";
    return {
      ok: true,
      message: `Found ${title}.`,
      chatId: String(latestChat.id),
      chatTitle: title,
    };
  } catch (err) {
    return { ok: false, message: err.message || "Could not discover a Telegram chat." };
  }
});

// ── People ──
ipcMain.handle("people:loadAll", () => {
  const dir = path.join(vaultPath, "people");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".md"));
  const list = [];
  for (const file of files) {
    try {
      list.push(parsePersonMd(fs.readFileSync(path.join(dir, file), "utf-8")));
    } catch (err) {
      console.error(`Failed to parse people/${file}:`, err.message);
    }
  }
  return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
});

ipcMain.handle("people:save", (_event, person) => {
  const dir = path.join(vaultPath, "people");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${safeFilename(person.id)}.md`;
  fs.writeFileSync(path.join(dir, filename), buildPersonMd(person), "utf-8");
  return true;
});

ipcMain.handle("people:delete", (_event, personId) => {
  const dir = path.join(vaultPath, "people");
  const filename = `${safeFilename(personId)}.md`;
  const filePath = path.join(dir, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
});

ipcMain.handle("backlog:save", (_event, item) => {
  const dir = path.join(vaultPath, "backlog");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${safeFilename(item.id)}.md`;
  fs.writeFileSync(path.join(dir, filename), buildBacklogMd(item), "utf-8");
  return true;
});

ipcMain.handle("backlog:delete", (_event, itemId) => {
  const dir = path.join(vaultPath, "backlog");
  const filename = `${safeFilename(itemId)}.md`;
  const filePath = path.join(dir, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
});

// ── Vault search ──
ipcMain.handle("vault:search", (_event, query) => {
  if (!query || query.length < 2) return [];
  const results = [];
  const lowerQuery = query.toLowerCase();

  // Search journal entries
  const journalDir = path.join(vaultPath, "journal");
  if (fs.existsSync(journalDir)) {
    for (const file of fs.readdirSync(journalDir).filter(f => f.endsWith(".md"))) {
      try {
        const content = fs.readFileSync(path.join(journalDir, file), "utf-8");
        if (content.toLowerCase().includes(lowerQuery)) {
          const dateStr = file.replace(".md", "");
          const entry = parseJournalMd(content, dateStr);
          results.push({
            type: "journal",
            id: dateStr,
            title: `Journal — ${dateStr}`,
            snippet: extractSnippet(content, lowerQuery),
          });
        }
      } catch { /* skip malformed files */ }
    }
  }

  // Search projects
  const projectsDir = path.join(vaultPath, "projects");
  if (fs.existsSync(projectsDir)) {
    for (const file of fs.readdirSync(projectsDir).filter(f => f.endsWith(".md"))) {
      try {
        const content = fs.readFileSync(path.join(projectsDir, file), "utf-8");
        if (content.toLowerCase().includes(lowerQuery)) {
          const project = parseProjectMd(content);
          results.push({
            type: "project",
            id: project.id,
            title: `Project — ${project.title}`,
            snippet: extractSnippet(content, lowerQuery),
          });
        }
      } catch { /* skip malformed files */ }
    }
  }

  // Search profile
  const profilePath = path.join(vaultPath, "profile.md");
  if (fs.existsSync(profilePath)) {
    try {
      const content = fs.readFileSync(profilePath, "utf-8");
      if (content.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: "profile",
          id: "profile",
          title: "Profile",
          snippet: extractSnippet(content, lowerQuery),
        });
      }
    } catch { /* skip */ }
  }

  return results;
});

function extractSnippet(content, query) {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return "";
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + query.length + 60);
  let snippet = content.substring(start, end).replace(/\n/g, " ").trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";
  return snippet;
}

// ── Export all data as JSON backup ──
ipcMain.handle("data:exportBackup", async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `local-workspace-backup-${new Date().toISOString().split("T")[0]}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (result.canceled) return false;

  // Gather all data
  const journalDir = path.join(vaultPath, "journal");
  const entries = {};
  if (fs.existsSync(journalDir)) {
    for (const file of fs.readdirSync(journalDir).filter(f => f.endsWith(".md"))) {
      const dateStr = file.replace(".md", "");
      entries[dateStr] = parseJournalMd(fs.readFileSync(path.join(journalDir, file), "utf-8"), dateStr);
    }
  }

  const projectsDir = path.join(vaultPath, "projects");
  const projects = [];
  if (fs.existsSync(projectsDir)) {
    for (const file of fs.readdirSync(projectsDir).filter(f => f.endsWith(".md"))) {
      projects.push(parseProjectMd(fs.readFileSync(path.join(projectsDir, file), "utf-8")));
    }
  }

  const data = { entries, projects, exportedAt: new Date().toISOString() };
  fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
  return true;
});

// ── Import JSON backup ──
ipcMain.handle("data:importBackup", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePaths[0]) return null;

  try {
    const data = JSON.parse(fs.readFileSync(result.filePaths[0], "utf-8"));

    // Write entries
    if (data.entries) {
      for (const [date, entry] of Object.entries(data.entries)) {
        const content = buildJournalMd(entry);
        const journalDir = path.join(vaultPath, "journal");
        if (!fs.existsSync(journalDir)) fs.mkdirSync(journalDir, { recursive: true });
        fs.writeFileSync(path.join(journalDir, `${date}.md`), content, "utf-8");
      }
    }

    // Write projects
    if (data.projects) {
      const projectsDir = path.join(vaultPath, "projects");
      if (!fs.existsSync(projectsDir)) fs.mkdirSync(projectsDir, { recursive: true });
      for (const project of data.projects) {
        const filename = `${safeFilename(project.id)}.md`;
        fs.writeFileSync(path.join(projectsDir, filename), buildProjectMd(project), "utf-8");
      }
    }

    return true;
  } catch (err) {
    console.error("Import failed:", err);
    return null;
  }
});

// Window control (for custom titlebar on macOS)
ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle("window:close", () => mainWindow?.close());
