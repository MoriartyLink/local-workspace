import { useState, useCallback, useRef, useEffect } from "react";
import { Plus, Trash2, Brain, Heart, ChevronLeft, ChevronRight, CheckCircle2, Download, RefreshCw, FolderKanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useData } from "@/contexts/DataContext";
import type { DailyEntry, Task, PhysicalStatus, Project } from "@/types";

function getDateString(d: Date) { return d.toISOString().split("T")[0]; }
function formatDateLong(d: Date) { return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); }

function createEmptyEntry(date: string): DailyEntry {
  return { id: crypto.randomUUID(), date, tasks: [], mentalStatus: { morning: 2, afternoon: 2, night: 2 }, physicalStatus: "good", physicalNote: "", mentalNote: "", journal: "", bestThing: "", proudThings: "", lessonLearned: "", lessonChange: "", excitedAbout: "", happyToday: "", surprisedCanDo: "", happyIfProgress: "", notHappyToday: "" };
}
function createEmptyTask(): Task {
  return { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), task: "", outcome: "", system: "", mission: "", assignedTo: [], completed: false };
}

function TaskField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent text-zinc-200 placeholder:text-zinc-600 outline-none text-[13px] p-0 border-none resize-none overflow-hidden break-words whitespace-normal"
    />
  );
}

