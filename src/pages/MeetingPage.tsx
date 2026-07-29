import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignLeft,
  Bell,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  Lock,
  Loader2,
  Plus,
  Repeat2,
  Search,
  Send,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/contexts/DataContext";
import type { Meeting, Person, Project } from "@/types";
import type { TelegramReminderSettings } from "@/types/electron";

type ScheduleView = "day" | "week" | "month" | "year";
type ScheduleFilter = "all" | "upcoming" | "past";
type MeetingAccent = NonNullable<Meeting["accent"]>;
type PersonalCategory = NonNullable<Meeting["personalCategory"]>;
type PersonalRepeat = "none" | "daily" | "weekly" | "weekdays" | "custom";

interface PersonalTimeDraft {
  title: string;
  category: PersonalCategory;
  date: string;
  time: string;
  durationMinutes: number;
  repeat: PersonalRepeat;
  interval: number;
  repeatUntil: string;
  weekdays: number[];
  accent: MeetingAccent;
  importance: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

const SLOT_MINUTES = 30;
const SLOT_COUNT = (24 * 60) / SLOT_MINUTES;
const SLOT_HEIGHT = 34;
const VIEW_OPTIONS: { value: ScheduleView; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];
const MEETING_ACCENTS: {
  value: MeetingAccent;
  swatch: string;
  card: string;
  title: string;
  meta: string;
  muted: string;
}[] = [
  { value: "blue", swatch: "bg-blue-400", card: "border-blue-400/30 bg-blue-500/20 hover:border-blue-300/60 hover:bg-blue-500/30", title: "text-blue-100", meta: "text-blue-300/70", muted: "text-blue-200/60" },
  { value: "violet", swatch: "bg-violet-400", card: "border-violet-400/30 bg-violet-500/20 hover:border-violet-300/60 hover:bg-violet-500/30", title: "text-violet-100", meta: "text-violet-300/70", muted: "text-violet-200/60" },
  { value: "emerald", swatch: "bg-emerald-400", card: "border-emerald-400/30 bg-emerald-500/20 hover:border-emerald-300/60 hover:bg-emerald-500/30", title: "text-emerald-100", meta: "text-emerald-300/70", muted: "text-emerald-200/60" },
  { value: "amber", swatch: "bg-amber-400", card: "border-amber-400/30 bg-amber-500/20 hover:border-amber-300/60 hover:bg-amber-500/30", title: "text-amber-100", meta: "text-amber-300/70", muted: "text-amber-200/60" },
  { value: "rose", swatch: "bg-rose-400", card: "border-rose-400/30 bg-rose-500/20 hover:border-rose-300/60 hover:bg-rose-500/30", title: "text-rose-100", meta: "text-rose-300/70", muted: "text-rose-200/60" },
  { value: "cyan", swatch: "bg-cyan-400", card: "border-cyan-400/30 bg-cyan-500/20 hover:border-cyan-300/60 hover:bg-cyan-500/30", title: "text-cyan-100", meta: "text-cyan-300/70", muted: "text-cyan-200/60" },
  { value: "orange", swatch: "bg-orange-400", card: "border-orange-400/30 bg-orange-500/20 hover:border-orange-300/60 hover:bg-orange-500/30", title: "text-orange-100", meta: "text-orange-300/70", muted: "text-orange-200/60" },
  { value: "lime", swatch: "bg-lime-400", card: "border-lime-400/30 bg-lime-500/20 hover:border-lime-300/60 hover:bg-lime-500/30", title: "text-lime-100", meta: "text-lime-300/70", muted: "text-lime-200/60" },
  { value: "pink", swatch: "bg-pink-400", card: "border-pink-400/30 bg-pink-500/20 hover:border-pink-300/60 hover:bg-pink-500/30", title: "text-pink-100", meta: "text-pink-300/70", muted: "text-pink-200/60" },
  { value: "indigo", swatch: "bg-indigo-400", card: "border-indigo-400/30 bg-indigo-500/20 hover:border-indigo-300/60 hover:bg-indigo-500/30", title: "text-indigo-100", meta: "text-indigo-300/70", muted: "text-indigo-200/60" },
  { value: "teal", swatch: "bg-teal-400", card: "border-teal-400/30 bg-teal-500/20 hover:border-teal-300/60 hover:bg-teal-500/30", title: "text-teal-100", meta: "text-teal-300/70", muted: "text-teal-200/60" },
  { value: "fuchsia", swatch: "bg-fuchsia-400", card: "border-fuchsia-400/30 bg-fuchsia-500/20 hover:border-fuchsia-300/60 hover:bg-fuchsia-500/30", title: "text-fuchsia-100", meta: "text-fuchsia-300/70", muted: "text-fuchsia-200/60" },
];
const PERSONAL_CATEGORIES: {
  value: PersonalCategory;
  label: string;
  accent: MeetingAccent;
}[] = [
  { value: "gym", label: "Gym", accent: "emerald" },
  { value: "university", label: "University", accent: "blue" },
  { value: "development", label: "Personal development", accent: "violet" },
  { value: "family", label: "Family time", accent: "amber" },
  { value: "relationship", label: "Relationship time", accent: "rose" },
];
const WEEKDAYS = [
  { value: 0, label: "M" },
  { value: 1, label: "T" },
  { value: 2, label: "W" },
  { value: 3, label: "T" },
  { value: 4, label: "F" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];
const DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
];
const REMINDER_OPTIONS = [
  { value: 0, label: "At meeting time" },
  { value: 5, label: "5 min before" },
  { value: 10, label: "10 min before" },
  { value: 15, label: "15 min before" },
  { value: 30, label: "30 min before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

function TelegramReminderSettingsPanel() {
  const [settings, setSettings] = useState<TelegramReminderSettings>({
    enabled: false,
    chatId: "",
    defaultReminderMinutes: 15,
    botConfigured: false,
    secureStorageAvailable: false,
  });
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "testing" | "finding">("loading");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const desktopAvailable = Boolean(window.electronAPI);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) {
      setStatus("idle");
      return;
    }
    let active = true;
    void api.getTelegramReminderSettings()
      .then(loaded => {
        if (!active) return;
        setSettings(loaded);
        setChatId(loaded.chatId);
        setStatus("idle");
      })
      .catch(() => {
        if (!active) return;
        setFeedback({ kind: "error", text: "Could not load Telegram settings." });
        setStatus("idle");
      });
    return () => {
      active = false;
    };
  }, []);

