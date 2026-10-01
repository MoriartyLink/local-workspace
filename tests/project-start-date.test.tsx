import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DataProvider } from "@/contexts/DataContext";
import { getLocalDateKey } from "@/lib/dates";
import { ProjectPage } from "@/pages/ProjectPage";
import type { Project } from "@/types";
import fs from "node:fs";
import path from "node:path";

describe("project start date", () => {
  beforeEach(() => localStorage.clear());

  it("lets the user select and persist a start date", async () => {
    const project: Project = {
      id: "iteration-project",
      title: "Iteration Project",
      description: "",
      startDate: getLocalDateKey(new Date()),
      color: "#8b5cf6",
      milestones: [],
      cards: [],
      history: [],
      createdAt: new Date().toISOString(),
      archived: false,
    };
    localStorage.setItem("local-workspace-projects", JSON.stringify([project]));
    localStorage.setItem("project-selected", JSON.stringify(project.id));

    render(
      <DataProvider>
        <ProjectPage />
      </DataProvider>,
    );

    expect(await screen.findByText((_, element) => (
      element?.tagName === "SPAN"
      && element.textContent?.includes("Iteration 1") === true
      && element.textContent?.includes("Week 1 of 6") === true
    ))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("heading", { name: project.title }));
    const startDateInput = screen.getByLabelText("Project start date");
    fireEvent.change(startDateInput, { target: { value: "2026-01-15" } });

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem("local-workspace-projects") || "[]") as Project[];
      expect(saved[0].startDate).toBe("2026-01-15");
    });
  });

  it("keeps the start date in the Electron vault round-trip", () => {
    const electronMain = fs.readFileSync(path.resolve("electron/main.cjs"), "utf8");

    expect(electronMain).toMatch(/startDate:\s*project\.startDate\s*\|\|\s*""/);
    expect(electronMain).toMatch(/startDate:\s*meta\.startDate\s*\|\|\s*""/);
  });
});
