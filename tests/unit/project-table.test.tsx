import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectTable } from "@/components/project-table";
import type { Project } from "@/lib/types";

const project: Project = {
  id: "p1",
  name: "Apollo",
  status: "ACTIVE",
  deadline: "2026-12-01T12:00:00.000Z",
  budget: "1000",
  teamMemberId: "tm1",
  teamMember: { id: "tm1", name: "Ada Lovelace", email: "ada@example.com" },
  createdAt: "",
  updatedAt: "",
};

describe("ProjectTable", () => {
  it("renders project details", () => {
    render(<ProjectTable projects={[project]} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getAllByText("Apollo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$1,000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  });

  it("invokes onEdit and onDelete with the project", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ProjectTable projects={[project]} onEdit={onEdit} onDelete={onDelete} />);

    await userEvent.click(screen.getAllByRole("button", { name: /edit apollo/i })[0]);
    await userEvent.click(screen.getAllByRole("button", { name: /delete apollo/i })[0]);

    expect(onEdit).toHaveBeenCalledWith(project);
    expect(onDelete).toHaveBeenCalledWith(project);
  });
});