  const saveSettings = async () => {
    const api = window.electronAPI;
    if (!api) return;
    if (settings.enabled && !chatId.trim()) {
      setFeedback({ kind: "error", text: "Add or find a chat before enabling reminders." });
      return;
    }
    if (settings.enabled && !settings.botConfigured && !botToken.trim()) {
      setFeedback({ kind: "error", text: "Add a bot token before enabling reminders." });
      return;
    }
    setStatus("saving");
    setFeedback(null);
    try {
      const saved = await api.saveTelegramReminderSettings({
        enabled: settings.enabled,
        chatId,
        defaultReminderMinutes: settings.defaultReminderMinutes,
        botToken: botToken.trim() || undefined,
      });
      setSettings(saved);
      setChatId(saved.chatId);
      setBotToken("");
      setFeedback({ kind: "success", text: "Telegram settings saved." });
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Could not save Telegram settings." });
    } finally {
      setStatus("idle");
    }
  };

  const findChat = async () => {
    const api = window.electronAPI;
    if (!api) return;
    setStatus("finding");
    setFeedback(null);
    try {
      const result = await api.findTelegramChat(botToken.trim() || undefined);
      if (result.ok && result.chatId) {
        setChatId(result.chatId);
        setFeedback({ kind: "success", text: result.message });
      } else {
        setFeedback({ kind: "error", text: result.message });
      }
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Could not find a Telegram chat." });
    } finally {
      setStatus("idle");
    }
  };

  const sendTest = async () => {
    const api = window.electronAPI;
    if (!api) return;
    setStatus("testing");
    setFeedback(null);
    try {
      const result = await api.testTelegramReminder(botToken.trim() || undefined, chatId.trim() || undefined);
      setFeedback({ kind: result.ok ? "success" : "error", text: result.message });
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Could not send a test reminder." });
    } finally {
      setStatus("idle");
    }
  };

