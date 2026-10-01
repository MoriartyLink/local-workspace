import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DataProvider } from "@/contexts/DataContext";
import { JournalPage } from "@/pages/JournalPage";
import type { Project } from "@/types";

const project: Project = {
  id: "project-1",
  title: "Launch Plan",
  description: "",
  color: "#3b82f6",
  milestones: [],
  cards: [],
  history: [],
  createdAt: "2026-08-11T00:00:00.000Z",
  archived: false,
};

const secondProject: Project = {
  ...project,
  id: "project-2",
  title: "Website Refresh",
  cards: [],
};

describe("Journal tasks in Studio", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("local-workspace-projects", JSON.stringify([project, secondProject]));
  });

  it("adds a new journal task to a Studio project's To Do column and keeps edits linked", async () => {
    render(
      <DataProvider>
        <JournalPage />
      </DataProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));
    fireEvent.change(screen.getByPlaceholderText("Task description"), {
      target: { value: "Prepare launch brief" },
    });
    fireEvent.change(screen.getByPlaceholderText("Expected outcome"), {
      target: { value: "A brief the team can review" },
    });

    const studioSelect = await screen.findByRole("combobox", {
      name: "Add Prepare launch brief to Project",
    });
    fireEvent.change(studioSelect, { target: { value: project.id } });

    expect(await screen.findByRole("combobox", { name: "Project for Prepare launch brief" })).toHaveValue(project.id);
    await waitFor(() => {
      const savedProjects = JSON.parse(localStorage.getItem("local-workspace-projects") || "[]") as Project[];
      expect(savedProjects[0].cards).toHaveLength(1);
      expect(savedProjects[0].cards[0]).toMatchObject({
        title: "Prepare launch brief",
        description: "A brief the team can review",
        columnId: "todo",
        priority: "medium",
      });

      const savedEntries = JSON.parse(localStorage.getItem("local-workspace-entries") || "{}") as Record<string, { tasks: Array<{ projectCardId?: string }> }>;
      expect(Object.values(savedEntries)[0].tasks[0].projectCardId).toBe(savedProjects[0].cards[0].id);
    });

    fireEvent.change(screen.getByPlaceholderText("Task description"), {
      target: { value: "Prepare final launch brief" },
    });
    fireEvent.change(screen.getByPlaceholderText("Expected outcome"), {
      target: { value: "An approved launch brief" },
    });

    await waitFor(() => {
      const savedProjects = JSON.parse(localStorage.getItem("local-workspace-projects") || "[]") as Project[];
      expect(savedProjects[0].cards[0].title).toBe("Prepare final launch brief");
      expect(savedProjects[0].cards[0].description).toBe("An approved launch brief");
    });
  });

  it("moves a linked journal task to the selected Studio project", async () => {
    render(
      <DataProvider>
        <JournalPage />
      </DataProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));
    fireEvent.change(screen.getByPlaceholderText("Task description"), {
      target: { value: "Update the homepage" },
    });
    fireEvent.change(await screen.findByRole("combobox", { name: "Add Update the homepage to Project" }), {
      target: { value: project.id },
    });

    fireEvent.change(await screen.findByRole("combobox", { name: "Project for Update the homepage" }), {
      target: { value: secondProject.id },
    });

    await waitFor(() => {
      const savedProjects = JSON.parse(localStorage.getItem("local-workspace-projects") || "[]") as Project[];
      expect(savedProjects.find(candidate => candidate.id === project.id)?.cards).toHaveLength(0);
      expect(savedProjects.find(candidate => candidate.id === secondProject.id)?.cards).toMatchObject([
        { title: "Update the homepage", columnId: "todo" },
      ]);
    });
  });
});
