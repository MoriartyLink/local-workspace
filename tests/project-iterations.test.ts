import { describe, expect, it } from "vitest";
import { getProjectIteration } from "@/lib/projectIterations";

describe("six-week project iterations", () => {
  it("counts weeks within consecutive 42-day iterations", () => {
    expect(getProjectIteration("2026-01-01", "2026-01-01")).toEqual({
      status: "active",
      iteration: 1,
      week: 1,
      elapsedWeeks: 0,
    });
    expect(getProjectIteration("2026-01-01", "2026-02-11")).toMatchObject({
      status: "active",
      iteration: 1,
      week: 6,
    });
    expect(getProjectIteration("2026-01-01", "2026-02-12")).toMatchObject({
      status: "active",
      iteration: 2,
      week: 1,
    });
    expect(getProjectIteration("2026-01-01", "2026-02-19")).toMatchObject({
      status: "active",
      iteration: 2,
      week: 2,
    });
  });

  it("returns a countdown before the selected start date", () => {
    expect(getProjectIteration("2026-08-20", "2026-08-11")).toEqual({
      status: "upcoming",
      daysUntilStart: 9,
    });
  });
});
