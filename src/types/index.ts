export interface Task {
  id: string;
  task: string;
  outcome: string;
  system: string;
  mission: string;
  completed: boolean;
  assignedTo: string[]; // person IDs
  projectCardId?: string; // link back to KanbanCard if created from project
}

export type MentalRating = 1 | 2 | 3 | 4 | 5;

export interface MentalStatus {
  morning: MentalRating;
  afternoon: MentalRating;
  night: MentalRating;
}

export type PhysicalStatus = "good" | "sick" | "critical";

export interface DailyEntry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  tasks: Task[];
  mentalStatus: MentalStatus;
  physicalStatus: PhysicalStatus;
  physicalNote: string;
  mentalNote: string;
  journal: string;
  // Reflective questions
  bestThing: string;
  proudThings: string;
  lessonLearned: string;
  lessonChange: string;
  excitedAbout: string;
  happyToday: string;
  surprisedCanDo: string;
  happyIfProgress: string;
  notHappyToday: string;
}

export type TimeRange = "weekly" | "monthly";

// Project & Kanban types
export type KanbanColumnId = "todo" | "in-progress" | "done" | "blocked";

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  columnId: KanbanColumnId;
  priority: "low" | "medium" | "high" | "urgent";
  tags: string[];
  dueDate: string;
  createdAt: string;
  completedAt: string;
  order: number;
  assignedTo: string[]; // person IDs
  relatedMeetingId?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  completed: boolean;
  completedAt: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  type: "task" | "milestone" | "journal";
  completedAt: string;
  projectId?: string;
  projectTitle?: string;
  date: string;
  outcome?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  startDate?: string; // ISO date string YYYY-MM-DD; optional for projects created before iteration tracking
  color: string; // hex color for accent
  milestones: Milestone[];
  cards: KanbanCard[];
  history: HistoryEntry[]; // completed items moved after 24hr
  createdAt: string;
  archived: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;       // ISO date string YYYY-MM-DD
  time: string;       // HH:mm
  durationMinutes?: number;
  accent?: "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan"
    | "orange" | "lime" | "pink" | "indigo" | "teal" | "fuchsia";
  importance?: 1 | 2 | 3 | 4 | 5;
  kind?: "meeting" | "personal";
  personalCategory?: "gym" | "university" | "development" | "family" | "relationship";
  recurrenceGroupId?: string;
  reminder: boolean;
  reminderMinutes?: number;
  agenda: string;
  minutes: string;
  participants: string[]; // person IDs
  relatedProjectId?: string;
  createdAt: string;
}

export interface Person {
  id: string;
  name: string;
  relationshipStatus: string;
  wants: string;
  goal: string;
  telegramUsername: string;
  email: string;
  notes: string;
  connections: string[]; // person IDs they're connected with
  createdAt: string;
}

export const KANBAN_COLUMNS: { id: KanbanColumnId; title: string; color: string }[] = [
  { id: "todo", title: "To Do", color: "#3b82f6" },
  { id: "in-progress", title: "In Progress", color: "#f59e0b" },
  { id: "blocked", title: "Blocked", color: "#ef4444" },
  { id: "done", title: "Done", color: "#10b981" },
];

export const PROJECT_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#06b6d4", "#ef4444", "#6366f1",
];