function generateMarkdown(entry: DailyEntry, date: Date): string {
  const lines: string[] = [];
  lines.push(`# Daily Journal — ${formatDateLong(date)}`);
  lines.push("");

  // Tasks
  lines.push("## Tasks");
  lines.push("");
  if (entry.tasks.length === 0) {
    lines.push("_No tasks recorded._");
  } else {
    for (const t of entry.tasks) {
      if (!t.task.trim()) continue;
      const check = t.completed ? "x" : " ";
      lines.push(`- [${check}] **${t.task}**`);
      if (t.outcome.trim()) lines.push(`  - **Outcome:** ${t.outcome}`);
      if (t.system.trim()) lines.push(`  - **System:** ${t.system}`);
      if (t.mission.trim()) lines.push(`  - **Mission:** ${t.mission}`);
    }
    const done = entry.tasks.filter((t) => t.completed).length;
    lines.push("");
    lines.push(`> **Completion:** ${done}/${entry.tasks.length} (${entry.tasks.length > 0 ? Math.round((done / entry.tasks.length) * 100) : 0}%)`);
  }
  lines.push("");

  // Mental Reflection
  lines.push("## Mental Reflection");
  lines.push("");
  if (entry.happyToday.trim()) {
    lines.push("**🙏 I am already happy with what I have today:** " + entry.happyToday);
    lines.push("");
  }
  if (entry.surprisedCanDo.trim()) {
    lines.push("**😮 I am surprised to see that I can do:** " + entry.surprisedCanDo);
    lines.push("");
  }
  if (entry.happyIfProgress.trim()) {
    lines.push("**🎯 I will be happy if I make progress in this area:** " + entry.happyIfProgress);
    lines.push("");
  }
  if (entry.notHappyToday.trim()) {
    lines.push("**💪 I am not happy with what I have today:** " + entry.notHappyToday);
    lines.push("");
  }

  // Physical Status
  lines.push("## Physical Status");
  lines.push("");
  lines.push(`**Status:** ${entry.physicalStatus.charAt(0).toUpperCase() + entry.physicalStatus.slice(1)}`);
  if (entry.physicalNote.trim()) {
    lines.push("");
    lines.push(`**Note:** ${entry.physicalNote}`);
  }
  lines.push("");

  // Journal
  if (entry.journal.trim()) {
    lines.push("## Journal");
    lines.push("");
    lines.push(entry.journal);
    lines.push("");
  }

  // Reflective Questions
  if (entry.bestThing.trim() || entry.proudThings.trim() || entry.lessonLearned.trim() || entry.lessonChange.trim() || entry.excitedAbout.trim()) {
    lines.push("## Reflective Questions");
    lines.push("");
    if (entry.bestThing.trim()) {
      lines.push(`**What is the best thing that happened today?** ${entry.bestThing}`);
      lines.push("");
    }
    if (entry.proudThings.trim()) {
      lines.push(`**What things make you proud today?** ${entry.proudThings}`);
      lines.push("");
    }
    if (entry.lessonLearned.trim()) {
      lines.push(`**What lesson did I learn today?** ${entry.lessonLearned}`);
      lines.push("");
    }
    if (entry.lessonChange.trim()) {
      lines.push(`**What will be changed by this lesson?** ${entry.lessonChange}`);
      lines.push("");
    }
    if (entry.excitedAbout.trim()) {
      lines.push(`**What makes you excited today?** ${entry.excitedAbout}`);
      lines.push("");
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`_Generated by Daily Tracker on ${new Date().toLocaleString()}_`);
  return lines.join("\n");
}

function downloadMd(content: string, filename: string) {
  try {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error("Error in downloadMd:", error);
    throw error;
  }
}

export function JournalPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateKey = getDateString(currentDate);
  const { entries, updateEntry, projects, setProjects } = useData();
  const entry = entries[dateKey] || createEmptyEntry(dateKey);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const save = useCallback(async (updates: Partial<DailyEntry>) => {
    const updatedEntry = { ...entry, ...updates };
    updateEntry(dateKey, updatedEntry);
    setSaveStatus("saving");
    try {
      // Wait for the state update to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus("idle");
    }
  }, [dateKey, entry, updateEntry]);

  const addTask = () => save({ tasks: [...entry.tasks, createEmptyTask()] });
  const updateTask = (id: string, field: keyof Task, value: string | boolean) => {
    const task = entry.tasks.find(t => t.id === id);
    save({ tasks: entry.tasks.map((t) => t.id === id ? { ...t, [field]: value } : t) });
    // If completing a task that was linked from a project card, move that card to done
    if (field === 'completed' && value === true && task?.projectCardId) {
      const targetProject = projects.find(p => p.cards.some(c => c.id === task.projectCardId));
      if (targetProject) {
        setProjects((prev: Project[]) => prev.map((p: Project) => p.id === targetProject.id ? {
          ...p,
          cards: p.cards.map((c: any) => c.id === task.projectCardId ? { ...c, columnId: 'done' as const } : c)
        } : p));
      }
    }
  };
  const removeTask = (id: string) => save({ tasks: entry.tasks.filter((t) => t.id !== id) });

  // Drag and drop from project todo cards
  const projectTodoCards = projects.flatMap(p => (p.cards || []).filter(c => c.columnId === 'todo').map(c => ({ ...c, projectTitle: p.title, projectId: p.id })));
  const [dragOver, setDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent, card: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify(card));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnTaskList = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.columnId === 'todo') {
        // Create journal task from project card
        const newTask: Task = {
          id: crypto.randomUUID(),
          task: data.title,
          outcome: '',
          system: '',
          mission: '',
          assignedTo: data.assignedTo || [],
          projectCardId: data.id,
          completed: false,
        };
        save({ tasks: [...entry.tasks, newTask] });
        // Move project card to in-progress
        const targetProject = projects.find(p => p.id === data.projectId);
        if (targetProject) {
          setProjects((prev: Project[]) => prev.map((p: Project) => p.id === data.projectId ? {
            ...p,
            cards: p.cards.map((c: any) => c.id === data.id ? { ...c, columnId: 'in-progress' } : c)
          } : p));
        }
      }
    } catch (err) {
      console.error('Drop failed:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const goToPrevDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); };
  const goToNextDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); };
  const handleDownloadMd = () => {
    try {
      const md = generateMarkdown(entry, currentDate);
      if (!md || md.trim() === "") {
        alert("No content to export. Please add some data to your journal first.");
        return;
      }
      downloadMd(md, `journal-${dateKey}.md`);
    } catch (error) {
      console.error("Error exporting markdown:", error);
      alert("Error exporting markdown file. Please try again.");
    }
  };

  return (
    <div className="fade-in space-y-5">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Journal</h2>
          <p className="text-sm text-zinc-400 mt-0.5">Record your day, track your progress</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => save({})} className="gap-1.5 text-xs h-8 border-zinc-700 text-zinc-300 hover:text-white">
            {saveStatus === "saving" ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Syncing...</> : saveStatus === "saved" ? <><CheckCircle2 className="w-3.5 h-3.5" />Saved</> : <><RefreshCw className="w-3.5 h-3.5" />Save</>}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadMd} className="gap-1.5 text-xs h-8 border-zinc-700 text-zinc-300 hover:text-white">
            <Download className="w-3.5 h-3.5" />Export .md
          </Button>
          <Button variant="ghost" size="icon" onClick={goToPrevDay}><ChevronLeft className="w-4 h-4" /></Button>
          <div className="relative">
            <Input
              type="date"
              value={dateKey}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                if (!isNaN(newDate.getTime())) setCurrentDate(newDate);
              }}
              className="w-44 h-9 text-xs bg-zinc-900 border-zinc-700 text-zinc-200 cursor-pointer"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={goToNextDay}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Project Todo Cards */}
      {projectTodoCards.length > 0 && (
        <Card className="border-dashed border-2 border-zinc-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-sm text-zinc-400">
              <FolderKanban className="w-4 h-4 text-amber-400" />
              Project Todo — drag to journal tasks
              <span className="text-xs text-zinc-500 font-normal">({projectTodoCards.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {projectTodoCards.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, card)}
                  className="shrink-0 w-64 p-3 rounded-lg bg-zinc-900 border border-zinc-700 cursor-grab active:cursor-grabbing hover:border-blue-400 transition-colors"
                >
                  <p className="text-sm text-zinc-200 font-medium truncate">{card.title || 'Untitled'}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{card.projectTitle}</p>
                  {(card.assignedTo || []).length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {(card.assignedTo || []).slice(0, 2).map((pid: string) => (
                        <span key={pid} className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">assigned</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <Card className={`glow-blue-subtle ${dragOver ? 'ring-2 ring-blue-500' : ''}`}
        onDrop={handleDropOnTaskList}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-blue-400" /></div>
              <span className="text-zinc-100">Tasks</span>
            </CardTitle>
            <Button size="sm" onClick={addTask} className="h-8 gap-1.5"><Plus className="w-3.5 h-3.5" />Add Task</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="task-table">
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th>Task</th>
                  <th>Expected Outcome</th>
                  <th>System</th>
                  <th>Mission</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {entry.tasks.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-zinc-500 text-sm py-8">No tasks yet. Click "Add Task" to start.</td></tr>
                )}
                {entry.tasks.map((t) => (
                  <tr key={t.id} className={`group ${t.completed ? "opacity-50" : ""}`}>
                    <td className="text-center">
                      <button onClick={() => updateTask(t.id, "completed", !t.completed)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${t.completed ? "bg-blue-500 border-blue-500" : "border-zinc-600 hover:border-blue-400"}`}>
                        {t.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </button>
                    </td>
                    <td><TaskField placeholder="Task description" value={t.task} onChange={(value) => updateTask(t.id, "task", value)} /></td>
                    <td><TaskField placeholder="Expected outcome" value={t.outcome} onChange={(value) => updateTask(t.id, "outcome", value)} /></td>
                    <td><TaskField placeholder="System to follow" value={t.system} onChange={(value) => updateTask(t.id, "system", value)} /></td>
                    <td><TaskField placeholder="Mission/purpose" value={t.mission} onChange={(value) => updateTask(t.id, "mission", value)} /></td>
                    <td className="text-center">
                      <button onClick={() => removeTask(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mental Reflection */}
        <Card className="glow-blue-subtle lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center"><Brain className="w-4 h-4 text-purple-400" /></div>
                <span className="text-zinc-100">Mental Reflection</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="task-table">
                <thead>
                  <tr>
                    <th className="w-[180px]"></th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-xs text-zinc-400 font-medium">I am already happy with what I have today</td>
                    <td><TaskField placeholder="What are you grateful for today?" value={entry.happyToday} onChange={(value) => save({ happyToday: value })} /></td>
                  </tr>
                  <tr>
                    <td className="text-xs text-zinc-400 font-medium">I am surprised to see that I can do</td>
                    <td><TaskField placeholder="What surprised you about yourself today?" value={entry.surprisedCanDo} onChange={(value) => save({ surprisedCanDo: value })} /></td>
                  </tr>
                  <tr>
                    <td className="text-xs text-zinc-400 font-medium">I will be happy if I make progress in this area</td>
                    <td><TaskField placeholder="What area do you want to progress in?" value={entry.happyIfProgress} onChange={(value) => save({ happyIfProgress: value })} /></td>
                  </tr>
                  <tr>
                    <td className="text-xs text-zinc-400 font-medium">I am not happy with what I have today</td>
                    <td><TaskField placeholder="What is bothering you? What needs to change?" value={entry.notHappyToday} onChange={(value) => save({ notHappyToday: value })} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Heart className="w-4 h-4 text-emerald-400" /></div>
              <span className="text-zinc-100">Physical</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={entry.physicalStatus} onValueChange={(v: string) => save({ physicalStatus: v as PhysicalStatus })} className="space-y-2.5">
              {([{ value: "good", label: "Good" }, { value: "sick", label: "Sick" }, { value: "critical", label: "Critical" }] as const).map((item) => (
                <div key={item.value} className="flex items-center gap-2.5">
                  <RadioGroupItem value={item.value} id={`physical-${item.value}`} />
                  <Label htmlFor={`physical-${item.value}`} className="cursor-pointer text-sm text-zinc-300">{item.label}</Label>
                </div>
              ))}
            </RadioGroup>
            <Separator className="my-2 bg-zinc-700/50" />
            <div>
              <Label className="text-xs text-zinc-400">Note</Label>
              <Input placeholder="Any notes about your physical state..." value={entry.physicalNote} onChange={(e) => save({ physicalNote: e.target.value })} className="mt-1.5 h-9 text-xs bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600" />
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
