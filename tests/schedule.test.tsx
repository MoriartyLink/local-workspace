import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DataProvider } from "@/contexts/DataContext";
import { MeetingPage } from "@/pages/MeetingPage";

function renderSchedule() {
  return render(
    <DataProvider>
      <MeetingPage />
    </DataProvider>,
  );
}

describe("Schedule planner", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("switches between day, week, month, and year views", () => {
    renderSchedule();

    expect(screen.getByRole("heading", { name: "Schedule" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Personal (hidden|shown)/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Year" }));
    expect(screen.getByRole("button", { name: "January" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Day" }));
    expect(screen.getAllByLabelText(/^Add meeting on /)).toHaveLength(48);
  }, 10_000);

  it("creates a meeting from a free time slot", () => {
    renderSchedule();

    fireEvent.click(screen.getByText("Day"));
    fireEvent.click(screen.getAllByLabelText(/^Add meeting on /)[18]);
    expect(screen.getByRole("dialog", { name: "New meeting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set importance 2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Use blue accent" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button", { name: /^Use .* accent$/ })).toHaveLength(12);

    fireEvent.change(screen.getByPlaceholderText("Meeting title"), { target: { value: "Planning session" } });
    fireEvent.change(screen.getByPlaceholderText("Agenda"), { target: { value: "Review the weekly plan" } });
    fireEvent.click(screen.getByRole("button", { name: "Add meeting" }));

    expect(screen.getAllByText("Planning session").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText("Search meetings"), { target: { value: "missing" } });
    expect(screen.queryByText("Planning session")).not.toBeInTheDocument();
  });

  it("creates customized recurring personal time", () => {
    renderSchedule();

    fireEvent.click(screen.getByRole("button", { name: "Personal time" }));
    expect(screen.getByRole("dialog", { name: "Personal time" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gym" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByDisplayValue("Weekly")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set personal time importance 5" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Relationship time" }));
    expect(screen.getByPlaceholderText("Personal time title")).toHaveValue("Relationship time");
    expect(screen.getByRole("button", { name: "Use rose personal time accent" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button", { name: /^Use .* personal time accent$/ })).toHaveLength(12);

    fireEvent.click(screen.getByRole("button", { name: "Add personal time" }));
    const saved = JSON.parse(localStorage.getItem("local-workspace-meetings") || "[]");
    expect(saved.length).toBeGreaterThan(1);
    expect(saved.every((meeting: { kind: string }) => meeting.kind === "personal")).toBe(true);
    expect(new Set(saved.map((meeting: { recurrenceGroupId: string }) => meeting.recurrenceGroupId)).size).toBe(1);
  });
});