  const configured = settings.botConfigured || Boolean(botToken.trim());

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4 text-[#B8CEE2]" />
            Telegram reminders
          </CardTitle>
          <span className={`rounded-full px-2 py-1 text-[10px] ${
            settings.enabled && configured && chatId
              ? "bg-[#53589A]/35 text-[#DCE7F1]"
              : "bg-zinc-800 text-zinc-500"
          }`}>
            {settings.enabled && configured && chatId ? "Active" : "Inactive"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!desktopAvailable ? (
          <p className="rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-xs text-zinc-400">
            Available in the desktop app.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_0.8fr]">
              <div>
                <Label className="text-[10px] text-zinc-500">Bot token</Label>
                <Input
                  type="password"
                  autoComplete="off"
                  value={botToken}
                  onChange={event => setBotToken(event.target.value)}
                  placeholder={settings.botConfigured ? "Saved — leave blank to keep" : "Token from @BotFather"}
                  className="mt-1 h-9 bg-zinc-950 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-zinc-500">Chat ID</Label>
                <Input
                  value={chatId}
                  onChange={event => setChatId(event.target.value)}
                  placeholder="Find or enter chat ID"
                  className="mt-1 h-9 bg-zinc-950 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-zinc-500">Default reminder</Label>
                <select
                  value={settings.defaultReminderMinutes}
                  onChange={event => setSettings(current => ({
                    ...current,
                    defaultReminderMinutes: Number(event.target.value),
                  }))}
                  className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-300 outline-none"
                >
                  {REMINDER_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => setSettings(current => ({ ...current, enabled: !current.enabled }))}
                className="flex items-center gap-2 text-xs text-zinc-400"
              >
                <span className={`relative h-5 w-9 rounded-full transition-colors ${
                  settings.enabled ? "bg-[#53589A]" : "bg-zinc-700"
                }`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    settings.enabled ? "translate-x-[18px]" : "translate-x-0.5"
                  }`} />
                </span>
                Enable
              </button>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={findChat} disabled={status !== "idle" || !configured}>
                  {status === "finding" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Find chat
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={sendTest} disabled={status !== "idle" || !configured || !chatId.trim()}>
                  {status === "testing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send test
                </Button>
                <Button type="button" size="sm" onClick={saveSettings} disabled={status !== "idle"}>
                  {status === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
              <span className="flex items-center gap-1 text-zinc-600">
                <ShieldCheck className="h-3 w-3" />
                {settings.secureStorageAvailable ? "Token protected by system storage" : "Token stored in local app settings"}
              </span>
              {feedback && (
                <span className={feedback.kind === "success" ? "text-emerald-400" : "text-red-400"}>
                  {feedback.text}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dateToKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = (time || "09:00").split(":").map(Number);
  return Math.max(0, Math.min(1439, hours * 60 + minutes));
}

function slotToTime(slot: number): string {
  const totalMinutes = slot * SLOT_MINUTES;
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}

function formatTime(time: string): string {
  const [hours, minutes] = (time || "09:00").split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function meetingTimestamp(meeting: Meeting): number {
  if (!meeting.date) return 0;
  return new Date(`${meeting.date}T${meeting.time || "00:00"}`).getTime();
}

function getMeetingAccent(meeting: Meeting) {
  return MEETING_ACCENTS.find(option => option.value === meeting.accent) || MEETING_ACCENTS[0];
}

function createMeeting(date: string, time: string): Meeting {
  return {
    id: crypto.randomUUID(),
    title: "",
    date,
    time,
    durationMinutes: 60,
    accent: "blue",
    importance: 2,
    reminder: false,
    reminderMinutes: 15,
    agenda: "",
    minutes: "",
    participants: [],
    createdAt: new Date().toISOString(),
  };
}

function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function calendarDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

function createPersonalTimeDraft(date: string, time: string): PersonalTimeDraft {
  const startDate = dateFromKey(date);
  return {
    title: "Gym",
    category: "gym",
    date,
    time,
    durationMinutes: 60,
    repeat: "weekly",
    interval: 1,
    repeatUntil: dateToKey(addMonths(startDate, 3)),
    weekdays: [weekdayIndex(startDate)],
    accent: "emerald",
    importance: 5,
    notes: "",
  };
}

function createPersonalTimeOccurrences(draft: PersonalTimeDraft): Meeting[] {
  const start = dateFromKey(draft.date);
  const requestedEnd = draft.repeat === "none" ? start : dateFromKey(draft.repeatUntil);
  const end = requestedEnd < start ? start : requestedEnd;
  const interval = Math.max(1, Math.min(12, Math.round(draft.interval)));
  const startDayNumber = calendarDayNumber(start);
  const recurrenceGroupId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const occurrences: Meeting[] = [];

  for (let cursor = new Date(start); cursor <= end && occurrences.length < 500; cursor = addDays(cursor, 1)) {
    const daysSinceStart = calendarDayNumber(cursor) - startDayNumber;
    const weekIndex = Math.floor(daysSinceStart / 7);
    const dayOfWeek = weekdayIndex(cursor);
    const included = draft.repeat === "none"
      ? daysSinceStart === 0
      : draft.repeat === "daily"
        ? daysSinceStart % interval === 0
        : draft.repeat === "weekly"
          ? daysSinceStart % (7 * interval) === 0
          : draft.repeat === "weekdays"
            ? dayOfWeek < 5 && weekIndex % interval === 0
            : draft.weekdays.includes(dayOfWeek) && weekIndex % interval === 0;

    if (!included) continue;
    occurrences.push({
      id: crypto.randomUUID(),
      title: draft.title.trim() || PERSONAL_CATEGORIES.find(category => category.value === draft.category)?.label || "Personal time",
      date: dateToKey(cursor),
      time: draft.time,
      durationMinutes: draft.durationMinutes,
      accent: draft.accent,
      importance: draft.importance,
      kind: "personal",
      personalCategory: draft.category,
      recurrenceGroupId,
      reminder: false,
      reminderMinutes: 15,
      agenda: draft.notes,
      minutes: "",
      participants: [],
      createdAt,
    });
  }

  return occurrences;
}

function viewTitle(view: ScheduleView, anchorDate: Date): string {
  if (view === "day") {
    return anchorDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (view === "month") {
    return anchorDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  if (view === "year") return String(anchorDate.getFullYear());
  const start = startOfWeek(anchorDate);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    const month = start.toLocaleDateString("en-US", { month: "short" });
    return `${month} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

function suggestedStartTime(date: Date): string {
  const now = new Date();
  if (dateToKey(date) !== dateToKey(now)) return "09:00";
  const roundedMinutes = Math.ceil((now.getHours() * 60 + now.getMinutes()) / SLOT_MINUTES) * SLOT_MINUTES;
  return slotToTime(Math.min(SLOT_COUNT - 1, Math.floor(roundedMinutes / SLOT_MINUTES)));
}

function useLongPressMove(
  meeting: Meeting,
  onMove: (meetingId: string, date: string, time: string) => void,
) {
  const [holding, setHolding] = useState(false);
  const [dragging, setDragging] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const activeRef = useRef(false);
  const suppressClickRef = useRef(false);
  const elementRef = useRef<HTMLElement | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const releasePointer = () => {
    const element = elementRef.current;
    const pointerId = pointerIdRef.current;
    if (element && pointerId !== null && element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  };

  const resetGesture = () => {
    clearTimer();
    activeRef.current = false;
    pointerIdRef.current = null;
    elementRef.current = null;
    setHolding(false);
    setDragging(false);
  };

  useEffect(() => () => clearTimer(), []);

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    pointerIdRef.current = event.pointerId;
    originRef.current = { x: event.clientX, y: event.clientY };
    elementRef.current = event.currentTarget;
    activeRef.current = false;
    setHolding(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    timerRef.current = setTimeout(() => {
      activeRef.current = true;
      setDragging(true);
    }, 650);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerId !== pointerIdRef.current) return;
    const distance = Math.hypot(
      event.clientX - originRef.current.x,
      event.clientY - originRef.current.y,
    );
    if (!activeRef.current && distance > 8) {
      releasePointer();
      resetGesture();
    } else if (activeRef.current) {
      event.preventDefault();
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerId !== pointerIdRef.current) return;
    clearTimer();
    if (activeRef.current) {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const slot = target?.closest<HTMLElement>("[data-schedule-date]");
      const date = slot?.dataset.scheduleDate;
      const time = slot?.dataset.scheduleTime || meeting.time || "09:00";
      if (date && (date !== meeting.date || time !== meeting.time)) {
        onMove(meeting.id, date, time);
      }
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
    releasePointer();
    resetGesture();
  };

  const onPointerCancel = () => {
    releasePointer();
    resetGesture();
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>, onSelect: () => void) => {
    event.stopPropagation();
    if (suppressClickRef.current) {
      event.preventDefault();
      return;
    }
    onSelect();
  };

  return {
    holding,
    dragging,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    handleClick,
  };
}

function MovableMeetingCard({
  meeting,
  className,
  style,
  onSelect,
  onMove,
  children,
}: {
  meeting: Meeting;
  className: string;
  style?: React.CSSProperties;
  onSelect: () => void;
  onMove: (meetingId: string, date: string, time: string) => void;
  children: React.ReactNode;
}) {
  const { holding, dragging, pointerHandlers, handleClick } = useLongPressMove(meeting, onMove);
  return (
    <button
      type="button"
      aria-label={meeting.title || "Untitled meeting"}
      data-schedule-date={meeting.date}
      data-schedule-time={meeting.time || "09:00"}
      onClick={event => handleClick(event, onSelect)}
      {...pointerHandlers}
      className={`relative cursor-grab select-none overflow-hidden ${className} ${
        dragging ? "z-30 cursor-grabbing opacity-75 ring-1 ring-white/50" : ""
      }`}
      style={{ ...style, touchAction: dragging ? "none" : "auto" }}
    >
      {children}
      {holding && !dragging && <span className="schedule-hold-progress absolute inset-x-0 bottom-0 h-0.5 bg-white/70" />}
    </button>
  );
}

function TimeGrid({
  days,
  meetings,
  onSelectMeeting,
  onSelectSlot,
  onMoveMeeting,
}: {
  days: Date[];
  meetings: Meeting[];
  onSelectMeeting: (meeting: Meeting) => void;
  onSelectSlot: (date: string, time: string) => void;
  onMoveMeeting: (meetingId: string, date: string, time: string) => void;
}) {
  const todayKey = dateToKey(new Date());
  const dayKeys = days.map(dateToKey);
  const dayKeySignature = dayKeys.join("|");
  const showsToday = dayKeys.includes(todayKey);
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = `64px repeat(${days.length}, minmax(${days.length === 1 ? "280px" : "132px"}, 1fr))`;
  const relevantMeetings = meetings.filter(meeting => dayKeys.includes(meeting.date));

  useEffect(() => {
    const now = new Date();
    const startMinutes = showsToday
      ? Math.max(0, now.getHours() * 60 + now.getMinutes() - 60)
      : 8 * 60;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.floor(startMinutes / SLOT_MINUTES) * SLOT_HEIGHT;
    }
  }, [dayKeySignature, showsToday]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div ref={scrollRef} className="max-h-[calc(100vh-205px)] min-h-[540px] overflow-auto">
          <div style={{ minWidth: days.length === 1 ? 0 : 980 }}>
            <div
              className="sticky top-0 z-20 grid border-b border-zinc-800 bg-zinc-950/95 backdrop-blur"
              style={{ gridTemplateColumns: columns }}
            >
              <div className="h-14 border-r border-zinc-800" />
              {days.map(day => {
                const key = dateToKey(day);
                return (
                  <div key={key} className="flex h-14 items-center justify-center border-r border-zinc-800 px-2 last:border-r-0">
                    <div className="text-center">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                        {day.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p className={`mt-0.5 text-sm font-semibold ${key === todayKey ? "text-[#B8CEE2]" : "text-zinc-200"}`}>
                        {day.getDate()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="relative grid bg-zinc-950/20"
              style={{
                gridTemplateColumns: columns,
                gridTemplateRows: `repeat(${SLOT_COUNT}, ${SLOT_HEIGHT}px)`,
              }}
            >
              {Array.from({ length: SLOT_COUNT / 2 }, (_, hour) => (
                <div
                  key={`time-${hour}`}
                  className="border-r border-t border-zinc-800/80 pr-2 pt-1 text-right text-[10px] text-zinc-600"
                  style={{ gridColumn: 1, gridRow: `${hour * 2 + 1} / span 2` }}
                >
                  {formatTime(`${pad(hour)}:00`)}
                </div>
              ))}

              {days.flatMap((day, dayIndex) =>
                Array.from({ length: SLOT_COUNT }, (_, slot) => {
                  const date = dateToKey(day);
                  const time = slotToTime(slot);
                  return (
                    <button
                      key={`${date}-${time}`}
                      type="button"
                      data-schedule-date={date}
                      data-schedule-time={time}
                      aria-label={`Add meeting on ${date} at ${time}`}
                      onClick={() => onSelectSlot(date, time)}
                      className={`group border-r border-t transition-colors hover:bg-[#53589A]/20 focus:bg-[#53589A]/20 focus:outline-none ${
                        slot % 2 === 0 ? "border-zinc-800/80" : "border-zinc-900"
                      }`}
                      style={{ gridColumn: dayIndex + 2, gridRow: slot + 1 }}
                    >
                      <Plus className="mx-auto h-3 w-3 text-[#B8CEE2] opacity-0 transition-opacity group-hover:opacity-70 group-focus:opacity-70" />
                    </button>
                  );
                }),
              )}

              {relevantMeetings.map(meeting => {
                const dayIndex = dayKeys.indexOf(meeting.date);
                const startSlot = Math.floor(timeToMinutes(meeting.time) / SLOT_MINUTES);
                const requestedSpan = Math.max(1, Math.ceil((meeting.durationMinutes || 60) / SLOT_MINUTES));
                const span = Math.min(requestedSpan, SLOT_COUNT - startSlot);
                const accent = getMeetingAccent(meeting);
                return (
                  <MovableMeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onSelect={() => onSelectMeeting(meeting)}
                    onMove={onMoveMeeting}
                    className={`z-10 m-0.5 rounded-md border px-2 py-1 text-left shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-white/40 ${accent.card}`}
                    style={{
                      gridColumn: dayIndex + 2,
                      gridRow: `${startSlot + 1} / span ${span}`,
                    }}
                  >
                    <div className="flex items-start gap-1">
                      <p className={`min-w-0 flex-1 truncate text-[11px] font-semibold ${accent.title}`}>
                        {meeting.title || "Untitled meeting"}
                      </p>
                      <span className={`flex shrink-0 items-center gap-0.5 text-[8px] ${accent.meta}`}>
                        {meeting.kind === "personal" && <Lock className="mr-0.5 h-2.5 w-2.5" />}
                        <Star className="h-2.5 w-2.5 fill-current" />
                        {meeting.importance || 2}
                      </span>
                    </div>
                    <p className={`truncate text-[9px] ${accent.meta}`}>{formatTime(meeting.time)}</p>
                    {span >= 3 && meeting.agenda && (
                      <p className={`mt-1 line-clamp-2 text-[9px] leading-relaxed ${accent.muted}`}>
                        {meeting.agenda}
                      </p>
                    )}
                  </MovableMeetingCard>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MonthGrid({
  anchorDate,
  meetings,
  onSelectMeeting,
  onSelectDay,
  onMoveMeeting,
}: {
  anchorDate: Date;
  meetings: Meeting[];
  onSelectMeeting: (meeting: Meeting) => void;
  onSelectDay: (date: string) => void;
  onMoveMeeting: (meetingId: string, date: string, time: string) => void;
}) {
  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const calendarStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index));
  const todayKey = dateToKey(new Date());
  const meetingsByDate = useMemo(() => {
    const grouped = new Map<string, Meeting[]>();
    for (const meeting of meetings) {
      const current = grouped.get(meeting.date) || [];
      current.push(meeting);
      grouped.set(meeting.date, current);
    }
    for (const current of grouped.values()) {
      current.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    }
    return grouped;
  }, [meetings]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-950/70">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
            <div key={day} className="border-r border-zinc-800 px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-500 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map(day => {
            const key = dateToKey(day);
            const dayMeetings = meetingsByDate.get(key) || [];
            const inCurrentMonth = day.getMonth() === anchorDate.getMonth();
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                data-schedule-date={key}
                onClick={() => onSelectDay(key)}
                onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                    onSelectDay(key);
                  }
                }}
                className="group min-h-28 cursor-pointer border-b border-r border-zinc-800/80 p-1.5 transition-colors hover:bg-[#53589A]/10 focus:bg-[#53589A]/10 focus:outline-none"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                    key === todayKey
                      ? "bg-[#53589A] font-semibold text-white"
                      : inCurrentMonth
                        ? "text-zinc-300"
                        : "text-zinc-700"
                  }`}>
                    {day.getDate()}
                  </span>
                  <Plus className="h-3 w-3 text-[#B8CEE2] opacity-0 transition-opacity group-hover:opacity-60" />
                </div>
                <div className="space-y-1">
                  {dayMeetings.slice(0, 3).map(meeting => (
                    <MovableMeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      onSelect={() => onSelectMeeting(meeting)}
                      onMove={onMoveMeeting}
                      className={`flex w-full items-center gap-1 rounded border px-1.5 py-1 text-left transition-colors ${getMeetingAccent(meeting).card}`}
                    >
                      <span className={`shrink-0 text-[8px] ${getMeetingAccent(meeting).meta}`}>{formatTime(meeting.time)}</span>
                      <span className={`truncate text-[9px] font-medium ${getMeetingAccent(meeting).title}`}>
                        {meeting.kind === "personal" ? "◆ " : ""}
                        {meeting.title || "Untitled"}
                      </span>
                    </MovableMeetingCard>
                  ))}
                  {dayMeetings.length > 3 && (
                    <p className="px-1 text-[9px] text-zinc-500">+{dayMeetings.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function YearGrid({
  anchorDate,
  meetings,
  onSelectDay,
  onSelectMonth,
}: {
  anchorDate: Date;
  meetings: Meeting[];
  onSelectDay: (date: string) => void;
  onSelectMonth: (date: Date) => void;
}) {
  const todayKey = dateToKey(new Date());
  const meetingsByDate = useMemo(() => {
    const grouped = new Map<string, Meeting[]>();
    for (const meeting of meetings) {
      grouped.set(meeting.date, [...(grouped.get(meeting.date) || []), meeting]);
    }
    return grouped;
  }, [meetings]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 12 }, (_, monthIndex) => {
        const monthStart = new Date(anchorDate.getFullYear(), monthIndex, 1);
        const calendarStart = startOfWeek(monthStart);
        const days = Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index));
        return (
          <Card key={monthIndex}>
            <CardContent className="p-3">
              <button
                type="button"
                onClick={() => onSelectMonth(monthStart)}
                className="mb-2 text-xs font-semibold text-zinc-300 hover:text-[#B8CEE2]"
              >
                {monthStart.toLocaleDateString("en-US", { month: "long" })}
              </button>
              <div className="mb-1 grid grid-cols-7">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                  <span key={`${day}-${index}`} className="text-center text-[8px] text-zinc-700">{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {days.map(day => {
                  const key = dateToKey(day);
                  const dayMeetings = meetingsByDate.get(key) || [];
                  const inMonth = day.getMonth() === monthIndex;
                  return (
                    <button
                      key={key}
                      type="button"
                      data-schedule-date={key}
                      onClick={() => onSelectDay(key)}
                      title={dayMeetings.map(meeting => meeting.title || "Untitled meeting").join(", ")}
                      className={`relative flex h-7 items-center justify-center rounded text-[9px] transition-colors hover:bg-[#53589A]/25 ${
                        key === todayKey
                          ? "bg-[#53589A] text-white"
                          : inMonth
                            ? "text-zinc-400"
                            : "text-zinc-800"
                      }`}
                    >
                      {day.getDate()}
                      {dayMeetings.length > 0 && (
                        <span className="absolute bottom-0.5 flex gap-px">
                          {dayMeetings.slice(0, 3).map(meeting => (
                            <span key={meeting.id} className={`h-1 w-1 rounded-full ${getMeetingAccent(meeting).swatch}`} />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PersonalTimeOverlay({
  date,
  time,
  onCreate,
  onClose,
}: {
  date: string;
  time: string;
  onCreate: (meetings: Meeting[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => createPersonalTimeDraft(date, time));
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const updateCategory = (category: PersonalCategory) => {
    const previousLabel = PERSONAL_CATEGORIES.find(option => option.value === draft.category)?.label || "";
    const next = PERSONAL_CATEGORIES.find(option => option.value === category)!;
    setDraft(current => ({
      ...current,
      category,
      title: !current.title.trim() || current.title === previousLabel ? next.label : current.title,
      accent: next.accent,
    }));
  };

  const updateStartDate = (nextDate: string) => {
    const previousDay = weekdayIndex(dateFromKey(draft.date));
    const nextDay = weekdayIndex(dateFromKey(nextDate));
    setDraft(current => ({
      ...current,
      date: nextDate,
      repeatUntil: current.repeatUntil < nextDate ? dateToKey(addMonths(dateFromKey(nextDate), 3)) : current.repeatUntil,
      weekdays: current.weekdays.length === 1 && current.weekdays[0] === previousDay
        ? [nextDay]
        : current.weekdays,
    }));
  };

  const toggleWeekday = (weekday: number) => {
    setDraft(current => {
      const selected = current.weekdays.includes(weekday);
      const weekdays = selected
        ? current.weekdays.filter(day => day !== weekday)
        : [...current.weekdays, weekday].sort();
      return { ...current, weekdays: weekdays.length > 0 ? weekdays : current.weekdays };
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="personal-time-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={event => {
          event.preventDefault();
          onCreate(createPersonalTimeOccurrences(draft));
        }}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/60"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-5 py-4 backdrop-blur">
          <h2 id="personal-time-title" className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            Personal time
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {PERSONAL_CATEGORIES.map(category => (
              <button
                key={category.value}
                type="button"
                aria-pressed={draft.category === category.value}
                onClick={() => updateCategory(category.value)}
                className={`rounded-lg border px-2 py-2 text-[10px] leading-tight transition-colors ${
                  draft.category === category.value
                    ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          <Input
            ref={titleRef}
            value={draft.title}
            required
            onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}
            placeholder="Personal time title"
            className="h-11 border-zinc-700 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-600"
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.25fr_1fr_1fr]">
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-[10px] text-zinc-500">Start date</Label>
              <Input
                type="date"
                required
                value={draft.date}
                onChange={event => updateStartDate(event.target.value)}
                className="mt-1 h-9 border-zinc-700 bg-zinc-900 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] text-zinc-500">Time</Label>
              <Input
                type="time"
                required
                step={SLOT_MINUTES * 60}
                value={draft.time}
                onChange={event => setDraft(current => ({ ...current, time: event.target.value }))}
                className="mt-1 h-9 border-zinc-700 bg-zinc-900 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] text-zinc-500">Duration</Label>
              <select
                value={draft.durationMinutes}
                onChange={event => setDraft(current => ({ ...current, durationMinutes: Number(event.target.value) }))}
                className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-300 outline-none"
              >
                {DURATION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/35 p-3">
            <Label className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <Repeat2 className="h-3 w-3" />
              Repeat
            </Label>
            <div className={`grid gap-2 ${draft.repeat === "none" ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-[1fr_90px_1fr]"}`}>
              <select
                value={draft.repeat}
                onChange={event => setDraft(current => ({ ...current, repeat: event.target.value as PersonalRepeat }))}
                className="h-9 self-end rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-300 outline-none"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="weekdays">Weekdays</option>
                <option value="custom">Custom days</option>
              </select>
              {draft.repeat !== "none" && (
                <>
                  <div>
                    <Label className="text-[9px] text-zinc-600">
                      Every ({draft.repeat === "daily" ? "days" : "weeks"})
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      aria-label="Repeat interval"
                      value={draft.interval}
                      onChange={event => setDraft(current => ({ ...current, interval: Number(event.target.value) }))}
                      className="mt-1 h-9 border-zinc-700 bg-zinc-950 text-xs"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-[9px] text-zinc-600">Until</Label>
                    <Input
                      type="date"
                      min={draft.date}
                      required
                      aria-label="Repeat until"
                      value={draft.repeatUntil}
                      onChange={event => setDraft(current => ({ ...current, repeatUntil: event.target.value }))}
                      className="mt-1 h-9 border-zinc-700 bg-zinc-950 text-xs"
                    />
                  </div>
                </>
              )}
            </div>
            {draft.repeat === "custom" && (
              <div className="flex gap-1">
                {WEEKDAYS.map((weekday, index) => (
                  <button
                    key={`${weekday.label}-${index}`}
                    type="button"
                    aria-label={`Toggle weekday ${index + 1}`}
                    aria-pressed={draft.weekdays.includes(weekday.value)}
                    onClick={() => toggleWeekday(weekday.value)}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] ${
                      draft.weekdays.includes(weekday.value)
                        ? "bg-[#53589A] text-white"
                        : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {weekday.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-0.5">
              {([1, 2, 3, 4, 5] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Set personal time importance ${value}`}
                  aria-pressed={draft.importance === value}
                  onClick={() => setDraft(current => ({ ...current, importance: value }))}
                  className={`rounded p-1 ${value <= draft.importance ? "text-amber-400" : "text-zinc-700"}`}
                >
                  <Star className={`h-3.5 w-3.5 ${value <= draft.importance ? "fill-current" : ""}`} />
                </button>
              ))}
            </div>
            <div className="flex max-w-52 flex-wrap items-center justify-end gap-1.5">
              {MEETING_ACCENTS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={`Use ${option.value} personal time accent`}
                  aria-pressed={draft.accent === option.value}
                  onClick={() => setDraft(current => ({ ...current, accent: option.value }))}
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    draft.accent === option.value ? "ring-1 ring-white/70 ring-offset-2 ring-offset-zinc-950" : ""
                  }`}
                >
                  <span className={`h-3.5 w-3.5 rounded-full ${option.swatch}`} />
                </button>
              ))}
            </div>
          </div>

          <Textarea
            value={draft.notes}
            onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))}
            placeholder="Notes"
            className="min-h-24 border-zinc-700 bg-zinc-900 text-xs text-zinc-300 placeholder:text-zinc-700"
          />
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-800 bg-zinc-950/95 px-5 py-3 backdrop-blur">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs text-zinc-400">
            Cancel
          </Button>
          <Button type="submit" size="sm" className="h-8 gap-1.5 px-4 text-xs">
            <Lock className="h-3.5 w-3.5" />
            Add personal time
          </Button>
        </div>
      </form>
    </div>
  );
}

function MeetingOverlay({
  meeting,
  isNew,
  people,
  projects,
  onChange,
  onSave,
  onDelete,
  onClose,
}: {
  meeting: Meeting;
  isNew: boolean;
  people: Person[];
  projects: Project[];
  onChange: (updates: Partial<Meeting>) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const toggleParticipant = (personId: string) => {
    const participants = meeting.participants || [];
    onChange({
      participants: participants.includes(personId)
        ? participants.filter(id => id !== personId)
        : [...participants, personId],
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-overlay-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/60"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-5 py-4 backdrop-blur">
          <h2 id="meeting-overlay-title" className="text-sm font-semibold text-zinc-100">{isNew ? "New meeting" : "Edit meeting"}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <Input
            ref={titleRef}
            value={meeting.title}
            onChange={event => onChange({ title: event.target.value })}
            placeholder="Meeting title"
            className="h-11 border-zinc-700 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-600"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-0.5">
              {([1, 2, 3, 4, 5] as const).map(value => {
                const selected = value <= (meeting.importance || 2);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`Set importance ${value}`}
                    aria-pressed={(meeting.importance || 2) === value}
                    onClick={() => onChange({ importance: value })}
                    className={`rounded p-1 transition-colors ${selected ? "text-amber-400" : "text-zinc-700 hover:text-zinc-500"}`}
                  >
                    <Star className={`h-3.5 w-3.5 ${selected ? "fill-current" : ""}`} />
                  </button>
                );
              })}
            </div>
            <div className="flex max-w-52 flex-wrap items-center justify-end gap-1.5">
              {MEETING_ACCENTS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={`Use ${option.value} accent`}
                  aria-pressed={(meeting.accent || "blue") === option.value}
                  onClick={() => onChange({ accent: option.value })}
                  className={`flex h-5 w-5 items-center justify-center rounded-full transition-transform ${
                    (meeting.accent || "blue") === option.value ? "ring-1 ring-white/70 ring-offset-2 ring-offset-zinc-950" : "hover:scale-110"
                  }`}
                >
                  <span className={`h-3.5 w-3.5 rounded-full ${option.swatch}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.25fr_1fr_1fr]">
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-[10px] text-zinc-500">Date</Label>
              <Input
                type="date"
                required
                value={meeting.date}
                onChange={event => onChange({ date: event.target.value })}
                className="mt-1 h-9 border-zinc-700 bg-zinc-900 text-xs text-zinc-200"
              />
            </div>
            <div>
              <Label className="text-[10px] text-zinc-500">Time</Label>
              <Input
                type="time"
                required
                step={SLOT_MINUTES * 60}
                value={meeting.time}
                onChange={event => onChange({ time: event.target.value })}
                className="mt-1 h-9 border-zinc-700 bg-zinc-900 text-xs text-zinc-200"
              />
            </div>
            <div>
              <Label className="text-[10px] text-zinc-500">Duration</Label>
              <select
                value={meeting.durationMinutes || 60}
                onChange={event => onChange({ durationMinutes: Number(event.target.value) })}
                className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-300 outline-none"
              >
                {DURATION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <AlignLeft className="h-3 w-3" />
              Agenda
            </Label>
            <Textarea
              value={meeting.agenda}
              onChange={event => onChange({ agenda: event.target.value })}
              placeholder="Agenda"
              className="mt-1 min-h-32 border-zinc-700 bg-zinc-900 text-sm text-zinc-200 placeholder:text-zinc-600"
            />
          </div>

          {!detailsOpen ? (
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Details
            </button>
          ) : (
            <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">Details</span>
                <button type="button" onClick={() => setDetailsOpen(false)} className="text-zinc-600 hover:text-zinc-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] text-zinc-500">Project</Label>
                  <select
                    value={meeting.relatedProjectId || ""}
                    onChange={event => onChange({ relatedProjectId: event.target.value || undefined })}
                    className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-300 outline-none"
                  >
                    <option value="">No project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.title || "Untitled"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-[10px] text-zinc-500">Reminder</Label>
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onChange({ reminder: !meeting.reminder })}
                      className={`flex h-9 items-center gap-1.5 rounded-md border px-2 text-xs ${
                        meeting.reminder
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border-zinc-700 bg-zinc-950 text-zinc-500"
                      }`}
                    >
                      <Bell className="h-3.5 w-3.5" />
                      {meeting.reminder ? "On" : "Off"}
                    </button>
                    {meeting.reminder && (
                      <select
                        value={meeting.reminderMinutes || 15}
                        onChange={event => onChange({ reminderMinutes: Number(event.target.value) })}
                        className="h-9 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-300 outline-none"
                      >
                        {REMINDER_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <Users className="h-3 w-3" />
                  Participants
                </Label>
                <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {people.length === 0 ? (
                    <span className="text-[10px] text-zinc-600">No connections</span>
                  ) : people.map(person => {
                    const selected = (meeting.participants || []).includes(person.id);
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => toggleParticipant(person.id)}
                        className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${
                          selected
                            ? "border-[#B8CEE2]/30 bg-[#53589A]/35 text-[#DCE7F1]"
                            : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {selected && <Check className="h-2.5 w-2.5" />}
                        {person.name || "Unnamed"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-[10px] text-zinc-500">Notes</Label>
                <Textarea
                  value={meeting.minutes}
                  onChange={event => onChange({ minutes: event.target.value })}
                  placeholder="Notes"
                  className="mt-1 min-h-24 border-zinc-700 bg-zinc-950 text-xs text-zinc-300 placeholder:text-zinc-700"
                />
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-zinc-800 bg-zinc-950/95 px-5 py-3 backdrop-blur">
          <div>
            {!isNew && (
              <Button type="button" variant="ghost" size="sm" onClick={onDelete} className="h-8 gap-1.5 text-xs text-red-400 hover:text-red-300">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs text-zinc-400">
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-8 px-4 text-xs">
              {isNew ? "Add meeting" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ScheduleHistory({
  meetings,
  onSelectMeeting,
}: {
  meetings: Meeting[];
  onSelectMeeting: (meeting: Meeting) => void;
}) {
  const now = Date.now();
  const pastMeetings = [...meetings]
    .filter(meeting => meetingTimestamp(meeting) < now)
    .sort((a, b) => meetingTimestamp(b) - meetingTimestamp(a))
    .slice(0, 12);

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-medium text-zinc-400">
        <History className="h-3.5 w-3.5" />
        History
        <span className="text-[10px] font-normal text-zinc-600">{pastMeetings.length}</span>
      </h3>
      <Card>
        <CardContent className="p-2">
          {pastMeetings.length === 0 ? (
            <div className="py-4 text-center text-xs text-zinc-700">—</div>
          ) : (
            <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
              {pastMeetings.map(meeting => {
                const accent = getMeetingAccent(meeting);
                return (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => onSelectMeeting(meeting)}
                    className="flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-zinc-900"
                  >
                    <span className={`h-7 w-1 shrink-0 rounded-full ${accent.swatch}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-zinc-300">
                        {meeting.kind === "personal" ? "◆ " : ""}
                        {meeting.title || "Untitled meeting"}
                      </span>
                      <span className="block text-[9px] text-zinc-600">
                        {dateFromKey(meeting.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}
                        {formatTime(meeting.time)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5 text-[9px] text-amber-500/70">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      {meeting.importance || 2}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export function MeetingPage() {
  const { meetings, setMeetings, people, projects } = useData();
  const [view, setView] = useState<ScheduleView>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [draft, setDraft] = useState<Meeting | null>(null);
  const [personalTimeStart, setPersonalTimeStart] = useState<{ date: string; time: string } | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [importanceFilter, setImportanceFilter] = useState<"all" | "1" | "2" | "3" | "4" | "5">("all");
  const [showTelegramSettings, setShowTelegramSettings] = useState(false);

  const filteredMeetings = useMemo(() => {
    const words = searchQuery.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const now = Date.now();
    return meetings.filter(meeting => {
      const timestamp = meetingTimestamp(meeting);
      if (scheduleFilter === "upcoming" && timestamp < now) return false;
      if (scheduleFilter === "past" && timestamp >= now) return false;
      if (importanceFilter !== "all" && (meeting.importance || 2) !== Number(importanceFilter)) return false;

      const projectName = meeting.relatedProjectId
        ? projects.find(project => project.id === meeting.relatedProjectId)?.title || ""
        : "";
      const participantNames = (meeting.participants || [])
        .map(personId => people.find(person => person.id === personId)?.name || "")
        .join(" ");
      const searchableText = [
        meeting.title,
        meeting.agenda,
        meeting.minutes,
        PERSONAL_CATEGORIES.find(category => category.value === meeting.personalCategory)?.label || "",
        projectName,
        participantNames,
      ].join(" ").toLocaleLowerCase();
      return words.every(word => searchableText.includes(word));
    });
  }, [importanceFilter, meetings, people, projects, scheduleFilter, searchQuery]);

  const overviewMeetings = useMemo(
    () => filteredMeetings.filter(meeting => meeting.kind !== "personal"),
    [filteredMeetings],
  );

  const visibleDays = useMemo(() => {
    if (view === "day") return [anchorDate];
    if (view === "week") {
      const start = startOfWeek(anchorDate);
      return Array.from({ length: 7 }, (_, index) => addDays(start, index));
    }
    return [];
  }, [anchorDate, view]);

  const openNewMeeting = useCallback((date: string, time: string) => {
    setDraft(createMeeting(date, time));
    setIsNew(true);
  }, []);

  const openMeeting = useCallback((meeting: Meeting) => {
    setDraft({ ...meeting, participants: [...(meeting.participants || [])] });
    setIsNew(false);
  }, []);

  const closeOverlay = useCallback(() => setDraft(null), []);

  const saveMeeting = useCallback(() => {
    if (!draft || !draft.date || !draft.time) return;
    const savedMeeting = {
      ...draft,
      title: draft.title.trim() || "Untitled meeting",
      durationMinutes: draft.durationMinutes || 60,
    };
    if (isNew) {
      setMeetings(previous => [...previous, savedMeeting]);
    } else {
      setMeetings(previous => previous.map(meeting => meeting.id === savedMeeting.id ? savedMeeting : meeting));
    }
    setAnchorDate(dateFromKey(savedMeeting.date));
    setDraft(null);
  }, [draft, isNew, setMeetings]);

  const deleteMeeting = useCallback(() => {
    if (!draft) return;
    setMeetings(previous => previous.filter(meeting => meeting.id !== draft.id));
    setDraft(null);
  }, [draft, setMeetings]);

  const moveMeeting = useCallback((meetingId: string, date: string, time: string) => {
    setMeetings(previous => previous.map(meeting =>
      meeting.id === meetingId ? { ...meeting, date, time } : meeting
    ));
  }, [setMeetings]);

  const movePeriod = (direction: -1 | 1) => {
    setAnchorDate(current => {
      if (view === "month") return addMonths(current, direction);
      if (view === "year") return addMonths(current, direction * 12);
      return addDays(current, direction * (view === "week" ? 7 : 1));
    });
  };

  const openPersonalTime = () => {
    setPersonalTimeStart({
      date: dateToKey(anchorDate),
      time: suggestedStartTime(anchorDate),
    });
  };

  const createPersonalTime = (occurrences: Meeting[]) => {
    if (occurrences.length === 0) return;
    setMeetings(previous => [...previous, ...occurrences]);
    setAnchorDate(dateFromKey(occurrences[0].date));
    setPersonalTimeStart(null);
  };

  return (
    <div className="fade-in space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-[#B8CEE2]/15 bg-[#53589A]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <CalendarDays className="h-4 w-4 text-[#B8CEE2]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Schedule</h2>
            <p className="truncate text-xs text-zinc-500">{viewTitle(view, anchorDate)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
            <Button variant="ghost" size="icon" onClick={() => movePeriod(-1)} className="h-7 w-7">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAnchorDate(new Date())} className="h-7 px-2.5 text-[11px]">
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={() => movePeriod(1)} className="h-7 w-7">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
            {VIEW_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setView(option.value)}
                className={`rounded-[7px] px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  view === option.value
                    ? "bg-[#53589A]/85 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_5px_16px_rgba(5,5,14,0.2)]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Button variant="outline" onClick={openPersonalTime} size="sm" className="h-8 gap-1.5 border-zinc-700 text-xs text-zinc-300">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            Personal time
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTelegramSettings(current => !current)}
            size="sm"
            aria-expanded={showTelegramSettings}
            className="h-8 gap-1.5 border-zinc-700 text-xs text-zinc-300"
          >
            <Bot className="h-3.5 w-3.5 text-[#B8CEE2]" />
            Telegram
          </Button>
        </div>
      </div>

      {showTelegramSettings && <TelegramReminderSettingsPanel />}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">Search meetings</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <Input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search meetings"
            className="h-8 border-zinc-800 bg-zinc-950 pl-8 pr-8 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear meeting search"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
        <select
          value={scheduleFilter}
          aria-label="Filter meetings by time"
          onChange={event => setScheduleFilter(event.target.value as ScheduleFilter)}
          className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 text-[11px] text-zinc-400 outline-none"
        >
          <option value="all">All meetings</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>
        <select
          value={importanceFilter}
          aria-label="Filter meetings by importance"
          onChange={event => setImportanceFilter(event.target.value as typeof importanceFilter)}
          className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 text-[11px] text-zinc-400 outline-none"
        >
          <option value="all">All stars</option>
          {[1, 2, 3, 4, 5].map(value => (
            <option key={value} value={value}>{value} star{value === 1 ? "" : "s"}</option>
          ))}
        </select>
      </div>

      {view === "year" ? (
        <YearGrid
          anchorDate={anchorDate}
          meetings={overviewMeetings}
          onSelectDay={date => openNewMeeting(date, "09:00")}
          onSelectMonth={date => {
            setAnchorDate(date);
            setView("month");
          }}
        />
      ) : view === "month" ? (
        <MonthGrid
          anchorDate={anchorDate}
          meetings={overviewMeetings}
          onSelectMeeting={openMeeting}
          onSelectDay={date => openNewMeeting(date, "09:00")}
          onMoveMeeting={moveMeeting}
        />
      ) : (
        <TimeGrid
          days={visibleDays}
          meetings={filteredMeetings}
          onSelectMeeting={openMeeting}
          onSelectSlot={openNewMeeting}
          onMoveMeeting={moveMeeting}
        />
      )}

      <ScheduleHistory meetings={filteredMeetings} onSelectMeeting={openMeeting} />

      {draft && (
        <MeetingOverlay
          key={draft.id}
          meeting={draft}
          isNew={isNew}
          people={people}
          projects={projects}
          onChange={updates => setDraft(current => current ? { ...current, ...updates } : current)}
          onSave={saveMeeting}
          onDelete={deleteMeeting}
          onClose={closeOverlay}
        />
      )}

      {personalTimeStart && (
        <PersonalTimeOverlay
          key={`${personalTimeStart.date}-${personalTimeStart.time}`}
          date={personalTimeStart.date}
          time={personalTimeStart.time}
          onCreate={createPersonalTime}
          onClose={() => setPersonalTimeStart(null)}
        />
      )}
    </div>
  );
}
