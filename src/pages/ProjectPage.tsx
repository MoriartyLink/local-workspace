import { useState, useCallback, useRef, useEffect } from "react";
import {
  Plus, Trash2, ChevronRight, ChevronDown, FolderKanban,
  Calendar, GripVertical, Check, ArrowRight,
  Milestone as MilestoneIcon, Archive, RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useData } from "@/contexts/DataContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getLocalDateKey } from "@/lib/dates";
import { getProjectIteration } from "@/lib/projectIterations";
import type { Project, KanbanCard, Milestone, KanbanColumnId, Person, HistoryEntry } from "@/types";
import { KANBAN_COLUMNS, PROJECT_COLORS } from "@/types";

function createProject(title = "", description = ""): Project {
  return { id: crypto.randomUUID(), title, description, startDate: getLocalDateKey(new Date()), color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)], milestones: [], cards: [], history: [], createdAt: new Date().toISOString(), archived: false };
}
function createCard(columnId: KanbanColumnId, order: number): KanbanCard {
  return { id: crypto.randomUUID(), title: "", description: "", columnId, priority: "medium", tags: [], dueDate: "", createdAt: new Date().toISOString(), completedAt: "", order, assignedTo: [], relatedMeetingId: "" };
}
function createMilestone(): Milestone {
  return { id: crypto.randomUUID(), title: "", description: "", targetDate: "", completed: false, completedAt: "" };
}

const PRIORITY_CONFIG = {
  low: { label: "Low", bg: "bg-zinc-800", text: "text-zinc-300" },
  medium: { label: "Med", bg: "bg-blue-500/15", text: "text-blue-400" },
  high: { label: "High", bg: "bg-amber-500/15", text: "text-amber-400" },
  urgent: { label: "Urgent", bg: "bg-red-500/15", text: "text-red-400" },
};

function ProjectIterationBadge({ project, compact = false }: { project: Project; compact?: boolean }) {
  const iteration = getProjectIteration(project.startDate, getLocalDateKey(new Date()));
  if (!iteration) {
    return <span className="text-[10px] text-zinc-500">Set a start date</span>;
  }
  if (iteration.status === "upcoming") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] text-amber-400">
        <Calendar className="h-3 w-3" />Starts in {iteration.daysUntilStart} {iteration.daysUntilStart === 1 ? "day" : "days"}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md bg-violet-500/10 text-violet-300 ${compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs"}`}>
      <Calendar className="h-3 w-3" />Iteration {iteration.iteration}<span className="text-violet-500">·</span>Week {iteration.week} of 6
    </span>
  );
}



