import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Bell, BellOff, FileText, Users, Plus, Trash2, ChevronRight, ArrowLeft, CheckCircle2, ListChecks, Bot, Send, Search, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useData } from "@/contexts/DataContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Meeting } from "@/types";
import type { TelegramReminderSettings } from "@/types/electron";

const REMINDER_OPTIONS = [
  { value: 0, label: "At meeting time" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

function createMeeting(): Meeting {
  return {
    id: crypto.randomUUID(),
    title: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    reminder: false,
    agenda: "",
    minutes: "",
    participants: [],
    createdAt: new Date().toISOString(),
  };
}

function formatDateLong(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function isUpcoming(date: string, time: string): boolean {
  if (!date) return false;
  const now = new Date();
  const meetingDate = new Date(date + "T" + (time || "00:00"));
  return meetingDate > now;
}

function getPersonName(people: { id: string; name: string }[], id: string): string {
  const p = people.find((p) => p.id === id);
  return p?.name || "Unknown";
}

function TelegramReminderSettingsCard() {
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
      .then((loaded) => {
        if (!active) return;
        setSettings(loaded);
        setChatId(loaded.chatId);
        setStatus("idle");
      })
      .catch(() => {
        if (!active) return;
        setFeedback({ kind: "error", text: "Could not load Telegram reminder settings." });
        setStatus("idle");
      });
    return () => { active = false; };
  }, []);

  const saveSettings = async () => {
    const api = window.electronAPI;
    if (!api) return;
    if (settings.enabled && !chatId.trim()) {
      setFeedback({ kind: "error", text: "Add or discover a chat before enabling reminders." });
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
      setFeedback({ kind: "success", text: "Telegram reminder settings saved." });
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
        setFeedback({ kind: "success", text: `${result.message} Save settings to use this chat.` });
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
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Could not send the test reminder." });
    } finally {
      setStatus("idle");
    }
  };

  const configured = settings.botConfigured || Boolean(botToken.trim());

  return (
    <Card className="border-blue-500/20 bg-blue-500/[0.025]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm text-zinc-100">
            <Bot className="h-4 w-4 text-sky-400" />
            Telegram meeting reminders
          </CardTitle>
          <span className={`rounded-full px-2 py-1 text-[10px] ${
            settings.enabled && configured && chatId
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-zinc-800 text-zinc-500"
          }`}>
            {settings.enabled && configured && chatId ? "Active" : "Not active"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!desktopAvailable ? (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
            Telegram reminders require the Electron desktop app so the bot token stays out of browser storage.
          </p>
        ) : (
          <>
            <p className="text-xs leading-relaxed text-zinc-500">
              Create a bot with @BotFather, send the bot a message, paste its token, then use “Find chat.”
              Reminders are checked while Local Workspace is running.
            </p>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_0.8fr]">
              <div>
                <Label className="text-xs text-zinc-400">Bot token</Label>
                <Input
                  type="password"
                  autoComplete="off"
                  value={botToken}
                  onChange={(event) => setBotToken(event.target.value)}
                  placeholder={settings.botConfigured ? "Saved — leave blank to keep" : "Token from @BotFather"}
                  className="mt-1.5 h-9 bg-zinc-900 text-xs text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Chat ID</Label>
                <Input
                  value={chatId}
                  onChange={(event) => setChatId(event.target.value)}
                  placeholder="Find or enter chat ID"
                  className="mt-1.5 h-9 bg-zinc-900 text-xs text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Default reminder</Label>
                <select
                  value={settings.defaultReminderMinutes}
                  onChange={(event) => setSettings(current => ({
                    ...current,
                    defaultReminderMinutes: Number(event.target.value),
                  }))}
                  className="mt-1.5 h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-300 outline-none"
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
                  settings.enabled ? "bg-emerald-500" : "bg-zinc-700"
                }`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    settings.enabled ? "translate-x-[18px]" : "translate-x-0.5"
                  }`} />
                </span>
                Enable Telegram reminders
              </button>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={findChat}
                  disabled={status !== "idle" || (!configured)}
                  className="h-8 gap-1.5 border-zinc-700 text-xs"
                >
                  {status === "finding" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Find chat
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={sendTest}
                  disabled={status !== "idle" || !configured || !chatId.trim()}
                  className="h-8 gap-1.5 border-zinc-700 text-xs"
                >
                  {status === "testing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send test
                </Button>
                <Button type="button" size="sm" onClick={saveSettings} disabled={status !== "idle"} className="h-8 gap-1.5 text-xs">
                  {status === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
              <span className="flex items-center gap-1 text-zinc-600">
                <ShieldCheck className="h-3 w-3" />
                {settings.secureStorageAvailable
                  ? "Bot token is encrypted with operating-system storage."
                  : "Bot token is stored only in this app's local settings."}
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

function MeetingDetail({ meeting, people, projects, onUpdate, onDelete, onBack }: {
  meeting: Meeting;
  people: { id: string; name: string }[];
  projects: { id: string; title: string }[];
  onUpdate: (u: Partial<Meeting>) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const toggleParticipant = (personId: string) => {
    const current = meeting.participants || [];
    const next = current.includes(personId)
      ? current.filter((id) => id !== personId)
      : [...current, personId];
    onUpdate({ participants: next });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
              {meeting.title || "New Meeting"}
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              {meeting.date ? formatDateLong(meeting.date) : "No date set"}
              {meeting.time ? ` at ${meeting.time}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isUpcoming(meeting.date, meeting.time) && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Upcoming
            </span>
          )}
          <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-xs border-red-800 text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-zinc-100">
                <ListChecks className="w-4 h-4 text-blue-400" />
                Agenda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Meeting agenda items..."
                value={meeting.agenda}
                onChange={(e) => onUpdate({ agenda: e.target.value })}
                className="min-h-[150px] text-sm bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-zinc-100">
                <FileText className="w-4 h-4 text-amber-400" />
                Meeting Minutes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Record meeting notes, decisions, action items..."
                value={meeting.minutes}
                onChange={(e) => onUpdate({ minutes: e.target.value })}
                className="min-h-[200px] text-sm bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-zinc-100">
                <FileText className="w-4 h-4 text-emerald-400" />
                Related Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={meeting.relatedProjectId || ""}
                onChange={(e) => onUpdate({ relatedProjectId: e.target.value || undefined })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-300 px-3 py-2 outline-none cursor-pointer"
              >
                <option value="">No project linked</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title || "Untitled"}</option>
                ))}
              </select>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-100">Meeting Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-zinc-400">Title</Label>
                <Input value={meeting.title} onChange={(e) => onUpdate({ title: e.target.value })}
                  placeholder="Meeting title..."
                  className="mt-1.5 h-9 text-xs bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Date</Label>
                <Input type="date" value={meeting.date} onChange={(e) => onUpdate({ date: e.target.value })}
                  className="mt-1.5 h-9 text-xs bg-zinc-900 border-zinc-700 text-zinc-200" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Time</Label>
                <Input type="time" value={meeting.time} onChange={(e) => onUpdate({ time: e.target.value })}
                  className="mt-1.5 h-9 text-xs bg-zinc-900 border-zinc-700 text-zinc-200" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-400 cursor-pointer">Reminder</Label>
                <button
                  onClick={() => onUpdate({ reminder: !meeting.reminder })}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    meeting.reminder ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  title={meeting.reminder ? "Reminder on" : "Reminder off"}
                >
                  {meeting.reminder ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
              </div>
              {meeting.reminder && (
                <div className="space-y-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-2.5">
                  <Label className="text-[10px] text-emerald-300/80">Telegram reminder time</Label>
                  <select
                    value={meeting.reminderMinutes ?? ""}
                    onChange={(event) => onUpdate({
                      reminderMinutes: event.target.value === "" ? undefined : Number(event.target.value),
                    })}
                    className="h-8 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-300 outline-none"
                  >
                    <option value="">Use Telegram default</option>
                    {REMINDER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <p className="text-[9px] leading-relaxed text-zinc-500">
                    Sent to the configured Telegram chat while Local Workspace is running.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-zinc-100">
                <Users className="w-4 h-4 text-blue-400" />
                Participants
                <span className="text-xs text-zinc-500 font-normal ml-1">
                  {(meeting.participants || []).length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {people.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">
                  No people added yet. Add people from the People tab first.
                </p>
              ) : (
                <div className="space-y-1 max-h-[250px] overflow-y-auto">
                  {people.map((person) => {
                    const isSelected = (meeting.participants || []).includes(person.id);
                    return (
                      <button key={person.id} onClick={() => toggleParticipant(person.id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent"
                        }`}>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "bg-blue-500" : "bg-zinc-600"}`} />
                        <span className="truncate flex-1">{person.name}</span>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MeetingList({ meetings, people, projects, onSelect, onAdd }: {
  meetings: Meeting[];
  people: { id: string; name: string }[];
  projects: { id: string; title: string }[];
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  const sorted = useMemo(() => {
    return [...meetings].sort((a, b) => {
      const dateA = a.date + "T" + (a.time || "00:00");
      const dateB = b.date + "T" + (b.time || "00:00");
      return dateB.localeCompare(dateA);
    });
  }, [meetings]);

  const upcoming = sorted.filter((m) => isUpcoming(m.date, m.time));
  const past = sorted.filter((m) => !isUpcoming(m.date, m.time) || !m.date);

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Meetings</h2>
          <p className="text-sm text-zinc-400 mt-0.5">Manage meetings, agendas, minutes, and participants</p>
        </div>
        <Button onClick={onAdd} className="gap-2">
          <Plus className="w-4 h-4" /> New Meeting
        </Button>
      </div>

      <TelegramReminderSettingsCard />

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">No Meetings Yet</h3>
            <p className="text-sm text-zinc-400 text-center max-w-sm">
              Create your first meeting to start tracking agendas, minutes, and participants.
            </p>
            <Button onClick={onAdd} className="mt-4 gap-2">
              <Plus className="w-4 h-4" /> Create Meeting
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Upcoming ({upcoming.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcoming.map((m) => (
                  <MeetingCard key={m.id} meeting={m} people={people} projects={projects} onSelect={() => onSelect(m.id)} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-400">Past Meetings ({past.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {past.map((m) => (
                  <MeetingCard key={m.id} meeting={m} people={people} projects={projects} onSelect={() => onSelect(m.id)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MeetingCard({ meeting, people, projects, onSelect }: {
  meeting: Meeting;
  people: { id: string; name: string }[];
  projects: { id: string; title: string }[];
  onSelect: () => void;
}) {
  const upcoming = isUpcoming(meeting.date, meeting.time);
  const relatedProject = meeting.relatedProjectId ? projects.find(p => p.id === meeting.relatedProjectId) : null;
  return (
    <Card className="group cursor-pointer hover:border-zinc-700 hover:shadow-md transition-all duration-300" onClick={onSelect}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-zinc-100 text-sm truncate">
              {meeting.title || "Untitled Meeting"}
            </h3>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                <Calendar className="w-3 h-3" />
                {meeting.date ? formatDateLong(meeting.date) : "No date"}
              </span>
              {meeting.time && (
                <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                  <Clock className="w-3 h-3" />{meeting.time}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0 ml-2" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {relatedProject && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
              <FileText className="w-2.5 h-2.5" />{relatedProject.title}
            </span>
          )}
          {upcoming && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-500" />Upcoming
            </span>
          )}
          {meeting.reminder && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 flex items-center gap-1">
              <Bell className="w-2.5 h-2.5" />Reminder
            </span>
          )}
          {(meeting.participants || []).length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 flex items-center gap-1">
              <Users className="w-2.5 h-2.5" />{(meeting.participants || []).length}
            </span>
          )}
        </div>
        {meeting.agenda && (
          <p className="text-xs text-zinc-500 line-clamp-2">{meeting.agenda}</p>
        )}
        {(meeting.participants || []).length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {meeting.participants.slice(0, 3).map((pid) => (
              <span key={pid} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                {getPersonName(people, pid)}
              </span>
            ))}
            {(meeting.participants || []).length > 3 && (
              <span className="text-[10px] text-zinc-500">+{(meeting.participants || []).length - 3}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MeetingPage() {
  const { meetings, setMeetings, people, projects } = useData();
  const [selectedId, setSelectedId] = useLocalStorage<string | null>("meeting-selected", null);
  const selected = meetings.find((m) => m.id === selectedId) || null;

  const addMeeting = useCallback(() => {
    const m = createMeeting();
    setMeetings((prev) => [...prev, m]);
    setSelectedId(m.id);
  }, [setMeetings, setSelectedId]);

  const updateMeeting = useCallback((id: string, u: Partial<Meeting>) => {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...u } : m)));
  }, [setMeetings]);

  const deleteMeeting = useCallback((id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    setSelectedId(null);
  }, [setMeetings, setSelectedId]);

  if (selected) {
    return (
      <MeetingDetail
        meeting={selected}
        people={people}
        projects={projects}
        onUpdate={(u) => updateMeeting(selected.id, u)}
        onDelete={() => deleteMeeting(selected.id)}
        onBack={() => setSelectedId(null)}
      />
    );
  }
  return <MeetingList meetings={meetings} people={people} projects={projects} onSelect={setSelectedId} onAdd={addMeeting} />;
}
