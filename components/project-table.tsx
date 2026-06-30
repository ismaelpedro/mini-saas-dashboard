"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_LABELS, type ProjectStatusValue } from "@/lib/validations";
import type { Project } from "@/lib/types";

const STATUS_VARIANT: Record<
  ProjectStatusValue,
  "active" | "on_hold" | "completed"
> = {
  ACTIVE: "active",
  ON_HOLD: "on_hold",
  COMPLETED: "completed",
};

function StatusBadge({ status }: { status: ProjectStatusValue }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function ProjectTable({
  projects,
  onEdit,
  onDelete,
}: {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
              <th className="px-4 py-3 font-medium">Team member</th>
              <th className="px-4 py-3 text-right font-medium">Budget</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(p.deadline)}</td>
                <td className="px-4 py-3">{p.teamMember.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(p.budget)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => onEdit(p)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => onDelete(p)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {projects.map((p) => (
          <div key={p.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.teamMember.name}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Deadline</dt>
                <dd>{formatDate(p.deadline)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Budget</dt>
                <dd className="tabular-nums">{formatCurrency(p.budget)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(p)}>
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(p)}>
                <Trash2 className="size-4 text-destructive" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