// ── Kanban Card ──
function KanbanCardItem({ card, onUpdate, onDelete, onMove, onDragStart, onDragEnd, people }: {
  card: KanbanCard; onUpdate: (u: Partial<KanbanCard>) => void; onDelete: () => void; onMove: (to: KanbanColumnId) => void; onDragStart?: (e: React.DragEvent, id: string) => void; onDragEnd?: () => void; people: Person[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const pri = PRIORITY_CONFIG[card.priority];
  const nextCol = KANBAN_COLUMNS.findIndex((c) => c.id === card.columnId);
  const nextColumn = nextCol < KANBAN_COLUMNS.length - 1 ? KANBAN_COLUMNS[nextCol + 1] : null;
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [card.title]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPersonPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const togglePerson = (personId: string) => {
    const assigned = card.assignedTo.includes(personId)
      ? card.assignedTo.filter((id) => id !== personId)
      : [...card.assignedTo, personId];
    onUpdate({ assignedTo: assigned });
  };

  const getPersonName = (id: string) => people.find((p) => p.id === id)?.name || "Unknown";

  return (
    <div draggable={true} onDragStart={(e) => onDragStart?.(e, card.id)} onDragEnd={() => onDragEnd?.()} className="bg-zinc-950 rounded-lg border border-zinc-800 hover:border-zinc-700 shadow-sm transition-all duration-200 group cursor-grab active:cursor-grabbing break-words">
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2 break-words">
          <GripVertical className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0 cursor-grab" />
          <textarea ref={titleRef} rows={1} className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none font-medium min-w-0 break-words whitespace-normal resize-none overflow-hidden max-w-full" placeholder="Card title..." value={card.title} onChange={(e) => onUpdate({ title: e.target.value })} />
          <button onClick={() => setExpanded(!expanded)} className="text-zinc-500 hover:text-zinc-300 cursor-pointer shrink-0">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex items-center gap-2 pl-5 break-words">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${pri.bg} ${pri.text} font-medium`}>{pri.label}</span>
          {card.dueDate && <span className="text-[10px] text-zinc-400 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{new Date(card.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
          {nextColumn && <button onClick={() => onMove(nextColumn.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-[10px] text-zinc-400 hover:text-blue-400 cursor-pointer flex items-center gap-0.5 transition-all"><ArrowRight className="w-2.5 h-2.5" />{nextColumn.title}</button>}
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-zinc-800">
          <textarea className="w-full bg-zinc-900 rounded-md text-xs text-zinc-300 placeholder:text-zinc-600 p-2 outline-none resize-y min-h-[50px] border border-zinc-700 focus:border-blue-400 whitespace-pre-wrap break-words max-w-full" placeholder="Description..." value={card.description} onChange={(e) => onUpdate({ description: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[10px] text-zinc-400 block mb-1">Priority</label>
              <select className="w-full max-w-full bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-300 p-1.5 outline-none cursor-pointer" value={card.priority} onChange={(e) => onUpdate({ priority: e.target.value as KanbanCard["priority"] })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select></div>
            <div><label className="text-[10px] text-zinc-400 block mb-1">Due Date</label>
              <input type="date" className="w-full max-w-full bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-300 p-1.5 outline-none" value={card.dueDate} onChange={(e) => onUpdate({ dueDate: e.target.value })} /></div>
          </div>
          {/* Person Assignment */}
          <div className="relative" ref={pickerRef}>
            <label className="text-[10px] text-zinc-400 block mb-1">Assigned To</label>
            <button
              onClick={() => setShowPersonPicker(!showPersonPicker)}
              className="w-full text-left bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-300 p-1.5 outline-none cursor-pointer hover:border-zinc-500 transition-colors"
            >
              {card.assignedTo.length === 0
                ? <span className="text-zinc-500">Assign people...</span>
                : <span className="flex flex-wrap gap-1">{card.assignedTo.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-300 px-1.5 py-0.5 rounded text-[10px]">
                      {getPersonName(id)}
                    </span>
                  ))}</span>
              }
            </button>
            {showPersonPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                {people.length === 0 && <p className="text-[10px] text-zinc-500 text-center py-3">No people added yet.</p>}
                {people.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-800 cursor-pointer text-xs text-zinc-300 transition-colors">
                    <input type="checkbox" checked={card.assignedTo.includes(p.id)} onChange={() => togglePerson(p.id)} className="accent-blue-500" />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-between items-center pt-1">
            <select className="bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-300 p-1 outline-none cursor-pointer" value={card.columnId} onChange={(e) => onMove(e.target.value as KanbanColumnId)}>
              {KANBAN_COLUMNS.map((col) => <option key={col.id} value={col.id}>{col.title}</option>)}
            </select>
            <button onClick={onDelete} className="text-zinc-500 hover:text-red-400 cursor-pointer transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Project Detail ──
function ProjectDetail({ project, onUpdate, onBack }: { project: Project; onUpdate: (u: Partial<Project>) => void; onBack: () => void }) {
  const { people } = useData();
  const [showMilestones, setShowMilestones] = useState(true);
  const [editingInfo, setEditingInfo] = useState(!project.title);
  const dragCardId = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanColumnId | null>(null);

  const updateCard = (id: string, u: Partial<KanbanCard>) => onUpdate({ cards: project.cards.map((c) => c.id === id ? { ...c, ...u } : c) });
  const deleteCard = (id: string) => onUpdate({ cards: project.cards.filter((c) => c.id !== id) });
  const moveCard = (id: string, to: KanbanColumnId) => { const n = project.cards.filter((c) => c.columnId === to).length; onUpdate({ cards: project.cards.map((c) => c.id === id ? { ...c, columnId: to, order: n, completedAt: to === "done" ? new Date().toISOString() : "" } : c) }); };

  const handleDragStart = (e: React.DragEvent, id: string) => { dragCardId.current = id; e.dataTransfer.effectAllowed = "move"; };
  const handleDragEnd = () => { dragCardId.current = null; setDragOverCol(null); };
  const handleDragOver = (e: React.DragEvent, colId: KanbanColumnId) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCol(colId); };
  const handleDragLeave = () => { setDragOverCol(null); };
  const handleDrop = (e: React.DragEvent, colId: KanbanColumnId) => { e.preventDefault(); if (dragCardId.current) { moveCard(dragCardId.current, colId); dragCardId.current = null; } setDragOverCol(null); };
  const addCard = (col: KanbanColumnId) => { const n = project.cards.filter((c) => c.columnId === col).length; onUpdate({ cards: [...project.cards, createCard(col, n)] }); };
  const addMilestone = () => onUpdate({ milestones: [...project.milestones, createMilestone()] });
  const updateMs = (id: string, u: Partial<Milestone>) => onUpdate({ milestones: project.milestones.map((m) => m.id === id ? { ...m, ...u } : m) });
  const deleteMs = (id: string) => onUpdate({ milestones: project.milestones.filter((m) => m.id !== id) });
  const toggleMs = (id: string) => { const ms = project.milestones.find((m) => m.id === id); if (ms) updateMs(id, { completed: !ms.completed, completedAt: !ms.completed ? new Date().toISOString() : "" }); };

  const done = project.cards.filter((c) => c.columnId === "done").length;
  const total = project.cards.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const history = project.history || [];

  // ── 24hr history move: cards in "done" older than 24hr go to project history ──
  useEffect(() => {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const agedCards = project.cards.filter((c) => {
      if (c.columnId !== "done" || !c.completedAt) return false;
      return now - new Date(c.completedAt).getTime() >= twentyFourHours;
    });
    if (agedCards.length === 0) return;
    const historyEntries: HistoryEntry[] = agedCards.map((c) => ({
      id: crypto.randomUUID(),
      title: c.title,
      type: "task" as const,
      completedAt: c.completedAt,
      projectId: project.id,
      projectTitle: project.title,
      date: c.completedAt.split("T")[0],
      outcome: c.description,
    }));
    const agedIds = new Set(agedCards.map((c) => c.id));
    onUpdate({
      cards: project.cards.filter((c) => !agedIds.has(c.id)),
      history: [...history, ...historyEntries],
    });
  }, [project.cards, project.history, project.id, project.title, onUpdate]);

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-zinc-400"><ChevronRight className="w-3.5 h-3.5 rotate-180" />Back</Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
        {editingInfo ? (
          <div className="flex-1 flex items-center gap-2">
            <Input value={project.title} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Project name..." className="h-8 text-sm max-w-xs" autoFocus />
            <Button size="sm" variant="ghost" onClick={() => setEditingInfo(false)}><Check className="w-3.5 h-3.5" /></Button>
          </div>
        ) : <h2 className="text-xl font-bold text-zinc-100 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setEditingInfo(true)}>{project.title || "Untitled Project"}</h2>}
        <div className="ml-auto flex items-center gap-3 text-xs text-zinc-400">
          <ProjectIterationBadge project={project} />
          <span>{done}/{total} done</span><div className="w-24"><Progress value={pct} /></div><span className="text-blue-400 font-mono">{pct}%</span>
        </div>
      </div>

      {editingInfo && (
        <Card className="slide-in-left"><CardContent className="p-4 space-y-3">
          <div><Label className="text-xs">Description</Label><Textarea value={project.description} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="What is this project about?" className="mt-1 min-h-[60px] text-sm" /></div>
          <div className="max-w-xs">
            <Label htmlFor={`project-start-${project.id}`} className="text-xs">Project start date</Label>
            <Input
              id={`project-start-${project.id}`}
              type="date"
              value={project.startDate || ""}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
              className="mt-1 h-9 text-xs"
            />
            <p className="mt-1 text-[10px] text-zinc-500">Each iteration is six weeks from this date.</p>
          </div>
          <div><Label className="text-xs">Color</Label><div className="flex gap-2 mt-1.5">
            {PROJECT_COLORS.map((c) => <button key={c} onClick={() => onUpdate({ color: c })} className={`w-7 h-7 rounded-lg cursor-pointer transition-all duration-200 ${project.color === c ? "ring-2 ring-zinc-300 ring-offset-2 scale-110" : "hover:scale-110"}`} style={{ backgroundColor: c }} />)}
          </div></div>
        </CardContent></Card>
      )}

      {/* Milestones */}
      <Card>
        <CardHeader className="pb-2"><div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 cursor-pointer" onClick={() => setShowMilestones(!showMilestones)}>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center"><MilestoneIcon className="w-4 h-4 text-amber-400" /></div>Milestones
            <span className="text-xs text-zinc-400 font-normal ml-1">{project.milestones.filter((m) => m.completed).length}/{project.milestones.length}</span>
            {showMilestones ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={addMilestone} className="gap-1.5"><Plus className="w-3.5 h-3.5" />Add</Button>
        </div></CardHeader>
        {showMilestones && <CardContent className="space-y-2">
          {project.milestones.length === 0 ? <p className="text-xs text-zinc-400 text-center py-4">No milestones yet.</p> :
            project.milestones.map((ms) => (
              <div key={ms.id} className={`flex items-center gap-3 p-2.5 rounded-lg group transition-all ${ms.completed ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-zinc-900 border border-zinc-800"}`}>
                <button onClick={() => toggleMs(ms.id)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 ${ms.completed ? "bg-emerald-500 border-emerald-500" : "border-zinc-500 hover:border-blue-500"}`}>
                  {ms.completed && <Check className="w-3 h-3 text-white" />}
                </button>
                <input className={`flex-1 bg-transparent text-sm outline-none ${ms.completed ? "text-zinc-500 line-through" : "text-zinc-200"} placeholder:text-zinc-600`} placeholder="Milestone title..." value={ms.title} onChange={(e) => updateMs(ms.id, { title: e.target.value })} />
                <input type="date" className="bg-transparent text-xs text-zinc-400 outline-none w-28" value={ms.targetDate} onChange={(e) => updateMs(ms.id, { targetDate: e.target.value })} />
                <button onClick={() => deleteMs(ms.id)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 cursor-pointer transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
        </CardContent>}
      </Card>

      {/* Kanban */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center"><FolderKanban className="w-4 h-4 text-blue-400" /></div>
          <h3 className="text-base font-semibold text-zinc-100">Kanban Board</h3>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${KANBAN_COLUMNS.length}, minmax(0, 1fr))` }}>
          {KANBAN_COLUMNS.map((col) => {
            const colCards = project.cards.filter((c) => c.columnId === col.id).sort((a, b) => a.order - b.order);
            const isOver = dragOverCol === col.id;
            return (
              <div key={col.id} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{col.title}</span>
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md font-mono">{colCards.length}</span>
                  </div>
                  <button onClick={() => addCard(col.id)} className="text-zinc-500 hover:text-blue-400 cursor-pointer transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <div
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`space-y-2 min-h-[100px] p-2 rounded-xl bg-zinc-950 border transition-all duration-200 ${isOver ? "border-blue-500/60 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.12)]" : "border-zinc-800"}`}
                >
                  {colCards.map((card) => <KanbanCardItem key={card.id} card={card} onUpdate={(u) => updateCard(card.id, u)} onDelete={() => deleteCard(card.id)} onMove={(to) => moveCard(card.id, to)} onDragStart={handleDragStart} onDragEnd={handleDragEnd} people={people} />)}
                  {colCards.length === 0 && <div className={`flex items-center justify-center h-16 text-[10px] ${isOver ? "text-blue-400" : "text-zinc-500"}`}>
                    {isOver ? <span className="flex items-center gap-1">Drop here</span> : <button onClick={() => addCard(col.id)} className="cursor-pointer hover:text-zinc-300 transition-colors flex items-center gap-1"><Plus className="w-3 h-3" />Add card</button>}
                  </div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center"><Archive className="w-4 h-4 text-purple-400" /></div>
          <h3 className="text-base font-semibold text-zinc-100">History</h3>
          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md font-mono">{history.length}</span>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6 bg-zinc-950 rounded-xl border border-zinc-800">Cards moved to history after 24 hours in "Done".</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {[...project.history].reverse().map((entry) => (
              <Card key={entry.id} className="border-zinc-800 bg-zinc-950/50">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-zinc-300 truncate">{entry.title}</h4>
                    <span className="text-[10px] text-zinc-500 shrink-0">{new Date(entry.completedAt).toLocaleDateString()}</span>
                  </div>
                  {entry.outcome && <p className="text-[10px] text-zinc-500 line-clamp-2">{entry.outcome}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Project List ──
function ProjectList({ onSelect, onAdd }: { onSelect: (id: string) => void; onAdd: (title?: string, desc?: string) => void }) {
  const { projects, setProjects } = useData();
  const [showArchived, setShowArchived] = useState(false);
  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  const archive = (id: string) => setProjects((prev) => prev.map((p) => p.id === id ? { ...p, archived: true } : p));
  const unarchive = (id: string) => setProjects((prev) => prev.map((p) => p.id === id ? { ...p, archived: false } : p));

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Projects</h2><p className="text-sm text-zinc-400 mt-0.5">Manage projects with Kanban boards</p></div>
        <Button onClick={() => onAdd()} className="gap-1.5"><Plus className="w-4 h-4" />New Project</Button>
      </div>

      {active.length === 0 ? (
        <Card className="glow-blue-subtle"><CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4"><FolderKanban className="w-8 h-8 text-blue-400" /></div>
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">No Projects Yet</h3>
          <p className="text-sm text-zinc-400 text-center max-w-sm">Create your first project to start tracking milestones with a Kanban board.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {active.map((project) => {
            const done = project.cards.filter((c) => c.columnId === "done").length;
            const total = project.cards.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const msDone = project.milestones.filter((m) => m.completed).length;
            return (
              <Card key={project.id} className="group cursor-pointer hover:border-zinc-700 hover:shadow-md transition-all duration-300" onClick={() => onSelect(project.id)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} /><h3 className="font-semibold text-zinc-100 text-sm">{project.title || "Untitled Project"}</h3></div>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  </div>
                  {project.description && <p className="text-xs text-zinc-400 line-clamp-2">{project.description}</p>}
                  <ProjectIterationBadge project={project} compact />
                  <div className="flex items-center gap-4 text-xs text-zinc-400"><span>{total} cards</span><span>{msDone}/{project.milestones.length} milestones</span></div>
                  <div className="space-y-1.5"><div className="flex justify-between text-xs"><span className="text-zinc-400">Progress</span><span className="text-blue-400 font-mono">{pct}%</span></div><Progress value={pct} /></div>
                  <button onClick={(e) => { e.stopPropagation(); archive(project.id); }} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1 mt-1"><Archive className="w-3 h-3" />Archive</button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {archived.length > 0 && <div>
        <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-300 cursor-pointer transition-colors">
          {showArchived ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}{archived.length} archived
        </button>
        {showArchived && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3 opacity-60">
          {archived.map((p) => <Card key={p.id} className="border-zinc-800"><CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full opacity-50" style={{ backgroundColor: p.color }} /><span className="text-sm text-zinc-400">{p.title || "Untitled"}</span></div>
            <button onClick={() => unarchive(p.id)} className="text-[10px] text-zinc-400 hover:text-zinc-300 cursor-pointer flex items-center gap-1"><RotateCcw className="w-3 h-3" />Restore</button>
          </CardContent></Card>)}
        </div>}
      </div>}
    </div>
  );
}

// ── Main ──
export function ProjectPage() {
  const { projects, setProjects } = useData();
  const [selectedId, setSelectedId] = useLocalStorage<string | null>("project-selected", null);
  const selected = projects.find((p) => p.id === selectedId) || null;

  const addProject = useCallback((title?: string, desc?: string) => {
    const p = createProject(title, desc);
    setProjects((prev) => [...prev, p]);
    setSelectedId(p.id);
  }, [setProjects, setSelectedId]);

  const updateProject = useCallback((id: string, u: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, ...u } : p));
  }, [setProjects]);

  if (selected) return <ProjectDetail project={selected} onUpdate={(u) => updateProject(selected.id, u)} onBack={() => setSelectedId(null)} />;
  return <ProjectList onSelect={setSelectedId} onAdd={addProject} />;
}
