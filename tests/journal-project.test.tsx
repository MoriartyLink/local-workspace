import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DataProvider } from "@/contexts/DataContext";
import { getYangonResetDateKey } from "@/lib/dates";
import { JournalPage } from "@/pages/JournalPage";
import type { DailyEntry, Project } from "@/types";

function renderJournal() {
  return render(
    <DataProvider>
      <JournalPage />
    </DataProvider>,
  );
}

describe("Journal project linking", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds a manually created journal task to an active project", async () => {
    const date = getYangonResetDateKey();
    const entry: DailyEntry = {
      id: "entry-1",
      date,
      tasks: [{
        id: "wild-task",
        task: "Prepare launch notes",
        outcome: "The launch team is aligned",
        system: "",
        mission: "",
        completed: false,
        assignedTo: ["person-1"],
      }],
      mentalStatus: { morning: 2, afternoon: 2, night: 2 },
      physicalStatus: "good",
      physicalNote: "",
      mentalNote: "",
      journal: "",
      bestThing: "",
      proudThings: "",
      lessonLearned: "",
      lessonChange: "",
      excitedAbout: "",
      happyToday: "",
      surprisedCanDo: "",
      happyIfProgress: "",
      notHappyToday: "",
    };
    const project: Project = {
      id: "project-1",
      title: "Product launch",
      description: "",
      color: "#3b82f6",
      milestones: [],
      cards: [],
      history: [],
      createdAt: new Date().toISOString(),
      archived: false,
    };
    localStorage.setItem("local-workspace-entries", JSON.stringify({ [date]: entry }));
    localStorage.setItem("local-workspace-projects", JSON.stringify([project]));

    renderJournal();

    const projectSelect = await screen.findByRole("combobox", { name: "Add Prepare launch notes to project" });
    fireEvent.change(projectSelect, { target: { value: project.id } });

    await waitFor(() => {
      const savedProjects = JSON.parse(localStorage.getItem("local-workspace-projects") || "[]") as Project[];
      expect(savedProjects[0].cards).toHaveLength(1);
      expect(savedProjects[0].cards[0]).toMatchObject({
        title: "Prepare launch notes",
        description: "The launch team is aligned",
        columnId: "in-progress",
        dueDate: date,
        assignedTo: ["person-1"],
      });

      const savedEntries = JSON.parse(localStorage.getItem("local-workspace-entries") || "{}") as Record<string, DailyEntry>;
      expect(savedEntries[date].tasks[0].projectCardId).toBe(savedProjects[0].cards[0].id);
    });

    expect(screen.getByText("Product launch")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Add Prepare launch notes to project" })).not.toBeInTheDocument();
  });
});
